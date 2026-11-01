# Cost estimate (monthly, USD)

Date: 2026-11-01. Target: up to about 200 concurrent users in one shared world.

## Prices used
Verified on the vendors' pages today:
- Supabase: Free = $0, 50k MAU, 500 MB DB, pauses after 1 week of inactivity. Pro = from $25, 100k MAU, no pausing.
- Fly.io (US East): shared-cpu-1x 512MB $3.69, shared-cpu-1x 1GB $6.70, shared-cpu-2x 2GB $13.39, performance-1x 2GB $33.00. Outbound bandwidth $0.02/GB, no free allowance.
- Vercel: Hobby $0 but personal and non-commercial only; Pro $20 with 1 TB bandwidth.
- Colyseus Cloud: from $15 (specs per tier not published on the page); self-hosting the open-source version is free.

Cloudflare Pages (verified): free plan allows 500 builds/month, 20,000 files per site, 25 MiB per file; requests to static assets are free and unlimited. The page doesn't state bandwidth or commercial-use terms; check Cloudflare's plans page before launch.

Not checked (from memory, confirm before relying): the custom email (SMTP) provider's free tier of a few thousand emails per month, and a domain at about $12 per year.

## Bandwidth model (my estimate, to be confirmed by a load test)
Server sends each client a snapshot of the other players at 10 Hz. Assuming about 16 bytes per player per snapshot:
- Room with 200 players, everyone receives everyone: about 35 KB/s per client, roughly 126 MB per player-hour, about $0.0025 per player-hour.
- With interest management (only send players within view, about 30): about 19 MB per player-hour, roughly $0.0004.

## Scenarios
| | Dev / pre-launch | Launch (avg 20 online, peaks of 200) | Busy (avg 200 online, 24/7) |
|---|---|---|---|
| Supabase | $0 (free) | $25 (Pro) | $25 |
| Game server (Fly) | $4 to $7 | $13 to $33 | $33 (maybe 2 machines, about $66) |
| Server bandwidth | about $0 | $1 to $5 | $55 (with interest mgmt) to $360 (without) |
| Static client hosting (Cloudflare Pages) | $0 | $0 | $0 |
| Email (SMTP) + domain | $1 | $1 to $10 | $10 to $20 |
| **Total** | **about $5 to $10** | **about $40 to $75** | **about $130 to $480** |

"Busy" assumes 200 people online around the clock, which is far beyond what a new product sees. It is the ceiling for the one-world design, not the expected bill.

## What drives the cost
1. Server bandwidth, controlled by update rate and interest management. This is the biggest swing factor (about 6x), so build it in from the start.
2. Game server CPU. A single 2 GB shared machine is probably enough for 200 simple avatars at 10 Hz, but that is unmeasured. M6 includes a load test.
3. Supabase Pro is the fixed floor once real users arrive; the free plan pauses after a week of inactivity.

## Not included
Design assets, developer time, App Store or other fees, moderation tooling, and Google tiles (not used in the recommended design).

## Sharding later
More servers multiply the Fly line roughly linearly (about $13 to $33 per extra machine); Supabase stays shared.
