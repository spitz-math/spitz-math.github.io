#!/usr/bin/env python3
"""
The Iron Warden's two voice moments (standalone, mono, 48 kHz). Version 3.

  extras/warden_spawn_laugh.*  2.0 s  "mwa-ha-ha-ha-haaa": confident, slow, menacing
  extras/warden_death.*        2.5 s  laughing "ha-ha-ha—" chokes, a gasp, then a long
                                      falling groan as his armour gives way

Why version 3 sounds less silly than versions 1-2 (in theory; needs ears):
  * real glottal pulses with per-cycle jitter and shimmer, instead of a perfect
    sawtooth: perfectly regular buzz is what makes synthetic voices sound robotic
  * every "ha" starts as breath (an actual H) and stays breathy, the way a
    menacing chuckle does, instead of a clean sung vowel
  * a bigger, darker vocal tract (formants about 18% lower than an average man)
  * uneven timing: the beats push slightly forward, like a real laugh
  * the octave-down "monster" double is now subtle; it was part of the silliness
  * the helmet ring is kept small; too much of it sounds like a robot

Version 5: softer onsets (quiet, dark H; no pitch flick; darker 'ah'; 45 ms attack).
Version 4 (anti-click): smooth vocal-fold pulses, pitch kept above ~70 Hz, less rasp,
less helmet ring and saturation.

Formant synthesis only, no samples. Does NOT replace sfx/warden_roar or sfx/boss_defeated.
    python3 make_warden_laugh.py
"""
import os
import numpy as np
import rr_engine as E
import make_sfx as M
from rr_engine import SR

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'extras')
LEVEL_DB = -26.0
rng = np.random.default_rng(5)
SCALE = 0.82                                    # vocal tract size: < 1 = bigger, darker
VOWEL = {   # (centre Hz, half-width Hz, gain)
    'ah': [(700, 90, 1.0), (1100, 100, 0.65), (2450, 150, 0.10), (3300, 200, 0.03)],
    'uh': [(600, 90, 1.0), (1000, 100, 0.60), (2400, 150, 0.20)],
    'oh': [(480, 80, 1.0), (820, 90, 0.55), (2400, 150, 0.12)],
    'oo': [(330, 70, 1.0), (750, 90, 0.30)],
    'm':  [(260, 70, 1.0), (1000, 200, 0.08)],
}


# The uploaded recording (metadata: "Adapted from Evil Laugh by AntumDeluge, CC0,
# https://opengameart.org/content/evil-laugh" -- licence still to be confirmed on that page).
REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'extras', 'reference_upload',
                   'armored_knight_laugh_2s_mono.wav')
REF_CUTS = [0.0, 0.27, 0.505, 0.79, 1.035, 1.68]          # syllable boundaries found in the recording


def ref_pieces(semitones=-7):
    """The recording cut into its syllables (the last piece = its final two), each pitched down.
    Pitching down by resampling also lengthens it and lowers the throat: bigger, darker."""
    x = E.decode(REF, 1)
    r = 2 ** (semitones / 12)
    out = []
    for a, b in zip(REF_CUTS[:-1], REF_CUTS[1:]):
        seg = x[int(a * SR):int(b * SR)]
        y = np.interp(np.arange(0, len(seg) - 1, r), np.arange(len(seg)), seg)
        f = int(0.012 * SR)
        y[:f] *= np.linspace(0, 1, f) ** 2
        out.append(y)
    return out


