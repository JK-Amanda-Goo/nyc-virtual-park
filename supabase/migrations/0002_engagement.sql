-- Engagement data: who enters the park, where, for how long, and what they do there.
-- Run once in the Supabase SQL Editor (after 0001_profiles.sql).

alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- The 20 real gates, used to keep the "chosen entrance" column honest (same ids as park.json).
create table if not exists public.gates (
  id       text primary key,
  name     text not null unique,
  x        real not null,
  z        real not null,
  lat      double precision not null check (lat between 40.70 and 40.90),
  lon      double precision not null check (lon between -74.10 and -73.80),
  source   text not null,
  verified boolean not null
);
alter table public.gates enable row level security;
create policy "gates: read" on public.gates for select to authenticated using (true);

insert into public.gates (id, name, x, z, lat, lon, source, verified) values
  ('g0', 'Scholars'' Gate', -565.6, 1925.1, 40.7650518, -73.9726617, 'conservancy-streets', true),
  ('g1', 'Artists'' Gate', -855.8, 1834.2, 40.7658684, -73.9761046, 'conservancy-streets', true),
  ('g2', 'Artisans'' Gate', -1094.2, 1700.5, 40.7670694, -73.9789329, 'conservancy-streets', true),
  ('g3', 'Merchants'' Gate', -1287.2, 1558.8, 40.7683423, -73.9812225, 'conservancy-pin', false),
  ('g4', 'Women''s Gate', -829.8, 688.9, 40.7761567, -73.9757961, 'conservancy-streets', true),
  ('g5', 'Hunters'' Gate', -472.3, 41.9, 40.7819688, -73.9715549, 'conservancy-streets', true),
  ('g6', 'Mariners'' Gate', -313.7, -245.3, 40.7845488, -73.9696733, 'conservancy-streets', true),
  ('g7', 'Gate of All Saints', 120.3, -1030.8, 40.7916050, -73.9645245, 'conservancy-streets', true),
  ('g8', 'Boys'' Gate', 275.8, -1312.5, 40.7941355, -73.9626797, 'conservancy-streets', true),
  ('g9', 'Strangers'' Gate', 512.1, -1740.2, 40.7979776, -73.9598763, 'conservancy-streets', true),
  ('g10', 'Warriors'' Gate', 883.1, -1889, 40.7993143, -73.9554749, 'conservancy-streets', true),
  ('g11', 'Farmers'' Gate', 1111, -1760.8, 40.7981627, -73.9527711, 'conservancy-pin', false),
  ('g12', 'Pioneers'' Gate', 1353.6, -1600.2, 40.7967200, -73.9498930, 'conservancy-pin', true),
  ('g13', 'Girls'' Gate', 1080.2, -1051, 40.7917864, -73.9531365, 'conservancy-streets', true),
  ('g14', 'Engineers'' Gate', 610.2, -201.2, 40.7841526, -73.9587125, 'conservancy-streets', true),
  ('g15', 'Miners'' Gate', 173.8, 588.1, 40.7770622, -73.9638898, 'conservancy-streets', true),
  ('g16', 'Children''s Gate', 53.9, 804.9, 40.7751147, -73.9653122, 'conservancy-streets', true),
  ('g17', 'Inventors'' Gate', -105.5, 1093.2, 40.7725249, -73.9672033, 'conservancy-streets', true),
  ('g18', 'Woodman''s Gate', 845.1, -625.8, 40.7879668, -73.9559257, 'conservancy-streets', true),
  ('g19', 'Gate of the Exonerated', 1264.4, -1685.9, 40.7974898, -73.9509513, 'conservancy-pin', false)
on conflict (id) do nothing;

-- One row per visit: from entering the park to leaving it.
create table if not exists public.park_sessions (
  id            uuid primary key, -- made by the client, so a retried request cannot create a second visit
  user_id       uuid not null references auth.users (id) on delete cascade,
  gate_id       text not null references public.gates (id),
  entered_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(), -- heartbeat; the end of a visit whose tab was just closed
  left_at       timestamptz,
  active_s      integer not null default 0 check (active_s >= 0),          -- seconds with real input
  walk_m        double precision not null default 0 check (walk_m >= 0),
  run_m         double precision not null default 0 check (run_m >= 0),
  steps         integer generated always as (round((walk_m + run_m) / 0.75)::integer) stored, -- distance / 0.75 m stride
  blankets_laid integer not null default 0 check (blankets_laid >= 0),
  max_others    integer not null default 0 check (max_others >= 0),        -- most other people in the park at once
  near_others_s integer not null default 0 check (near_others_s >= 0),     -- seconds within 20 m of someone
  check (last_seen_at >= entered_at),
  check (left_at is null or left_at >= entered_at)
);
create index if not exists park_sessions_user_entered on public.park_sessions (user_id, entered_at desc);
alter table public.park_sessions enable row level security;
create policy "park_sessions: read own" on public.park_sessions for select to authenticated using (auth.uid() = user_id);

