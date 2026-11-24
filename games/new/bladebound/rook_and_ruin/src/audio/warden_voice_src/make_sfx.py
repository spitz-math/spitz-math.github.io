#!/usr/bin/env python3
"""
Rook & Ruin sound effects, version 2: soft synth.

Every effect is plain synthesis written in this file: soft sine / triangle / pad
tones, one idea per sound, gentle attack, short clean release. No samples, no
SoundFont, no noise bursts, no reverb. The Iron Warden's laugh and the goblin's
"nyeh" use a small formant (vowel) synthesiser.

Pitched sounds use notes of D minor (D E F G A Bb C), the key of the music.

Levels (K-weighted loudest 200 ms; a file shorter than 200 ms is measured over
its whole length) are deliberately low so effects sit behind the music:
    -30  shared level
    -26  answers, rewards, the Warden's laugh and defeat (rare, and they matter)
    -28  hurt / knocked out, hearts, chest, secrets, room cleared, intro scene
    -32 to -36  the sounds that repeat constantly
    -40  footsteps and the two telegraph warnings

    python3 make_sfx.py
"""
import os
import numpy as np
import rr_engine as E
from rr_engine import SR, n

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'sfx')
LEAD = 0.003                     # every file starts with 3 ms of silence
rng = np.random.default_rng(7)


# ------------------------------------------------------------------ helpers
def T(sec):
    return np.arange(int(round(sec * SR))) / SR


def hz(name):
    return 440.0 * 2 ** ((n(name) - 69) / 12)


def glide(points, sec):
    """[(time fraction, Hz)] -> smooth frequency curve, one value per sample."""
    xs, ys = zip(*points)
    return np.exp(np.interp(np.linspace(0, 1, int(round(sec * SR))), xs, np.log(ys)))


def wave(ph, shape):
    if shape == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if shape == 'pad':                                   # warm: a few soft harmonics, slightly detuned pair
        one = lambda p: np.sin(p) + 0.30 * np.sin(2 * p) + 0.12 * np.sin(3 * p)
        return 0.5 * (one(ph) + one(ph * 1.004))
    if shape == 'glass':                                 # rounded bell: two quiet inharmonic partials
        return np.sin(ph) + 0.22 * np.sin(2.76 * ph) + 0.08 * np.sin(5.4 * ph)
    if shape == 'hollow':                                # woody: odd harmonic only
        return np.sin(ph) + 0.30 * np.sin(3 * ph)
    return np.sin(ph)


def note(f, dur, shape='sine', attack=0.008, decay=None, f_end=None):
    """One soft note. Raised-cosine attack, optional exponential decay, cosine release."""
    f = hz(f) if isinstance(f, str) else f
    f_end = hz(f_end) if isinstance(f_end, str) else (f_end or f)
    t = T(dur)
    x = wave(2 * np.pi * np.cumsum(glide([(0, f), (1, f_end)], dur)) / SR, shape)
    e = 0.5 - 0.5 * np.cos(np.pi * np.minimum(t / attack, 1.0))
    if decay:
        e *= np.exp(-np.maximum(0, t - attack) / decay)
    rel = int(min(dur * 0.35, 0.06) * SR)
    e[-rel:] *= np.cos(np.linspace(0, np.pi / 2, rel)) ** 2
    return x * e


def swell(freqs, dur, shape='pad', peak=0.45, f_scale_end=1.0):
    """Notes that fade in and out together (no attack at all)."""
    t = np.linspace(0, 1, int(round(dur * SR)))
    e = np.where(t < peak, np.sin(np.pi / 2 * t / peak) ** 2, np.cos(np.pi / 2 * (t - peak) / (1 - peak)) ** 2)
    out = 0
    for f in freqs:
        f = hz(f) if isinstance(f, str) else f
        out = out + wave(2 * np.pi * np.cumsum(glide([(0, f), (1, f * f_scale_end)], dur)) / SR, shape)
    return out * e


