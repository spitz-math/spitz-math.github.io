# Rook & Ruin — Iron Warden voice (final clean pair)

Two drop-in replacements for the Warden's voice in the Rook & Ruin sound-effects pack.
They use the pack's existing file names, so a game already wired to the pack plays
them with no code change.

| File | Length | When it plays | What it is |
|---|---|---|---|
| `sfx/ogg/warden_roar.ogg` | 2.3 s | Warden spawns / enters (and enrages) | slow, deep, menacing "mwa-ha-ha-ha-haaa", last beat long and falling |
| `sfx/ogg/boss_defeated.ogg` | 2.8 s | Warden is defeated (also each extra Warden in the Last Stand) | his laugh chokes, a gasp, a long falling groan, armour lands in three low thuds |

WAV copies are in `sfx/wav/`. Both are mono, 48 kHz, at -26 dB (K-weighted loudest
200 ms), the same level these two slots already had in the pack. Measurements are in
`verification.txt`.

They are longer than the versions they replace (1.4 s and 1.5 s before).

## Licence
Fully synthesised (formant voice synthesis written in `src/make_warden_laugh.py`).
No samples, no SoundFont, no recordings: no licence or credit requirement.

## Rebuilding
`src/` holds the generator and the two modules it imports from the main pack.
Needs Python 3, numpy and ffmpeg.

    cd src
    python3 make_warden_laugh.py variants   # makes the spawn variants, including A
    python3 make_warden_laugh.py final      # spawn = variant A, plus the matching death

Output goes to `extras/` next to `src/`. The spawn is "variant A" (pitch 0.84,
tempo 1.18, octave double 0.30); the death uses the same settings. The script's
`recording` mode needs an uploaded recording that is not included and is not used
by these files.