-- Things that happen inside a visit: sitting, lying down, laying out or taking back a blanket.
do $$ begin
  create type public.park_event_kind as enum ('sit', 'lie', 'blanket_lay', 'blanket_pickup');
exception when duplicate_object then null; end $$;

create table if not exists public.park_events (
  id            uuid primary key,
  session_id    uuid not null references public.park_sessions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  kind          public.park_event_kind not null,
  x             real not null check (x between -1700 and 1700),   -- game metres, east of the park centre
  z             real not null check (z between -2400 and 2400),   -- game metres, south of the park centre
  lat           double precision not null,                        -- the same spot on the real map
  lon           double precision not null,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  on_blanket    boolean not null default false,
  blanket_color text check (blanket_color is null or blanket_color ~ '^#[0-9a-fA-F]{6}$'),
  check (ended_at is null or ended_at >= started_at)
);
create index if not exists park_events_session on public.park_events (session_id);
alter table public.park_events enable row level security;
create policy "park_events: read own" on public.park_events for select to authenticated using (auth.uid() = user_id);

-- The app writes only through these functions: they use the signed-in account and the server clock.
create or replace function public.start_session(p_id uuid, p_gate text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  -- A visit whose tab was closed never said goodbye: its last heartbeat is when it ended.
  update park_sessions set left_at = last_seen_at where user_id = auth.uid() and left_at is null and id <> p_id;
  insert into park_sessions (id, user_id, gate_id) values (p_id, auth.uid(), p_gate) on conflict (id) do nothing;
end $$;

-- Counters arrive as running totals, so repeating or reordering a request cannot make them go down.
create or replace function public.ping_session(
  p_id uuid, p_active integer, p_walk double precision, p_run double precision,
  p_blankets integer, p_max_others integer, p_near integer, p_end boolean default false
) returns void language plpgsql security definer set search_path = public as $$
begin
  update park_sessions set
    last_seen_at  = now(),
    active_s      = greatest(active_s, p_active),
    walk_m        = greatest(walk_m, p_walk),
    run_m         = greatest(run_m, p_run),
    blankets_laid = greatest(blankets_laid, p_blankets),
    max_others    = greatest(max_others, p_max_others),
    near_others_s = greatest(near_others_s, p_near),
    left_at       = case when p_end then now() else left_at end
  where id = p_id and user_id = auth.uid();
end $$;

-- Called when an event starts (p_end = false) and again when it ends (p_end = true).
create or replace function public.log_event(
  p_id uuid, p_session uuid, p_kind public.park_event_kind, p_x real, p_z real,
  p_on_blanket boolean, p_color text, p_end boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare
  lat0 constant double precision := 40.78234519881016;
  lon0 constant double precision := -73.96595165520367;
begin
  insert into park_events (id, session_id, user_id, kind, x, z, lat, lon, on_blanket, blanket_color, ended_at)
  select p_id, s.id, auth.uid(), p_kind, p_x, p_z,
         lat0 - p_z / 111320.0, lon0 + p_x / (111320.0 * cos(radians(lat0))),
         p_on_blanket, p_color, case when p_end then now() end
  from park_sessions s where s.id = p_session and s.user_id = auth.uid()
  on conflict (id) do update set ended_at = case when p_end then now() else park_events.ended_at end
    where park_events.user_id = auth.uid();
end $$;

revoke execute on function public.start_session, public.ping_session, public.log_event from public, anon;
grant execute on function public.start_session, public.ping_session, public.log_event to authenticated;

-- The numbers the builder watches. Views for the dashboard only, not exposed to the app.
create or replace view public.daily_engagement as
select s.user_id, p.nickname,
       (s.entered_at at time zone 'America/Los_Angeles')::date as la_day,
       count(*)                                                    as visits,
       round(sum(extract(epoch from coalesce(s.left_at, s.last_seen_at) - s.entered_at)) / 60.0, 1) as minutes_in_park,
       round(sum(s.active_s) / 60.0, 1)                            as active_minutes,
       sum(s.steps)                                                as steps,
       count(*) filter (where s.blankets_laid > 0)                 as visits_with_blanket
from public.park_sessions s left join public.profiles p using (user_id)
group by s.user_id, p.nickname, la_day;

create or replace view public.engagement_summary as
select la_day,
       count(distinct user_id)                                     as visitors,
       sum(visits)                                                 as visits,
       round(avg(minutes_in_park), 1)                              as avg_minutes_per_visitor,
       round(100.0 * sum(visits_with_blanket) / nullif(sum(visits), 0), 1) as pct_visits_with_blanket,
       round(avg(steps))                                           as avg_steps_per_visitor
from public.daily_engagement group by la_day order by la_day desc;

create or replace view public.gate_popularity as
select g.name, g.verified, count(s.id) as visits
from public.gates g left join public.park_sessions s on s.gate_id = g.id
group by g.id, g.name, g.verified order by visits desc;

revoke all on public.daily_engagement, public.engagement_summary, public.gate_popularity from anon, authenticated;