def seq(*layers):
    """layers: (audio, start s, gain dB). Each layer is peak-normalised first."""
    end = max(int(s * SR) + len(x) for x, s, _ in layers)
    out = np.zeros(end)
    for x, s, g in layers:
        i = int(s * SR)
        out[i:i + len(x)] += x / max(np.abs(x).max(), 1e-9) * 10 ** (g / 20)
    return out


# ----------------------------------------------------------- formant voice
VOWEL = {   # (centre Hz, half-width Hz, gain)
    'a': [(230, 150, 0.40), (700, 110, 1.00), (1150, 120, 0.60), (2500, 180, 0.20)],
    'e': [(230, 150, 0.30), (550, 100, 1.00), (1700, 140, 0.50), (2500, 180, 0.20)],
    'i': [(280, 80, 1.00), (2200, 160, 0.50)],
    'u': [(300, 90, 1.00), (800, 120, 0.40)],
    'm': [(250, 90, 1.00), (1000, 200, 0.12)],
}


def formants(x, vowel):
    gain = lambda f: sum(a / (1.0 + ((f - c) / w) ** 2) for c, w, a in VOWEL[vowel])
    return E.circ_filter(np.concatenate([x, np.zeros(SR // 4)]), gain)[:len(x)]


def glottis(f_curve, breath=0.0):
    """Buzzy voice source (harmonics falling off with frequency) + optional soft 'h'."""
    ph = 2 * np.pi * np.cumsum(f_curve) / SR
    src = sum(np.sin(k * ph) / k for k in range(1, int(4500 / f_curve.max()) + 1))
    if breath:
        t = T(len(f_curve) / SR)
        src = src + breath * rng.standard_normal(len(src)) * np.exp(-t / 0.018)
    return src


def syllable(f0, dur, vowel='a', fall=0.10, attack=0.03, breath=0.22):
    """One 'ha': pitch drops a little, loudness falls away through the syllable."""
    f0 = hz(f0) if isinstance(f0, str) else f0
    t = T(dur)
    f = glide([(0, f0 * (1 + fall / 2)), (1, f0 * (1 - fall / 2))], dur) * (1 + 0.008 * np.sin(2 * np.pi * 5.5 * t))
    e = (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / attack, 1.0))) * np.maximum(0, 1 - t / dur) ** 0.7
    return formants(glottis(f, breath), vowel) * e


# ----------------------------------------------------------------- registry
SFX = {}


def sfx(name, length, level, what):
    def wrap(fn):
        SFX[name] = (fn, length, level, what)
        return fn
    return wrap


# ------------------------------------------------------------ the Warden
@sfx('warden_roar', 1.40, -26, 'formant voice: "ha... ha-ha-ha" stepping down D3, F3, D3, A2')
def _():
    return seq((syllable('D3', 0.34), 0, 0), (syllable('F3', 0.16), 0.52, -1),
               (syllable('D3', 0.16), 0.71, -2), (syllable('A2', 0.30, fall=0.16), 0.90, -1))


@sfx('warden_ground_slam', 0.45, -30, 'low sine/triangle thump with one formant-voice "heh"')
def _():
    thump = note(105, 0.30, 'sine', 0.010, 0.07, f_end=58) + 0.5 * note(210, 0.30, 'tri', 0.010, 0.05, f_end=116)
    return seq((thump, 0, 0), (syllable('D3', 0.16, 'e'), 0.10, -5))


@sfx('warden_telegraph', 0.15, -40, 'formant voice: one tiny closed-mouth "hm"')
def _():
    return syllable('D3', 0.14, 'm', fall=0.05, attack=0.04, breath=0.0)


@sfx('warden_orb_volley', 0.30, -30, 'pad swell (D4 + A4) with one quick formant-voice "ha!"')
def _():
    return seq((swell(['D4', 'A4'], 0.29), 0, 0), (syllable('A3', 0.13), 0.04, -3))


@sfx('boss_defeated', 1.50, -26, 'formant voice: "ha-ha-" breaking into a long falling, deflating "haaa-oo"')
def _():
    d = 1.12
    t = T(d)
    f = glide([(0, hz('D3') * 1.03), (0.15, hz('D3')), (1, hz('D2') * 1.05)], d) * (1 + 0.03 * np.sin(2 * np.pi * (7 - 4 * t / d) * t))
    src = glottis(f, 0.22)
    w = np.clip(t / d * 1.3, 0, 1)                         # vowel closes from "a" to "oo" as he deflates
    fall = ((1 - w) * formants(src, 'a') + w * 1.4 * formants(src, 'u')) \
        * (0.5 - 0.5 * np.cos(np.pi * np.minimum(t / 0.03, 1.0))) * np.maximum(0, 1 - t / d) ** 0.8
    return seq((syllable('D3', 0.15), 0, -1), (syllable('F3', 0.15), 0.18, -1), (fall, 0.36, 0))


# ----------------------------------------------------------------- combat
@sfx('sword_swing', 0.12, -32, 'pad sweep 480 -> 900 -> 620 Hz, fades in and out')
def _():
    d = 0.115
    t = np.linspace(0, 1, int(round(d * SR)))
    ph = 2 * np.pi * np.cumsum(glide([(0, 480), (0.5, 900), (1, 620)], d)) / SR
    return (wave(ph, 'pad') + 0.25 * np.sin(2 * ph)) * np.sin(np.pi * t) ** 2


@sfx('sword_hit_flesh', 0.08, -32, 'low triangle tick, 180 -> 110 Hz')
def _():
    return note(180, 0.075, 'tri', 0.004, 0.018, f_end=110)


@sfx('sword_hit_armor', 0.12, -32, 'rounded glassy tink on A5')
def _():
    return note('A5', 0.115, 'glass', 0.005, 0.028)


@sfx('shield_block', 0.20, -30, 'pad blip rising D4 -> A4')
def _():
    return seq((note('D4', 0.10, 'pad', 0.008, 0.05), 0, 0), (note('A4', 0.105, 'pad', 0.008, 0.05), 0.09, 0))


@sfx('dodge_roll', 0.15, -32, 'sine slide up 300 -> 700 Hz, fades in and out')
def _():
    return swell([300], 0.145, 'sine', peak=0.5, f_scale_end=700 / 300)


@sfx('player_hurt', 0.18, -28, 'triangle tone falling A4 -> D4')
def _():
    return note('A4', 0.175, 'tri', 0.008, 0.07, f_end='D4')


@sfx('player_knocked_out', 0.80, -28, 'slow falling pad notes D5, Bb4, A4')
def _():
    return seq((note('D5', 0.30, 'pad', 0.02, 0.16), 0, 0), (note('Bb4', 0.30, 'pad', 0.02, 0.16), 0.22, 0),
               (note('A4', 0.35, 'pad', 0.02, 0.18), 0.44, 0))


@sfx('crit_strike', 0.25, -30, 'two-note glassy sparkle A5 -> D6')
def _():
    return seq((note('A5', 0.12, 'glass', 0.006, 0.05), 0, 0), (note('D6', 0.155, 'glass', 0.006, 0.06), 0.09, 0))


@sfx('combo_up', 0.25, -30, 'two rising triangle notes, D5 then A5 (the game pitches it up)')
def _():
    return seq((note('D5', 0.11, 'tri', 0.006, 0.05), 0, 0), (note('A5', 0.14, 'tri', 0.006, 0.05), 0.105, 0))


@sfx('spark_zap', 0.08, -36, 'tiny sine blip on A6')
def _():
    return note('A6', 0.075, 'sine', 0.004, 0.012)


@sfx('power_bolt', 0.10, -34, 'sine "pew", 1200 -> 520 Hz')
def _():
    return note(1200, 0.095, 'sine', 0.004, 0.03, f_end=520)


@sfx('bomb_explosion', 0.30, -30, 'low sine/triangle "whump", 110 -> 55 Hz')
def _():
    return note(110, 0.29, 'sine', 0.010, 0.07, f_end=55) + 0.5 * note(220, 0.29, 'tri', 0.010, 0.05, f_end=110)


# ------------------------------------------------------------ enemy deaths
@sfx('enemy_death_goblin', 0.20, -32, 'two falling triangle notes A5 -> E5')
def _():
    return seq((note('A5', 0.09, 'tri', 0.005, 0.04), 0, 0), (note('E5', 0.105, 'tri', 0.005, 0.04), 0.09, 0))


@sfx('enemy_death_bat', 0.16, -32, 'two quick high sine notes F6 -> D6')
def _():
    return seq((note('F6', 0.07, 'sine', 0.005, 0.03), 0, 0), (note('D6', 0.085, 'sine', 0.005, 0.03), 0.07, 0))


@sfx('enemy_death_skeleton', 0.18, -32, 'hollow woody "tok-tok" on F5 then D5')
def _():
    return seq((note('F5', 0.07, 'hollow', 0.004, 0.014), 0, 0), (note('D5', 0.08, 'hollow', 0.004, 0.016), 0.095, 0))


@sfx('enemy_death_slime', 0.18, -32, 'round sine "bloop", 190 -> 420 Hz')
def _():
    return swell([190], 0.175, 'sine', peak=0.4, f_scale_end=420 / 190)


@sfx('enemy_death_wisp', 0.25, -32, 'airy pad puff sliding A5 -> E5 and fading away')
def _():
    return swell(['A5'], 0.245, 'pad', peak=0.2, f_scale_end=hz('E5') / hz('A5'))


# ---------------------------------------------------------------- warnings
@sfx('enemy_telegraph', 0.10, -40, 'barely-there sine tick on A5')
def _():
    return note('A5', 0.095, 'sine', 0.006, 0.015)


# ------------------------------------------------------- pickups and world
@sfx('pickup_coin', 0.12, -32, 'single glassy bell tick on A5')
def _():
    return note('A5', 0.115, 'glass', 0.005, 0.035)


@sfx('pickup_gem', 0.15, -34, 'tiny sine chime on D6')
def _():
    return note('D6', 0.145, 'sine', 0.006, 0.04) + 0.15 * note(2 * hz('D6'), 0.145, 'sine', 0.006, 0.025)


@sfx('pickup_heart', 0.40, -28, 'warm pad rising F4 -> A4')
def _():
    return seq((note('F4', 0.20, 'pad', 0.015, 0.10), 0, 0), (note('A4', 0.23, 'pad', 0.015, 0.11), 0.165, 0))


@sfx('chest_open', 0.60, -28, 'rising triangle arpeggio D4, F4, A4')
def _():
    return seq((note('D4', 0.20, 'tri', 0.012, 0.09), 0, 0), (note('F4', 0.20, 'tri', 0.012, 0.09), 0.15, 0),
               (note('A4', 0.29, 'tri', 0.012, 0.13), 0.30, 0))


@sfx('pot_smash', 0.15, -32, 'single hollow "tock" on E4')
def _():
    return note('E4', 0.145, 'hollow', 0.004, 0.022)


@sfx('wall_crack', 0.20, -32, 'dull triangle knock, 150 -> 110 Hz')
def _():
    return note(150, 0.195, 'tri', 0.006, 0.035, f_end=110)


@sfx('secret_found', 0.80, -28, 'open, mysterious rising pad notes D5, E5, A5')
def _():
    return seq((note('D5', 0.26, 'pad', 0.02, 0.14), 0, 0), (note('E5', 0.26, 'pad', 0.02, 0.14), 0.20, 0),
               (note('A5', 0.39, 'pad', 0.02, 0.18), 0.40, 0))


@sfx('door_unlock', 0.30, -30, 'low pad notes A3 -> D4')
def _():
    return seq((note('A3', 0.14, 'pad', 0.01, 0.07), 0, 0), (note('D4', 0.17, 'pad', 0.01, 0.08), 0.125, 0))


@sfx('door_open', 0.40, -32, 'low pad swell on D3 + A3')
def _():
    return swell(['D3', 'A3'], 0.39, 'pad', peak=0.45)


@sfx('room_cleared', 0.70, -28, 'calm pad resolve A4, C5, D5, ending on D')
def _():
    return seq((note('A4', 0.22, 'pad', 0.015, 0.11), 0, 0), (note('C5', 0.22, 'pad', 0.015, 0.11), 0.17, 0),
               (note('D5', 0.35, 'pad', 0.015, 0.17), 0.34, 0))


for _k, _p in ((1, 'G3'), (2, 'A3'), (3, 'F3')):
    @sfx(f'footstep_stone_{_k}', 0.08, -40, f'barely-there low triangle tick on {_p}')
    def _(p=_p):
        return note(p, 0.075, 'tri', 0.005, 0.014)


# -------------------------------------------------- questions and rewards
@sfx('answer_correct', 0.50, -26, 'soft rising sine chime D5, F5, A5')
def _():
    return seq((note('D5', 0.20, 'sine', 0.012, 0.09), 0, 0), (note('F5', 0.20, 'sine', 0.012, 0.09), 0.12, 0),
               (note('A5', 0.25, 'sine', 0.012, 0.11), 0.24, 0))


@sfx('answer_wrong', 0.50, -26, 'soft low pad falling D4 -> Bb3')
def _():
    return seq((note('D4', 0.24, 'pad', 0.02, 0.12), 0, 0), (note('Bb3', 0.29, 'pad', 0.02, 0.14), 0.20, 0))


@sfx('level_up', 0.80, -26, 'rising triangle arpeggio D4, F4, A4, D5')
def _():
    return seq(*[(note(p, 0.22 if i < 3 else 0.37, 'tri', 0.012, 0.11 if i < 3 else 0.17), i * 0.14, 0)
                 for i, p in enumerate(('D4', 'F4', 'A4', 'D5'))])


@sfx('card_pick_power', 0.40, -26, 'pad confirm G4 -> D5')
def _():
    return seq((note('G4', 0.18, 'pad', 0.012, 0.09), 0, 0), (note('D5', 0.25, 'pad', 0.012, 0.12), 0.145, 0))


@sfx('card_pick_gold', 0.60, -26, 'pad confirm A4 -> E5 with a soft octave shimmer')
def _():
    d = 0.40
    shimmer = note(2 * hz('E5'), d, 'sine', 0.03, 0.16) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * T(d)))
    return seq((note('A4', 0.20, 'pad', 0.012, 0.10), 0, 0), (note('E5', 0.43, 'pad', 0.012, 0.18), 0.16, 0), (shimmer, 0.19, -10))


