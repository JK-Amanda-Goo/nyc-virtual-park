# nyc-virtual-park

A multiplayer 3D place where people sign up and spend time in random areas of New York City. **v1 is Central Park.**

> Status: **research and planning. No application code yet.** See [`docs/research.md`](docs/research.md) for findings and [`docs/plan.md`](docs/plan.md) for the minimal-scope build plan.

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

## Which LLM for what

Short version (details in the research doc): Google's Maps/3D Tiles are an **API, not an LLM**, so choosing a model doesn't change how the map data gets in. For building this, use **one strong coding model for the code** and consider **Gemini only for generating textures/concept art** if wanted. No LLM is needed at runtime in v1.

## Decisions

1. Daily blanket reset is midnight `America/Los_Angeles` (PT, follows daylight saving).
2. Laid-out blankets are shared world objects visible to everyone. v1 is one shared world; sharding into multiple servers comes later as demand grows.
3. Capacity target: about 200 concurrent users in one session. Cost estimate in [`docs/cost.md`](docs/cost.md).
4. Sign-up starts with email (one-time code via Supabase Auth plus a bot check). Google sign-in can be added later.

## Open questions

1. Does a grab count when taken, or only when laid out? Plan assumes each grab counts and picking a blanket back up does not refund it.
2. Where to host the static client (Vercel Pro vs a free static host); see the cost doc.

## Repo layout (planned)

```
docs/        research and plan
apps/web/    client (not created yet)
apps/server/ realtime server (not created yet)
data/        OSM extract and build script (not created yet)
```
