# art_check: technical validation for spitz.dev art

`validate.py` measures an image against a JSON spec. It never asks a model
anything and never judges looks. The result is one of:

| Result | Meaning | Counts toward "ready"? |
| --- | --- | --- |
| PASS | every check measured and inside the spec | yes (still needs visual approval) |
| FAIL | at least one check measured outside the spec | no |
| INDETERMINATE | the spec does not give enough to measure a check honestly | no |
| SPEC ERROR | the spec itself is wrong (unknown key, missing size, ...) | no |

```
python3 tools/art_check/validate.py art.png spec.json --json record.json
python3 tools/art_check/run_regression.py      # 20 past deliveries, must all match
```

The JSON record holds the image's sha256, so a "ready" gate can tie the result
to the exact file.

## Body height (the Lancer lesson)

The round-2 Lancer measured 52-54 px including the spear and was wrongly
accepted. Its body is 43-45 px. So:

- `armed: false` → body height is the opaque height of the cell.
- `armed: true` → a **body mask** is required (a PNG the same size, opaque only
  on the body). Without one the check is INDETERMINATE, never PASS.
- `armed` missing → INDETERMINATE.
- Width-based estimates (rows with a wide opaque run) are printed as info only.
  On the round-2 Lancer they said 47-50 against a true 43-45, so they are not
  trusted for a gate.

`annotate/body_mask.py` drafts a mask (drop weapon colours, cut above the
helmet line) and writes a magenta preview. A person must look at the preview
before the mask is used; write who checked it in the spec's `note`.

`armed: false` is a claim made by whoever writes the spec. If a spec wrongly
declares an armed character unarmed, the check will measure the weapon. Specs
live on the task so this claim is visible and reviewable.

## What this does not cover

- Whether the art looks right or fits the game. That is a separate visual
  approval, recorded separately.
- Whether the image model actually saw the references.

## Same pixels in the game (the approval lesson)

Kody approves art in the Claude thread that wires it in. After wiring, prove the
game carries exactly what he approved:

```
python3 tools/art_check/same_pixels.py approved.png games/<game>.html --sha256 <approved sha256>
```

It decodes every PNG it finds (a file, a folder, or `data:image/png;base64` inside
.html/.js) and compares RGBA pixels (fully transparent pixels count as equal).
SAME exits 0; DIFFERENT exits 1 and names the closest picture and how many pixels
differ. Re-saved PNGs with different bytes still match if the pixels match. Art that
the game slices, scales or recolours on purpose will not match as a whole picture:
keep sheets intact in the game file, or check the processed copy Kody approved.

## Parents and proofs (spitz.dev M3)

A picture made from an approved one names it (`drop_asset` with `made_from`). Sprite Drop then compares the two
stored files pixel by pixel. Only a **pixel-preserving** change is approved without Kody:

| Change | Proof kind | Approved automatically? |
| --- | --- | --- |
| re-save, same pixels | `identical` | yes |
| trim, pad or shift the empty border | `same_content` | yes |
| whole-number nearest-neighbour scale (e.g. a 4x block picture to 1x) | `scale` | yes |
| one frame cut out of an approved sheet | `frame_of` | yes |
| 1x conversion of an illustration, recolour, redraw, new animation frames | `none` | **no, Kody approves** |

Similarity is never a reason to approve. The same rules run locally:

```
python3 tools/art_check/proof.py parent.png child.png [--parent-frames WxH] [--child-frames WxH]
python3 tools/art_check/still_parts.py sheet.png --frame 48x44 --base approved_sprite.png --still x,y,w,h
python3 tools/art_check/to_1x.py original.png out_1x.png --size 48x44 [--palette '#..,#..'] [--outline '#..']
python3 tools/art_check/test_m3.py
```

`still_parts.py` proves an animation keeps its still parts (a forge's stone and hood) identical in every frame and
that frame 1 is the approved sprite. `to_1x.py` is the shared converter (same steps as the worker's `pixel.ts`);
its report is information only and the result always goes to Kody.