@sfx('shop_purchase', 0.40, -26, 'glassy "ding-dong" A5 -> F5')
def _():
    return seq((note('A5', 0.18, 'glass', 0.008, 0.08), 0, 0), (note('F5', 0.24, 'glass', 0.008, 0.10), 0.155, 0))


# ------------------------------------------------------------- intro scene
@sfx('torch_light', 0.40, -28, 'warm pad swell on D3 + A3 + D4, rising slightly')
def _():
    return swell(['D3', 'A3', 'D4'], 0.39, 'pad', peak=0.35, f_scale_end=1.04)


@sfx('relic_glow', 1.20, -28, 'pad sliding up D4 -> A4 with a slow shimmer')
def _():
    d = 1.19
    return swell(['D4', 'A4'], d, 'pad', peak=0.6, f_scale_end=1.5) * (0.8 + 0.2 * np.sin(2 * np.pi * 8 * T(d)))


@sfx('goblin_snarl', 0.40, -28, 'formant voice: small nasal "nyeh", pitch 250 -> 340 -> 230 Hz')
def _():
    d = 0.39
    t = T(d)
    f = glide([(0, 250), (0.3, 340), (1, 230)], d) * (1 + 0.02 * np.sin(2 * np.pi * 24 * t))
    src = glottis(f)
    w = np.clip(t / d * 1.6, 0, 1)                         # mouth opens from "ny" (i) to "eh"
    return ((1 - w) * formants(src, 'i') + w * formants(src, 'e')) * np.sin(np.pi * np.linspace(0, 1, len(t)) ** 0.7) ** 2


