# Minimal build plan (draft, no code yet)

Each milestone is playable on its own.

| M | Goal | Done when |
|---|------|-----------|
| M0 | Data pipeline | Script fetches OSM for the park and outputs one compact bundle (paths, grass, water, woods, bridges, trees, boundary buildings, entrance candidates) |
| M1 | Static world | Stylized park renders; bird's-eye view with clickable entrances; transition to eye level (R3 to R5) |
| M2 | Single-player character | Walk, run, third-person back view with orbit camera, sit, lie down (R6, R7) |
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
