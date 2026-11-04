# Changelog

Newest first. Versions are pre-release (0.x).

## [Unreleased] - 2026-11-04

### Added
- Accounts (Supabase Auth): sign up and sign in with email and password; the character profile (nickname, skin, top) is saved to the account in a `profiles` table with row-level security. Email confirmation is switched off for now.
- Multiplayer (Supabase Realtime): everyone in the park sees the others walk, run, sit and lie down, with nicknames and colours; positions go out 10 times a second while moving. Blankets are shared too (carried, laid out, folded back, colour), including for people who join later. Blankets disappear when their owner leaves; saving them is still to do.
- HUD at the top right, on the map and while walking: how many people are in the park, with a list of names. People looking at the map are not counted until they pick a gate.
- Engagement data (`supabase/migrations/0002_engagement.sql`): one `park_sessions` row per visit (gate, entered/left, heartbeat, active seconds, walk/run metres, steps = distance / 0.75 m, blankets laid, most others at once, seconds near others) and `park_events` rows for sitting, lying down and blanket lay/pickup, with game and real-map coordinates and whether it happened on a blanket. A `gates` table holds the 20 real gates so the chosen entrance is always a valid one. Writes go through `start_session`, `ping_session` and `log_event` only; the dashboard views `daily_engagement`, `engagement_summary` and `gate_popularity` are not exposed to the app.

### Added (earlier today)
- Character setup screen (local only): nickname (2 to 16 characters), skin colour (6 natural tones plus 16 neon colours) and top colour, with a turning preview. Trousers are fixed. The nickname field suggests a random nature-word nickname (e.g. FuzzyCricket) as its placeholder; leave it empty to use it, or press the dice for another. Saved in this browser, shown on the character in the park, with the nickname above its head; "Edit character" reopens it. Sign-up and saving to an account come with Supabase later (before multiplayer).
- Blanket, client only (M5a): pick a colour, grab, lay out with a drop-and-unfold animation, get back, put away. No daily cap and not shared yet (M5b needs the server).
- Minimap in walk mode: the park stands upright (long axis up), +/- zoom that follows you, a live wedge for the camera direction, an arrow for your character, gate dots (red verified, yellow unverified), and a tilted compass for real north.
- Real building heights from NYC Building Footprints (11,268 footprints, 15 without a height drawn at 10 m).
- NYC Parks street trees (23,419) sized from trunk diameter; the size rule is a rough guess, not a measurement.

### Changed
- Gate verification: 17 of 20 gates now agree with a second source (Conservancy map pins). Merchants', Farmers' and Exonerated rest on the pin alone.
- The pick-an-entrance map and the minimap share one park-axis calculation (`parkAxis.ts`).

### Known gaps
- Trees inside the park are still OpenStreetMap points of unknown size (NYC Parks has only 96 there). The only individual-tree dataset found is non-commercial and was not downloaded.
- Bridges and tunnels are drawn on the terrain surface.
- Blankets are not saved when their owner leaves, and there is no daily cap yet (M5b).
- Multiplayer positions are not checked by a server; the room is open to any signed-in client.
- Repo is private; before going public it needs OpenStreetMap attribution and a LICENSE.

## 2026-11-02

### Added
- Sit (C) and lie down (X) poses.
- All 20 of the Conservancy's named gates, placed from street junctions and checked against the Conservancy's map pins (13 verified at first).
- Fidelity audit and authoritative-source notes (`docs/research.md`), and the fidelity policy in the README.

### Changed
- Official park boundary (NYC Parks property M010) and 1 m LiDAR terrain replace the 4-corner outline and flat ground.
- The 74 auto-generated entrances are gone; entrances are now the real named gates.

## 2026-11-01

### Added
- README with requirements R1 to R10, research notes, build plan, decisions and monthly cost estimate.
- OpenStreetMap data pipeline and web client: bird's-eye map, pick an entrance, drop to eye level (M0, M1).
- Placeholder character with a third-person orbit camera, walk and run (M2 part 1).
