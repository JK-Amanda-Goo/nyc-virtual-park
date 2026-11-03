# Minimal build plan (draft, no code yet)

Each milestone is playable on its own.

| M | Goal | Done when |
|---|------|-----------|
| M0 (done) | Data pipeline | Script fetches OSM for the park and outputs one compact bundle (paths, grass, water, woods, bridges, trees, boundary buildings, entrance candidates) |
| M1 (done) | Static world | Stylized park renders; bird's-eye view with clickable entrances; transition to eye level (R3 to R5) |
| M2 (done) | Single-player character | Walk, run, third-person back view with orbit camera, sit (C), lie down (X); placeholder figure (R6, R7) |
| M2.5 (done) | Minimap | Round top-down map in walk mode: view direction up, arrow for you, gate dots, N on the rim |
| M3a (done) | Character setup, local | Nickname, skin, top and bottom colours; saved in the browser; shown in the park (R2) |
| M3b | Sign-up / sign-in | Email one-time code via Supabase; profile saved to the account (R1). Needed before multiplayer (M4) |
| M4 | Multiplayer + HUD | See other players move; live "N in the park" (R10) |
| M5a (done) | Blanket, client only | Pick a colour, grab, lay out with a drop-and-unfold animation, get back; no server, no daily cap, not shared |
| M5b | Blankets, server side | Daily cap of 100 (Los Angeles day), laid-out blankets shared with everyone, server-enforced (R8, R9) |
| M6 | Harden | Nickname filter, disconnect cleanup, load test, deploy |

M1 and M2 can run before any backend exists. M3 to M5 need the server.

## Data model (sketch)
- `profiles(user_id, nickname, skin_color, top, bottom)`
- `blanket_grabs(user_id, day, count)` with `count <= 100`, `day` = Los Angeles date
- Room state: players `{id, pos, rot, anim}`, blankets `{id, owner, pos, color}`

## Waiting on the owner
Design guide, answers to the open questions in the README, and the launch concurrency target.

## Fidelity work (2026-11-02, done)
Official boundary, LiDAR terrain (map texture and walking height), 6 OSM-named gates replace the 74 auto-generated entrances.

## Known gaps
- 20 of 20 gates placed; 17 verified, 3 on the Conservancy pin alone (see research.md section 9).
- Bridges and tunnels sit on the terrain surface (no height separation).
- Buildings now use NYC footprints with real roof heights (15 of 11,268 lack a height, drawn at 10 m).
- Street trees (23,419) come from NYC Parks. Trees inside the park are still OSM points with unknown size; the only individual-tree dataset found is the TNC 2021 crown data (2.0 GB, CC BY-NC-SA, non-commercial), not downloaded pending a licence decision.
- Tree height and crown size are scaled from trunk diameter by a rule of thumb, not measured.

## Older gaps (before the fidelity work)
- 74 entrance candidates (every path crossing the outline), unnamed; needs curating to the real gates.
- The park outline is a 4-corner approximation, so edge entrances can be off by tens of metres.
- OSM has only 1,607 trees (the real park has far more); paths are flat ribbons with no collision.
- Free-walk camera only; no character, collision, or multiplayer yet.
