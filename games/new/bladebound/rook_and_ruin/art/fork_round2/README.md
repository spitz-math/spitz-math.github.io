# Rook & Ruin fork, art round 2 (staging, not wired into the game yet)

- lance_w.png: 192x177, 48x59 cells, feet at y56. ChatGPT round-2 art, downscaled 4x to 1x (nearest), each row shifted down so the feet sit on y56.
- lance_a.png: 256x186, 64x62 cells, feet at y59. Same treatment (row 0 up 1, row 1 down 3, row 2 up 1 except the charge frame, whose lance tip already touches the top of the cell).
- room_kiln_rejected_r2.png: the round-2 Ember Kiln, kept for reference only. It is not built on the dungeon kit (floor, pillars, arch and south wall are all redrawn), so it will not ship.

## Rooms (option A, round 3)
- room_kiln.png / room_barracks.png: 480x270, built in code by compose_rooms.py on the real Guard Room picture (room_guard.png with x225-257, y46-214 copied from room_siege.png to remove the carpet). Every floor pixel, the pillars, the arch and both doors are untouched (the script checks that the floor box is identical).
- Ember Kiln: kiln_mouth.png replaces the two outer banners, with soot above them; wall_brazier.png on both side walls (mirrored on the right); warm tint on the walls only.
- Barracks: lance_rack.png replaces the outer banners; the inner banners are recoloured to the Lancer green; armor_stand.png on both side walls; cool tint on the walls only. The props' teal greens are swapped to the Lancer's three greens.
- props/: ChatGPT's 1x props as delivered (checksums match, alpha 0/255).

Sprite Drop task 6b24b19d-7144-47b4-ae3c-24e3e8f3ab56.
