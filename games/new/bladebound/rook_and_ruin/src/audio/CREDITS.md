# Rook & Ruin audio — credits and licences

## What must be credited
Suggested line for the game's credits screen:

> Music rendered with the Fluid (R3) GM SoundFont, (c) Frank Wen, MIT licence.

## Music
All eight pieces and the two rock/metal alternates are original compositions (melody, harmony, arrangement) written
as code in `src/make_music.py`. Nothing from the
reference tracks (Matthew Pablo's "The Last Encounter", "Imminent Threat",
"Blackmoor Colossus") is in them — no audio, MIDI, melody or arrangement.

## Instrument samples (music only)
**Fluid (R3) General MIDI SoundFont** — (c) 2000-2002, 2008 Frank Wen, **MIT licence**.
Full text in `licenses/FluidR3_GM-LICENSE.txt` (from Ubuntu package
`fluid-soundfont-gm` 3.1-5.3). The SoundFont file is not redistributed here; the
credit line above is a courtesy that also satisfies the licence if you ever ship it.

## Sound effects
All 46 effects (version 2, soft synth) are synthesised from scratch by `src/make_sfx.py`.
They use no samples and no SoundFont, so they carry no licence or credit requirement.
The first version of the effects used Kenney "RPG Audio" (CC0) samples; this version does not.

## Deliberately NOT used
* **"80 CC0 RPG SFX"** — the ZIP has no licence file and its download page could
  not be reached from this session to confirm CC0, so none of it is in the output.
* **Matthew Pablo's music packs** — reference only. No licence file was included;
  OpenGameArt lists these as CC-BY / CC-BY-SA depending on the track.
* No samples from any commercial game.

## Tools
FluidSynth 2.3.4 (LGPL-2.1), FFmpeg (libvorbis, libmp3lame), Python + NumPy.
Tool licences cover the programs, not the audio they produce.

## Iron Warden voice (2026-11-15, from Kody)
`rook_and_ruin/warden_roar.ogg` (2.3 s laugh) and `rook_and_ruin/boss_defeated.ogg` (2.8 s death groan) come from Kody's
"rook_ruin_warden_voice" pack: fully synthesised (formant voice synthesis), no samples, no credit needed. Generator and
measurements in `warden_voice_src/`. Level -26 dB as delivered; do not boost (Kody's handoff).
