# Minimal build plan (draft, no code yet)

Each milestone is playable on its own.

| M | Goal | Done when |
|---|------|-----------|
| M0 (done) | Data pipeline | Script fetches OSM for the park and outputs one compact bundle (paths, grass, water, woods, bridges, trees, boundary buildings, entrance candidates) |
| M1 (done) | Static world | Stylized park renders; bird's-eye view with clickable entrances; transition to eye level (R3 to R5) |
| M2 (partly done) | Single-player character | Walk, run, third-person back view with orbit camera (done, placeholder figure); sit and lie down (todo) (R6, R7) |
| M3 | Auth + character setup | Sign up/in, face color, clothes, nickname saved to profile (R1, R2) |
| M4 | Multiplayer + HUD | See other players move; live "N in the park" (R10) |
| M5 | Blankets | Grab with daily cap and color, lay out, get back, server-enforced (R8, R9) |
| M6 | Harden | Nickname filter, disconnect cleanup, load test, deploy |

M1 and M2 can run before any backend exists. M3 to M5 need the server.

## Data model (sketch)
- `profiles(user_id, nickname, skin_color, top, bottom)`
- `blanket_grabs(user_id, day, count)` with `count <= 100`, `day` = Los Angeles date
- Room state: players `{id, pos, rot, anim}`, blankets `{id, owner, pos, color}`

## Waiting on the owner
Design guide, answers to the open questions in the README, and the launch concurrency target.

## Known gaps after M1
- 74 entrance candidates (every path crossing the outline), unnamed; needs curating to the real gates.
- The park outline is a 4-corner approximation, so edge entrances can be off by tens of metres.
- OSM has only 1,607 trees (the real park has far more); paths are flat ribbons with no collision.
- Free-walk camera only; no character, collision, or multiplayer yet.