def fit_to(y, sec, fade=0.05):
    y = y[:int(sec * SR)].copy()
    f = min(len(y) // 3, int(fade * SR))
    y[-f:] *= np.cos(np.linspace(0, np.pi / 2, f)) ** 2
    return y


def tract(x, vowel):
    gain = lambda f: 0.02 + sum(a / (1.0 + ((f - c * SCALE) / (w * SCALE)) ** 2) for c, w, a in VOWEL[vowel])
    return E.circ_filter(np.concatenate([x, np.zeros(SR // 4)]), gain)[:len(x)]


def glottal(f, jitter=0.010, shimmer=0.06, rasp=0.15):
    """Pulse train built one vocal-fold cycle at a time (Rosenberg pulse, radiated)."""
    N = len(f)
    out = np.zeros(N + 4000)
    i = k = 0
    while i < N:
        P = int(max(20, SR / f[i] * (1 + jitter * rng.standard_normal())))
        # Smooth pulse: raised-cosine opening AND closing, so the folds never snap shut.
        # (v3 closed with a quarter-cosine, a sharp corner every cycle = clicks.)
        Tp, Tn = int(0.50 * P), int(0.38 * P)
        g = np.zeros(P)
        g[:Tp] = 0.5 * (1 - np.cos(np.pi * np.arange(Tp) / Tp))
        g[Tp:Tp + Tn] = 0.5 * (1 + np.cos(np.pi * np.arange(Tn) / Tn))
        a = 1 + shimmer * rng.standard_normal()
        if k % 2:
            a *= 1 - rasp * rng.random()                        # uneven cycles = gravel
        out[i:i + P] += a * g
        i += P
        k += 1
    d = np.diff(out[:N], prepend=0.0)
    return E.circ_filter(np.concatenate([d, np.zeros(SR // 4)]), E.gauss_lp(2800))[:N]   # natural tilt


def voice(f, vowels, env, breath=0.25, h=0.05, rasp=0.15, jitter=0.010, voiced=None, double=0.20):
    """f: pitch curve; vowels: 'ah' or [(time fraction, vowel), ...]; env: loudness curve.
    h: length of the breathy H at the start; voiced: optional voicing curve (1 = full voice)."""
    t = M.T(len(f) / SR)
    src = glottal(f, jitter, rasp=rasp)
    src += double * glottal(f / 2, jitter, rasp=rasp) * 0.7                  # subtle octave-down
    src /= np.sqrt((src ** 2).mean())
    noise = E.circ_filter(np.concatenate([rng.standard_normal(len(f)), np.zeros(SR // 4)]), E.gauss_lp(1400))[:len(f)]
    noise /= np.sqrt((noise ** 2).mean())                                   # dark breath, no hiss
    hb = np.clip(1 - t / h, 0, 1) if h else 0 * t
    v = np.clip((t - 0.6 * h) / 0.03, 0, 1) if h else np.ones(len(t))
    if voiced is not None:
        v = v * voiced
    ex = src * v + noise * (breath + 0.35 * hb + 0.9 * (1 - v) * (t > h))
    if isinstance(vowels, str):
        y = tract(ex, vowels)
    else:                                                                    # glide between vowels
        frac = t / t[-1]
        ys = [tract(ex, vw) for _, vw in vowels]
        xs = [p for p, _ in vowels]
        y = 0
        for j in range(len(vowels)):
            w = np.interp(frac, xs, [1.0 if i == j else 0.0 for i in range(len(vowels))])
            y = y + w * ys[j]
    return y * env


def ha(f0, dur, gain_db=0.0, fall=0.12, vowel='ah', **kw):
    t = M.T(dur)
    f = f0 * np.exp(np.interp(t / dur, [0, 0.2, 1], np.log([1.0, 1.0, 1 - fall])))
    env = (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.045, 1))) * np.maximum(0, 1 - t / dur) ** 0.9
    return voice(f, vowel, env, **kw), gain_db


def thump(at_db, f0=80):
    d = 0.35
    x = M.note(f0, d, 'sine', 0.006, 0.09, f_end=f0 / 2) + 0.5 * M.note(f0 * 2.5, d, 'tri', 0.006, 0.05, f_end=f0 * 1.2)
    return x, at_db


def helmet(x, amount=0.12):
    out = np.zeros(len(x))
    for delay_ms, fb in ((1.15, 0.5), (2.05, 0.4)):
        d, y = int(delay_ms * SR / 1000), x.copy()
        for i in range(d, len(y)):
            y[i] += fb * y[i - d]
        out += y / np.abs(y).max()
    return (1 - amount) * x / np.abs(x).max() + amount * out / 2


def stone_hall(x, tail_db=-14):
    y = x.copy()
    for ms, g_db in ((41, -11), (79, -14), (127, -17)):
        d = int(ms * SR / 1000)
        y[d:] += x[:-d] * 10 ** (g_db / 20)
    m = int(0.5 * SR)
    ir = rng.standard_normal(m) * 10 ** (-3 * np.arange(m) / SR / 0.40)
    ir[:int(0.03 * SR)] = 0
    ir = E.circ_filter(np.concatenate([ir, np.zeros(SR // 4)]), lambda f: E.highpass(200)(f) * E.gauss_lp(2000)(f))[:m]
    return y + np.convolve(x, ir / np.sqrt((ir ** 2).sum()))[:len(x)] * 10 ** (tail_db / 20)


def master(layers, length, name, helmet_amt=0.12, tail_db=-14, growl=0.0):
    """layers: [(audio, start s, gain dB)] -> saved WAV + OGG, with measurements."""
    y = np.zeros(int(length * SR))
    lead = int(0.003 * SR)
    for x, at, g in layers:
        x = x / np.abs(x).max() * 10 ** (g / 20)
        i = lead + int(at * SR)
        m = min(len(x), len(y) - i)
        y[i:i + m] += x[:m]
    if growl:                                     # smooth, irregular 25-32 Hz flutter: rough but no clicks
        t = M.T(len(y) / SR)
        k = max(2, int(len(y) / SR * 8))
        rate = 28 + 4 * np.interp(t, np.linspace(0, t[-1], k), rng.standard_normal(k))
        y = y * (1 - growl * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / SR)))
    y = np.tanh(1.15 * y / np.abs(y).max())                                  # very light grit
    y = stone_hall(helmet(y, helmet_amt), tail_db)
    y = E.circ_filter(np.concatenate([y, np.zeros(SR // 4)]), lambda f: E.highpass(70)(f) * E.gauss_lp(3800)(f))[:len(y)]
    fi, fo = int(0.002 * SR), int(0.12 * SR)
    y[:fi] *= np.linspace(0, 1, fi) ** 2
    y[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    y *= 10 ** ((LEVEL_DB - M.loudest_window_db(y)) / 20)
    wav = os.path.join(OUT, name + '.wav')
    E.write_wav16(wav, y)
    E.encode(wav, wav[:-4] + '.ogg', 'Rook & Ruin SFX - ' + name, q='5',
             comment='Rook & Ruin. Original audio. Synthesised sound effect.')
    db = lambda v: 20 * np.log10(max(v, 1e-12))
    X = np.abs(np.fft.rfft(y)) ** 2
    f = np.fft.rfftfreq(len(y), 1 / SR)
    share = lambda lo, hi: 10 * np.log10(X[(f >= lo) & (f < hi)].sum() / X.sum())
    print(f'{name}: {len(y) / SR:.3f} s mono, level {M.loudest_window_db(y):.1f} dB, peak {db(np.abs(y).max()):.1f} dBFS, '
          f'first/last 1 ms {db(np.abs(y[:48]).max()):.0f} / {db(np.abs(y[-48:]).max()):.0f} dBFS')
    print(f'   energy <150 Hz {share(0, 150):.1f} dB, 150-400 {share(150, 400):.1f}, 400-2000 {share(400, 2000):.1f}, '
          f'2-6 kHz {share(2000, 6000):.1f}, >6 kHz {share(6000, 24000):.1f}; centroid {(f * X).sum() / X.sum():.0f} Hz')
    blocks = [db(np.sqrt((y[int(a * SR):int((a + 0.1) * SR)] ** 2).mean())) for a in np.arange(0, length - 0.01, 0.1)]
    print('   level per 100 ms:', ' '.join(f'{b:.0f}' for b in blocks))


def spawn():
    """Slow, sure of himself: a closed-mouth 'mwa', three pushing 'ha's, one long falling 'haaa'."""
    d = 0.30
    t = M.T(d)
    mwa = voice(np.exp(np.interp(t / d, [0, 1], np.log([78, 94]))), [(0, 'm'), (0.45, 'm'), (0.75, 'ah'), (1, 'ah')],
                (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.06, 1))) * np.maximum(0, 1 - t / d) ** 0.5, h=0, breath=0.15)
    d = 0.86
    t = M.T(d)
    last_f = np.exp(np.interp(t / d, [0, 0.12, 0.35, 1], np.log([98, 98, 92, 72])))
    last_env = (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.045, 1))) * np.maximum(0, 1 - t / d) ** 0.7
    last = voice(last_f, [(0, 'ah'), (0.4, 'ah'), (1, 'oh')], last_env, breath=0.3, rasp=0.2,
                 voiced=np.clip(1.25 - t / d, 0, 1))                    # the end trails off into breath
    beats = [ha(96, 0.20), ha(93, 0.19), ha(90, 0.19)]
    master([(mwa, 0.00, -4), (beats[0][0], 0.38, -3), (beats[1][0], 0.62, -2), (beats[2][0], 0.84, -1.5),
            (last, 1.07, 0)], 2.0, 'warden_spawn_laugh')


def death():
    """Still laughing, then it catches in his throat, a gasp, and a long falling groan; armour lands."""
    h1, h2 = ha(95, 0.19), ha(98, 0.17)
    d = 0.24                                                            # the laugh that cracks
    t = M.T(d)
    crack_f = np.exp(np.interp(t / d, [0, 0.45, 0.6, 1], np.log([98, 100, 150, 140])))
    crack = voice(crack_f, 'ah', (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.04, 1))) * np.maximum(0, 1 - t / d) ** 0.6,
                  rasp=0.35, jitter=0.03, breath=0.35)
    d = 0.12                                                            # sharp intake of breath
    t = M.T(d)
    gasp = tract(rng.standard_normal(len(t)), 'uh') * np.sin(np.pi * t / d) ** 2
    d = 1.45                                                            # the groan
    t = M.T(d)
    groan_f = np.exp(np.interp(t / d, [0, 0.15, 1], np.log([118, 108, 68])))
    groan_env = (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.06, 1))) * np.maximum(0, 1 - t / d) ** 0.8
    groan = voice(groan_f, [(0, 'ah'), (0.35, 'oh'), (1, 'oo')], groan_env, h=0.03, breath=0.3,
                  rasp=0.2, jitter=0.015, voiced=np.clip(1.4 - 1.4 * t / d, 0, 1))
    master([(h1[0], 0.00, -3), (h2[0], 0.22, -2.5), (crack, 0.42, -1), (gasp, 0.70, -16), (groan, 0.84, 0),
            (thump(0, 82)[0], 1.25, -4), (thump(0, 70)[0], 1.52, -8), (thump(0, 64)[0], 1.70, -13)], 2.5, 'warden_death')


# ------------------------------------------------------------------ variants
# Four directions for the spawn laugh, to pick from. Each is the version-5 voice
# with one or two things pushed further.
def spawn_variant(name, pitch=1.0, tempo=1.0, double=0.20, growl=0.0, helmet_amt=0.12, tail_db=-14,
                  chuckle=False, length=2.0, rec_db=None):
    global SCALE
    old = SCALE
    SCALE = 0.82 / (1 + 0.25 * (1 - pitch))                       # lower voice = bigger throat too
    P = lambda hz: hz * pitch
    at = lambda sec: sec * tempo
    layers = []
    if chuckle:                                                   # low closed-mouth "hm-hm-hm" first
        for i, (f0, g) in enumerate(((88, -9), (86, -8), (84, -7))):
            d = 0.13
            t = M.T(d)
            hm = voice(np.full(len(t), P(f0)), 'm', (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.03, 1))) * np.maximum(0, 1 - t / d) ** 0.8,
                       h=0, breath=0.12, double=double)
            layers.append((hm, at(i * 0.19), g))
        off = at(0.62) - at(0.38)                                # first 'ha' follows the chuckles straight away
    else:
        d = 0.30 * tempo
        t = M.T(d)
        mwa = voice(np.exp(np.interp(t / d, [0, 1], np.log([P(78), P(94)]))), [(0, 'm'), (0.45, 'm'), (0.75, 'ah'), (1, 'ah')],
                    (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.06, 1))) * np.maximum(0, 1 - t / d) ** 0.5, h=0, breath=0.15,
                    double=double)
        layers.append((mwa, 0.0, -4))
        off = 0.0
    for i, (f0, start, g) in enumerate(((96, 0.38, -3), (93, 0.62, -2), (90, 0.84, -1.5))):
        layers.append((ha(P(f0), 0.20 * tempo, double=double)[0], off + at(start), g))
    d = min(0.86 * tempo, length - off - at(1.07) - 0.05)
    t = M.T(d)
    last_f = np.exp(np.interp(t / d, [0, 0.12, 0.35, 1], np.log([P(98), P(98), P(92), P(72)])))
    last_env = (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.045, 1))) * np.maximum(0, 1 - t / d) ** 0.7
    last = voice(last_f, [(0, 'ah'), (0.4, 'ah'), (1, 'oh')], last_env, breath=0.3, rasp=0.2,
                 voiced=np.clip(1.25 - t / d, 0, 1), double=double)
    layers.append((last, off + at(1.07), 0))
    if rec_db is not None:                            # a recorded syllable under each synthetic beat
        rp = ref_pieces()
        if not chuckle:
            layers.append((fit_to(rp[0], 0.30 * tempo), 0.0, rec_db - 3))
        for i, start in enumerate((0.38, 0.62, 0.84)):
            layers.append((fit_to(rp[i + 1], 0.24 * tempo), off + at(start), rec_db))
        layers.append((fit_to(rp[4], d, 0.25), off + at(1.07), rec_db))
    master(layers, length, name, helmet_amt, tail_db, growl)
    SCALE = old


def death_variant(name, pitch=0.84, tempo=1.18, double=0.30, rec_db=None, length=2.8):
    """The death, in a spawn variant's voice: laughing, it chokes, a gasp, a long falling groan, armour lands."""
    global SCALE
    old = SCALE
    SCALE = 0.82 / (1 + 0.25 * (1 - pitch))
    P = lambda hz: hz * pitch
    at = lambda sec: sec * tempo
    h1, h2 = ha(P(95), 0.19 * tempo, double=double)[0], ha(P(98), 0.17 * tempo, double=double)[0]
    d = 0.24 * tempo
    t = M.T(d)
    crack = voice(np.exp(np.interp(t / d, [0, 0.45, 0.6, 1], np.log([P(98), P(100), P(150), P(140)]))), 'ah',
                  (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.04, 1))) * np.maximum(0, 1 - t / d) ** 0.6,
                  rasp=0.35, jitter=0.03, breath=0.35, double=double)
    d = 0.12
    t = M.T(d)
    gasp = tract(rng.standard_normal(len(t)), 'uh') * np.sin(np.pi * t / d) ** 2
    d = 1.45 * tempo
    t = M.T(d)
    groan = voice(np.exp(np.interp(t / d, [0, 0.15, 1], np.log([P(118), P(108), max(P(68), 62)]))),
                  [(0, 'ah'), (0.35, 'oh'), (1, 'oo')],
                  (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.06, 1))) * np.maximum(0, 1 - t / d) ** 0.8,
                  h=0.03, breath=0.3, rasp=0.2, jitter=0.015, voiced=np.clip(1.4 - 1.4 * t / d, 0, 1), double=double)
    layers = [(h1, 0.0, -3), (h2, at(0.22), -2.5), (crack, at(0.42), -1), (gasp, at(0.70), -16), (groan, at(0.84), 0),
              (thump(0, 82)[0], at(1.25), -4), (thump(0, 70)[0], at(1.52), -8), (thump(0, 64)[0], at(1.70), -13)]
    if rec_db is not None:                            # recorded laughs under the two "ha"s and the crack
        rp = ref_pieces()
        for i, start in enumerate((0.0, 0.22, 0.42)):
            layers.append((fit_to(rp[i + 1], (0.20 if i < 2 else 0.24) * tempo), at(start), rec_db))
    master(layers, length, name)
    SCALE = old


