#!/usr/bin/env python3
"""
Rook & Ruin audio engine: score -> MIDI -> FluidSynth + FluidR3_GM (MIT) -> stems
-> numpy mix with console-style echo -> WAV / OGG.

Loops are made seamless by rendering one pass plus a long silent tail, folding the
tail (note releases) back onto the start, and doing all echo/EQ with circular FFT
processing over exactly one loop length, so echoes wrap across the loop point.
"""
import os, random, struct, subprocess, wave
from collections import defaultdict
import numpy as np

SR = 48000
SF2 = os.environ.get('RR_SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
TICKS_PER_SEC = 960            # MIDI written as 120 BPM, 480 PPQ
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


# ------------------------------------------------------------------ notation
def n(name):
    """'C#5' / 'Bb3' -> MIDI number (C4 = 60)."""
    pc, rest = NOTE[name[0]], name[1:]
    while rest[0] in '#b':
        pc += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return pc + 12 * (int(rest) + 1)


def line(text, beats=4):
    """'A4:1.5 r:0.5 D5:2' -> [(offset, dur, midi)]; checks the bar adds up."""
    out, t = [], 0.0
    for tok in text.split():
        name, dur = tok.split(':')
        dur = float(dur)
        if name != 'r':
            out.append((t, dur, n(name)))
        t += dur
    assert abs(t - beats) < 1e-9, f'bar is {t} beats, expected {beats}: {text}'
    return out


def chord(name):
    """'Am' 'Bb' 'Gsus' 'F#m' -> (pitch class, third interval). sus = 5."""
    pc, rest = NOTE[name[0]], name[1:]
    while rest[:1] in ('#', 'b') and rest[:1]:
        pc += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return pc % 12, {'': 4, 'm': 3, 'sus': 5}[rest]


def root_at(name, lo):
    """Lowest MIDI note >= lo that is the root of the chord."""
    pc, _ = chord(name)
    return lo + (pc - lo) % 12


def triad(name, lo=55):
    """Close-position triad folded into the octave starting at lo."""
    pc, third = chord(name)
    return sorted(lo + (pc + iv - lo) % 12 for iv in (0, third, 7))


class Song:
    def __init__(self, bpm, bpb, prog, seed=1):
        self.bpm, self.bpb = bpm, bpb
        self.prog = [b if isinstance(b, list) else [b] for b in prog]
        self.bars = len(self.prog)
        self.beats = self.bars * bpb
        self.P = defaultdict(list)
        self.rng = random.Random(seed)
        self.bar_bpm = None            # optional: one tempo per bar (for pieces that speed up)

    def sec(self, beat):
        """Beat position -> seconds, following bar_bpm if set."""
        if not self.bar_bpm:
            return beat * 60.0 / self.bpm
        t, bar = 0.0, 0
        while bar < len(self.bar_bpm) - 1 and beat >= (bar + 1) * self.bpb:
            t += self.bpb * 60.0 / self.bar_bpm[bar]
            bar += 1
        return t + (beat - bar * self.bpb) * 60.0 / self.bar_bpm[bar]

    def hv(self, v, spread=4):
        return max(1, min(115, int(v) + self.rng.randint(-spread, spread)))

    def add(self, part, t, dur, pitch, vel, human=4):
        self.P[part].append((t, dur, pitch, self.hv(vel, human) if human else int(vel)))

    def melody(self, part, bar, text, vel, shift=0, gate=0.95, accent=5):
        for off, dur, pitch in line(text, self.bpb):
            self.add(part, bar * self.bpb + off, dur * gate, pitch + shift,
                     vel + (accent if off % 2 == 0 else 0))

    def chords(self, bar):
        """[(chord name, start beat, length in beats)] for a bar."""
        span = self.bpb / len(self.prog[bar])
        return [(c, bar * self.bpb + i * span, span) for i, c in enumerate(self.prog[bar])]

    def drums(self, bar, patterns, step=0.25, vel=None, scale=1.0):
        """patterns: {drum key: 'x...o...-...'}  x strong, o medium, - soft."""
        vel = vel or {'x': 96, 'o': 76, '-': 52}
        for key, pat in patterns.items():
            for i, ch in enumerate(pat):
                if ch in vel:
                    self.add('drums', bar * self.bpb + i * step, step * 0.8, key, vel[ch] * scale, 3)


# ---------------------------------------------------------------------- MIDI
def _vlq(v):
    out = [v & 0x7F]
    while v > 0x7F:
        v >>= 7
        out.append((v & 0x7F) | 0x80)
    return bytes(reversed(out))


def _track(events):
    events.sort(key=lambda e: (e[0], e[1][0] & 0xF0 != 0x80))
    data, last = b'', 0
    for tick, msg in events:
        data += _vlq(tick - last) + msg
        last = tick
    return b'MTrk' + struct.pack('>I', len(data) + 4) + data + b'\x00\xff\x2f\x00'


def write_midi(path, tracks, us_per_beat=500000, ppq=480):
    tempo = _track([(0, b'\xff\x51\x03' + us_per_beat.to_bytes(3, 'big'))])
    with open(path, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks) + 1, ppq) + tempo)
        for t in tracks:
            f.write(_track(t))