# ---------------------------------------------------------------------- UI
@sfx('ui_tick', 0.05, -30, 'tiny sine tick on A5')
def _():
    return note('A5', 0.045, 'sine', 0.004, 0.008)


# -------------------------------------------------------------------- build
def loudest_window_db(x, win=0.2):
    y = E.k_weight(np.concatenate([x, np.zeros(SR // 2)]))[:len(x)]
    w = min(len(y), int(win * SR))
    p = np.convolve(y ** 2, np.ones(w) / w, mode='valid')
    return 10 * np.log10(max(p.max(), 1e-12))


def finish(x, length, level):
    """Lead-in silence, warm low-pass, exact length, faded end, target level."""
    y = np.zeros(int(round(length * SR)))
    lead = int(LEAD * SR)
    m = min(len(y) - lead, len(x))
    y[lead:lead + m] = x[:m]
    g = lambda f: E.highpass(45)(f) * E.gauss_lp(4000)(f)
    y = E.circ_filter(np.concatenate([y, np.zeros(SR // 4)]), g)[:len(y)]
    fi, fo = int(0.002 * SR), int(min(0.03, length / 4) * SR)
    y[:fi] *= np.linspace(0, 1, fi) ** 2
    y[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    return y * 10 ** ((level - loudest_window_db(y)) / 20)


def main():
    for sub in ('wav', 'ogg'):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)
    rows = []
    for name, (fn, length, level, what) in SFX.items():
        x = finish(np.asarray(fn(), dtype=float), length, level)
        wav = os.path.join(OUT, 'wav', name + '.wav')
        E.write_wav16(wav, x)
        E.encode(wav, os.path.join(OUT, 'ogg', name + '.ogg'), 'Rook & Ruin SFX - ' + name, q='5',
                 comment='Rook & Ruin. Original audio. Synthesised sound effect.')
        rows.append((name, len(x) / SR, loudest_window_db(x), 20 * np.log10(np.abs(x).max()), level, what))
    with open(os.path.join(OUT, 'sfx_sources.txt'), 'w') as f:
        f.write('All 46 effects are synthesis written in src/make_sfx.py. No samples, no SoundFont.\n'
                'Level = K-weighted loudest 200 ms (whole file if shorter).\n\n')
        for name, dur, lv, pk, level, what in rows:
            text = f'{name:22s} {dur:5.2f} s  level {lv:6.1f} dB (target {level:d})  peak {pk:6.1f} dBFS  <- {what}'
            print(text); f.write(text + '\n')
    # audition reel: every effect in order, 0.7 s apart, with a timestamp list
    gap, parts, t, idx = np.zeros(int(0.7 * SR)), [], 0.0, []
    for name, *_rest in rows:
        x = E.decode(os.path.join(OUT, 'wav', name + '.wav'), channels=1)
        idx.append(f'{int(t // 60)}:{t % 60:04.1f}  {name}')
        parts += [x, gap]
        t += (len(x) + len(gap)) / SR
    reel = os.path.join(OUT, '_reel.wav')
    E.write_wav16(reel, np.concatenate(parts))
    E.encode(reel, os.path.join(OUT, 'ALL_SFX_audition_reel.mp3'), 'Rook & Ruin SFX audition reel',
             codec='libmp3lame', q='3', comment='Rook & Ruin. Original audio. Synthesised sound effects.')
    os.remove(reel)
    with open(os.path.join(OUT, 'ALL_SFX_audition_reel_order.txt'), 'w') as f:
        f.write('\n'.join(idx) + '\n')


if __name__ == '__main__':
    main()