def recorded_mix():
    """Version A with a little of the uploaded recording blended in (-8), a stronger blend (-4), and the death to match."""
    spawn_variant('warden_spawn_A_plus_recording', pitch=0.84, tempo=1.18, double=0.30, length=2.3, rec_db=-8)
    spawn_variant('warden_spawn_A_plus_recording_more', pitch=0.84, tempo=1.18, double=0.30, length=2.3, rec_db=-4)
    death_variant('warden_death_A_plus_recording', rec_db=-8)


def variants():
    spawn_variant('warden_spawn_A_deeper_slower', pitch=0.84, tempo=1.18, double=0.30, length=2.3)
    spawn_variant('warden_spawn_B_gravel', growl=0.45, double=0.25)
    spawn_variant('warden_spawn_C_big_iron_hall', helmet_amt=0.35, tail_db=-8, double=0.30)
    spawn_variant('warden_spawn_D_chuckle_build', chuckle=True, pitch=0.92, length=2.5)


if __name__ == '__main__':
    import sys
    os.makedirs(OUT, exist_ok=True)
    if 'variants' in sys.argv:
        variants()
    elif 'recording' in sys.argv:
        recorded_mix()
    elif 'final' in sys.argv:
        # Final pair, clean (no recording): the spawn is version A exactly as approved,
        # the death is the same voice and settings.
        import shutil
        for ext in ('wav', 'ogg'):
            shutil.copyfile(os.path.join(OUT, 'warden_spawn_A_deeper_slower.' + ext), os.path.join(OUT, 'warden_spawn_final.' + ext))
        death_variant('warden_death_final', pitch=0.84, tempo=1.18, double=0.30)
    else:
        spawn()
        death()