def note_events(notes, channel, program, sec_per_beat, ticks_per_sec=TICKS_PER_SEC, cc=None, end_sec=None, tmap=None):
    tmap = tmap or (lambda beat: beat * sec_per_beat)
    ev = []
    if program is not None:
        ev.append((0, bytes([0xC0 | channel, program])))
    for num, val in (cc or {}).items():
        ev.append((0, bytes([0xB0 | channel, num, val])))
    for start, dur, pitch, vel in notes:
        on = int(round(tmap(start) * ticks_per_sec))
        off = max(on + 1, int(round(tmap(start + dur) * ticks_per_sec)))
        ev.append((on, bytes([0x90 | channel, pitch, max(1, min(127, int(vel)))])))
        ev.append((off, bytes([0x80 | channel, pitch, 0])))
    if end_sec:    # silent controller keeps the renderer running for release tails
        ev.append((int(end_sec * ticks_per_sec), bytes([0xB0 | channel, 0x77, 0])))
    return ev


# ----------------------------------------------------------------- audio I/O
def decode(path, channels=2):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', str(channels),
                          '-ar', str(SR), '-'], check=True, capture_output=True).stdout
    x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
    return x.reshape(-1, channels) if channels > 1 else x


def write_wav16(path, x):
    rng = np.random.default_rng(1)
    d = (rng.random(x.shape) - rng.random(x.shape)) / 32768.0
    pcm = np.clip(np.round((x + d) * 32767.0), -32768, 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1 if x.ndim == 1 else x.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def encode(wav, dst, title, codec='libvorbis', q='6',
           comment='Rook & Ruin. Original audio. Instruments: FluidR3_GM SoundFont (c) Frank Wen, MIT license.'):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', codec, '-q:a', q,
                    '-metadata', f'title={title}', '-metadata', f'comment={comment}', dst], check=True)


def fluid(mid, wav):
    subprocess.run(['fluidsynth', '-ni', '-q', '-F', wav, '-r', str(SR), '-O', 'float',
                    '-R', '0', '-C', '0', '-g', '0.5', SF2, mid], check=True, capture_output=True)
    x = decode(wav)
    os.remove(wav); os.remove(mid)
    return x


# ----------------------------------------------------------------------- DSP
def circ_filter(x, gain_of_freq):
    X = np.fft.rfft(x, axis=0)
    g = gain_of_freq(np.fft.rfftfreq(x.shape[0], 1.0 / SR))
    return np.fft.irfft(X * (g[:, None] if x.ndim > 1 else g), n=x.shape[0], axis=0)


def gauss_lp(fc):
    """Gaussian low-pass, -3 dB at fc: the soft top end of 16-bit console playback."""
    return lambda f: np.exp(-0.5 * np.log(2) * (f / fc) ** 2)


def highpass(fc, order=2):
    return lambda f: 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, 1e-9)) ** (2 * order))


def console_echo(x, delay_samples, feedback, lp_hz=2800):
    """Feedback delay with a low-pass in the loop, solved circularly."""
    f = np.fft.rfftfreq(x.shape[0], 1.0 / SR)
    z = np.exp(-2j * np.pi * f * delay_samples / SR) * gauss_lp(lp_hz)(f)
    H = z / (1.0 - feedback * z)
    return np.fft.irfft(np.fft.rfft(x, axis=0) * (H[:, None] if x.ndim > 1 else H), n=x.shape[0], axis=0)


def k_weight(x):
    f = np.fft.rfftfreq(x.shape[0], 1.0 / SR)
    z = np.exp(-2j * np.pi * f / SR)
    bq = lambda b, a: np.abs((b[0] + b[1] * z + b[2] * z * z) / (1 + a[0] * z + a[1] * z * z))
    k = bq([1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, 0.73248077421585]) * \
        bq([1.0, -2.0, 1.0], [-1.99004745483398, 0.99007225036621])
    return np.fft.irfft(np.fft.rfft(x, axis=0) * (k[:, None] if x.ndim > 1 else k), n=x.shape[0], axis=0)


