# Star Swarm HD hub card, cover pass 3 (Sprite Drop task bd9d8f54)

- Painting: approved asset 2274ab1c (sha256 19dfd507...), unchanged.
- Logo: approved asset cf9ae1ee (sha256 12f3e3b3...), composited exactly as is: trimmed to its visible box, scaled to 55% of card width (Lanczos), rotated 4 degrees counter-clockwise (rising to the right), with a cyan rim glow and a dark drop shadow behind it. Letters were not redrawn.
- Three thin cyan laser streaks and a few sparks were drawn in front of the logo's outer edges, masked so they never cover a letter.
- Card: crop rows 90..935 (1536x845), resize to 400x220 (Lanczos).

Not wired into games/cards/ yet: Kody approves the art first.
Rebuild: python make_cover.py <dir with paint.png and logo.png>
