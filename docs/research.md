# Research notes

Date: 2026-11-01. Findings marked **verified** were checked directly in this session; the rest come from web search summaries (several from low-authority sources) and need confirming before we commit.

## 1. How to get "Central Park, but graphics"

### Option A: Google Photorealistic 3D Tiles
- Per-request billing: 1,000 free/month, then about $6 per 1,000 root-tile requests, with volume tiers down to $2.40 (Google pricing page via search; confirm on the official page).
- Policy page (**verified**): the API is "for map visualization only"; you may overlay your own 3D objects, but they can't be derived or traced from the tiles; the Google logo and per-tile copyright strings must be shown; caching and offline use are restricted; hybrid scenes must make clear which parts are Google data.
- Quality at eye level is unverified. Photogrammetry typically turns trees and people into blobs when viewed from head height. We found no ground-level camera example (NASA-AMMOS `3DTilesRendererJS` is the three.js renderer and has a Google example, but that example is for aerial views).
- Walking collision, sitting on the ground, and laying out blankets need our own ground surface, and we can't derive that from the tiles.

**Verdict:** poor fit for the walkable layer. Possible later for the bird's-eye picker only.

### Option B (recommended): stylized scene generated from OpenStreetMap
- **Verified:** an Overpass query over the Central Park bounding box (about 40.7644,-73.9818 to 40.8006,-73.9494) returned 16k tagged ways. The box includes surrounding Manhattan, so the park itself is a subset. Counts: 6,240 `highway=footway`, 268 `steps`, 135 `pedestrian`, 56 `path`, 319 `service`, 84 bridges, 242 gardens, 151 pitches, 52 playgrounds, 140 woods, 25 water bodies, plus about 8,000 surrounding buildings.
- Gaps to check: lawn and meadow polygons (Great Lawn, Sheep Meadow) are probably tagged `landuse=grass` or `natural=grassland`, which we didn't query. Tree points (`natural=tree`) weren't queried either; they'd drive tree placement.
- We would build a one-time script that converts OSM to a compact JSON/GeoJSON bundle, then generate ground, paths, water, bridges, trees, and perimeter buildings in three.js. It adds no per-user API cost and has no Google ToS limits. OSM data is ODbL, so attribution is required.
- NYC Open Data has Parks datasets, but our search found no clean per-feature Central Park layer, so OSM is the primary source.

### Entrances (R3)
Derive candidates from where footways cross the park boundary, then curate a named list by hand. We haven't listed the park's gates yet; do this against OSM and the Conservancy map, not from memory.

## 2. Realtime and presence

Search results were thin and mostly vendor or SEO pages, so treat these as leads.
- **Colyseus:** open source (MIT), room-based, automatic state sync, self-host free or managed cloud (a guide quoted about $15/month; unverified).
- **PartyKit / Cloudflare Durable Objects:** WebSocket rooms at the edge. Cloudflare official pricing: Workers Paid from $5/month; DO requests $0.15 per million after the first million, WebSocket messages count; duration $12.50 per million GB-s. A third-party blog claimed far higher costs and conflicts with the official numbers, so model our own traffic before choosing.
- **Supabase Realtime:** fine for presence and lobby, but not for authoritative movement state at tens of updates per second. We'd use Supabase for auth and Postgres.
- Cost driver to model: players per room x position updates per second x session length. Mitigate with 10 to 15 Hz updates, interpolation on the client, and interest management (only send nearby players).
- The HUD count (R10) is simply the number of connected sessions across rooms, which the server can broadcast.

## 3. Avatar and animation
- Quaternius Universal Animation Library: CC0, glTF, 120+ clips (**not confirmed** that it includes sit and lie-down; check before relying on it).
- Shyr "Base Character" (itch.io): low-poly, CC0, Mixamo-compatible. Mixamo clips carry Adobe's terms, so check them before redistributing.
- Kenney characters: CC0, basic clips.
- Customization approach: tint materials at runtime (skin color, shirt color, pants color) instead of swapping meshes. This is cheapest. Sit and lie-down clips may need to be sourced or authored separately.

## 4. Blanket rule design (R8, R9)
- Enforce on the **server**: a `blanket_grabs(user_id, day, count)` row keyed by the Los Angeles calendar date, with an atomic increment capped at 100. The client only displays the count.
- Midnight reset needs no cron job: the new date makes a new row.
- Laid-out blankets live in server room state (position, color, owner). "Get blanket back" removes it. On disconnect, remove the blanket after a timeout.

## 5. Which LLM for what
- Google Maps data isn't tied to Google's models. The tile and Overpass APIs are just HTTP calls, and any model can write that code.
- I haven't benchmarked models on this task, and the search results contained no useful model comparisons, so this is a judgment call, not a finding.
- Suggested split: one strong coding model for most of the code (the work is mostly three.js, networking, and a small data pipeline); a cheaper model for repetitive chores (renaming, boilerplate, test scaffolding); Gemini only if we want generated textures or concept art. No runtime LLM in v1, so there are no per-user model costs.

## 6. Main risks
1. **World fidelity vs effort:** OSM gives layout but not look. Mitigate by starting with flat stylized shapes and the owner's design guide.
2. **Realtime cost and scale:** unknown until we set a target concurrency.
3. **Sit/lie animations:** may not exist in the free packs.
4. **Nickname abuse:** a basic filter at minimum, because users are public to each other.
5. **Terms:** if Google tiles are used anywhere, follow the policy page above.

## Sources
- Google Map Tiles API policies: https://developers.google.com/maps/documentation/tile/policies
- Google 3D Tiles overview: https://developers.google.com/maps/documentation/tile/3d-tiles-overview
- Google Map Tiles usage and billing: https://developers.google.com/maps/documentation/tile/usage-and-billing
- 3DTilesRendererJS (NASA-AMMOS): https://github.com/NASA-AMMOS/3DTilesRendererJS
- osm2threejs: https://pypi.org/project/osm2threejs/
- Overpass (queried directly, 2026-11-01): https://overpass-api.de/api/interpreter
- Cloudflare Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing
- Quaternius Universal Animation Library and Shyr Base Character: found via https://app.cinevva.com/guides/free-character-animations-rigging (vendor guide, verify licenses at source)