def lufs(x):
    """ITU-R BS.1770 integrated loudness with gating."""
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    p = np.array([(y[i:i + blk] ** 2).mean(axis=0).sum() for i in range(0, max(1, len(y) - blk), hop)])
    l = -0.691 + 10 * np.log10(np.maximum(p, 1e-12))
    p = p[l > -70]
    rel = -0.691 + 10 * np.log10(p.mean()) - 10
    p = p[(-0.691 + 10 * np.log10(p)) > rel]
    return -0.691 + 10 * np.log10(p.mean())


# ------------------------------------------------------------------- render
def render_song(song, name, title, gm, mix, out_dir, vib=None, loop=True, echo_beats=0.5,
                feedback=0.38, target_lufs=-18.0, peak_db=-1.5, max_seconds=None, fade_seconds=1.0):
    """gm: {part: GM program}; mix: {part: (level dB RMS, pan, echo send, low-pass Hz)}."""
    os.makedirs(out_dir, exist_ok=True)
    spb = 60.0 / song.bpm
    L = int(round(song.sec(song.beats) * SR))
    tail = int((10.0 if loop else 4.0) * SR)
    parts = [p for p in mix if song.P.get(p)]
    chan = {p: (9 if p == 'drums' else (i if i < 9 else i + 1)) for i, p in enumerate(parts)}
    vib = vib or {}

    # editable MIDI at the real tempo
    write_midi(os.path.join(out_dir, name + '.mid'),
               [note_events(song.P[p], chan[p], gm.get(p), 1.0, 480, {1: vib[p]} if p in vib else None,
                            tmap=(lambda b: song.sec(b) * song.bpm / 60.0) if song.bar_bpm else None)
                for p in parts], us_per_beat=int(round(60e6 / song.bpm)))

    N = L if loop else L + tail
    dry = np.zeros((N, 2)); send_bus = np.zeros((N, 2))
    for p in parts:
        tmp = os.path.join(out_dir, f'_{name}_{p}')
        write_midi(tmp + '.mid', [note_events(song.P[p], chan[p], gm.get(p), spb,
                                              cc={1: vib[p]} if p in vib else None,
                                              end_sec=(L + tail) / SR + 0.5, tmap=song.sec)])
        x = fluid(tmp + '.mid', tmp + '.wav')
        assert len(x) >= L + tail, f'{name}/{p}: render too short'
        if loop:
            s = x[:L].copy(); s[:tail] += x[L:L + tail]
            assert np.abs(x[L + tail - 4800:L + tail]).max() < 1e-4 * np.abs(s).max(), f'{p}: tail not decayed'
        else:
            s = x[:N].copy()
        level, pan, send, lp = mix[p]
        s = circ_filter(s, gauss_lp(lp))
        active = np.abs(s).max(axis=1) > 1e-3 * np.abs(s).max()
        s *= 10 ** (level / 20) / np.sqrt((s[active] ** 2).mean())
        s[:, 0] *= min(1.0, 1.0 - pan); s[:, 1] *= min(1.0, 1.0 + pan)
        dry += s; send_bus += s * send

    out = dry + console_echo(send_bus, int(round(echo_beats * spb * SR)), feedback)
    out = circ_filter(out, lambda f: highpass(32)(f) * gauss_lp(8000)(f))
    if not loop:
        end = min(len(out), int(max_seconds * SR)) if max_seconds else len(out)
        out = out[:end]
        fl = int(fade_seconds * SR)
        out[-fl:] *= (np.cos(np.linspace(0, np.pi / 2, fl)) ** 2)[:, None]
    gain = 10 ** ((target_lufs - lufs(out)) / 20)
    gain = min(gain, 10 ** (peak_db / 20) / np.abs(out).max())
    out *= gain

    wav = os.path.join(out_dir, name + '.wav')
    write_wav16(wav, out)
    encode(wav, os.path.join(out_dir, name + '.ogg'), title)
    print(f'{name:22s} {len(out) / SR:7.3f} s  {song.bpm} BPM  {song.bars} bars  '
          f'{lufs(out):6.1f} LUFS  peak {20 * np.log10(np.abs(out).max()):5.1f} dBFS  parts: {", ".join(parts)}')
    return out
