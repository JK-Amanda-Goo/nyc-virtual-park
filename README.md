# nyc-virtual-park

A multiplayer 3D place where people sign up and spend time in random areas of New York City. **v1 is Central Park.**

> Status: **M0 to M2 done (data pipeline, map to eye level, character with sit and lie down), plus a minimap and a client-only blanket, all with placeholder colors.** Next: M3 (sign-up and character setup). See [`CHANGELOG.md`](CHANGELOG.md) for what changed, [`docs/research.md`](docs/research.md) for findings and [`docs/plan.md`](docs/plan.md) for the minimal-scope build plan.

## Vision

Pick an entrance on a bird's-eye map of Central Park, then drop to eye level and walk in as a character alongside other people who are in the park right now. The graphics are stylized, but the layout and landmarks match the real park. Later versions add other NYC areas.

## v1 requirements (user experience)

| # | Requirement |
|---|-------------|
| R1 | **Sign up** and sign in. |
| R2 | **Character setup:** face (skin) color, basic clothes, nickname. |
| R3 | **Bird's-eye map** of Central Park; the user picks an **entrance**. |
| R4 | On pick, the view transitions to **human eye level**, so it feels like walking into the park. |
| R5 | Visuals are graphics, but with a **layout and location traits similar to the real Central Park**. |
| R6 | Default camera shows the character's **back**. The user can **orbit the camera** to view the character from any direction. |
| R7 | **Movement:** walk and run. **Static postures:** sit and lie down. |
| R8 | **Blankets:** a user can grab their own blanket, **max 100 grabs per day per user**, reset at **00:00:00 PST**. The user chooses the blanket color. |
| R9 | **Lay out blanket:** spreads the blanket at the user's current location. A **get blanket back** button is shown to anyone with a blanket laid out. |
| R10 | A persistent **HUD** after sign-in shows **how many users are currently in the park** (more HUD items can be added later). |

### Out of scope for v1

Chat, voice, friends, other NYC areas, mobile apps, avatar marketplace, photoreal rendering, an in-game economy, and moderation tooling beyond a basic nickname filter. Design/visual polish comes later from the owner's guide.

## Proposed stack (minimal)

| Layer | Choice | Why |
|-------|--------|-----|
| Client | Vite + React + TypeScript + three.js via react-three-fiber / drei | Browser-only, no install, large ecosystem |
| World | Stylized scene generated from OpenStreetMap data (paths, lawns, water, woods, bridges) | Real layout without Google's tile restrictions; see research |
| Realtime | Colyseus (or PartyKit/Cloudflare) rooms | Authoritative server, presence count, state sync |
| Auth + DB | Supabase (auth, Postgres) | Profiles, blanket counters, no custom auth |
| Avatar | CC0 low-poly rigged model plus an animation library, tinted at runtime | Cheapest path to color/clothes customization |
| Hosting | Static client on Vercel; game server on Fly.io or Cloudflare | To be confirmed |

Rationale, alternatives, costs, and risks are in [`docs/research.md`](docs/research.md).

## Fidelity policy

The product is visiting a real place, so real-world elements must come from an authoritative source and be tagged with where they came from and whether they are verified. Nothing is placed by guess. Current sources:

| Element | Source | Status |
|---|---|---|
| Boundary | NYC Parks "Parks Properties" (M010) | official |
| Terrain | NYC 1 m LiDAR DEM (2017) | official, 8 m grid in the client |
| Paths, roads, lawns, water, woods | OpenStreetMap | community data, not yet audited |
| Buildings | NYC Building Footprints (`5zhs-2jue`), roof height in feet converted to metres | official; 15 of 11,268 have no height and are drawn at 10 m |
| Street trees | NYC Parks Forestry Tree Points (`hn5i-inap`), size scaled from trunk diameter | official locations; height and crown are a rule of thumb, not measured |
| Trees inside the park | OpenStreetMap points | locations only, size unknown (NYC Parks has just 96 trees inside the park) |
| Gates | Conservancy list of 20 named gates; positions from OSM street junctions and the Conservancy's map pins | 20 placed, 17 verified against a second source, 3 from the Conservancy pin alone (see docs/research.md section 9) |

## Which LLM for what

Short version (details in the research doc): Google's Maps/3D Tiles are an **API, not an LLM**, so choosing a model doesn't change how the map data gets in. For building this, use **one strong coding model for the code** and consider **Gemini only for generating textures/concept art** if wanted. No LLM is needed at runtime in v1.

## Decisions

1. Daily blanket reset is midnight `America/Los_Angeles` (PT, follows daylight saving).
2. Laid-out blankets are shared world objects visible to everyone. v1 is one shared world; sharding into multiple servers comes later as demand grows.
3. Capacity target: about 200 concurrent users in one session. Cost estimate in [`docs/cost.md`](docs/cost.md).
4. A blanket grab counts when taken; putting it back does not refund it.
5. Static client hosting starts on Cloudflare Pages (free), and we can move later.
6. Sign-up starts with email (one-time code via Supabase Auth plus a bot check). Google sign-in can be added later.

## Run it

```
node data/scripts/fetch-boundary.mjs  # official boundary
node data/scripts/fetch-terrain.mjs   # LiDAR elevation
node data/scripts/fetch-osm.mjs       # OSM features and gates (about 1 min)
node data/scripts/build-park.mjs      # write apps/web/public/park.json and terrain.bin
cd apps/web && npm install && npm run dev
```

`park.json` and `terrain.bin` are committed, so you can skip the fetch steps.

## Repo layout

```
docs/        research and plan
apps/web/    client (M1: map, entrances, eye-level walk)
apps/server/ realtime server (not created yet)
data/scripts/ OSM fetch and build scripts
```
