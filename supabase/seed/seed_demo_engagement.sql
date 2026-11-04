-- Demo data for the hackathon: 30 made-up visitors with profiles, visits and events.
-- Their emails end in @seed.chillspot.invalid, so they can be told apart (and deleted) later:
--   delete from auth.users where email like '%@seed.chillspot.invalid';  -- cascades to everything below
do $$
declare
  adj   text[] := array['Sleepy','Breezy','Mossy','Sunny','Cozy','Misty','Fuzzy','Gentle','Quiet','Lazy','Happy','Dusty','Rainy','Golden','Clever','Wobbly','Cheery','Sandy','Frosty','Humble','Jolly','Plucky','Snowy','Windy','Dreamy','Wild','Tiny','Brave','Mellow','Peachy'];
  noun  text[] := array['Otter','Fox','Heron','Acorn','Maple','Pebble','Willow','Clover','Fern','Daisy','Robin','Turtle','Owl','Cricket','Moss','Brook','Meadow','Ladybug','Firefly','Birch','Tulip','Badger','Rabbit','Falcon','Pond','Cloud','Petal','Thistle','Marmot','Sparrow'];
  skins text[] := array['#f6d9bf','#e8b98f','#d9a074','#b97f57','#8d5a3b','#5e3b26','#39ff14','#ff1493','#00b7ff','#bc13fe'];
  tops  text[] := array['#4a7fc1','#e4572e','#f2a541','#5aa469','#9b72cf','#e98fb0','#f5f1e8','#3b3f4a'];
  cols  text[] := array['#e4572e','#f2a541','#f6d55c','#5aa469','#3caea3','#4a7fc1','#9b72cf','#e98fb0'];
  lat0 constant double precision := 40.78234519881016;
  lon0 constant double precision := -73.96595165520367;
  gates_n int; i int; j int; k int; u uuid; s uuid;
  gate record; entered timestamptz; dur int; nbl int; blx real; blz real; sx real; sz real; t real;
  t_ev timestamptz; ev_len int; on_bl boolean; ex real; ez real; color text; lay_at timestamptz;
begin
  select count(*) into gates_n from public.gates;
  for i in 1..30 loop
    u := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
            format('seed%s@seed.chillspot.invalid', lpad(i::text, 2, '0')), now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into public.profiles (user_id, nickname, skin_color, top_color)
    values (u, adj[i] || noun[((i * 7) % 30) + 1], skins[1 + floor(random() * 10)::int], tops[1 + floor(random() * 8)::int]);

    for j in 1..(1 + floor(random() * 4)::int) loop            -- 1 to 4 visits in the last 5 days
      select * into gate from public.gates order by id offset floor(power(random(), 1.8) * gates_n)::int limit 1;
      dur := 60 + floor(random() * random() * 1500)::int;      -- 1 to 26 minutes, mostly short
      entered := now() - make_interval(days => floor(random() * 5)::int) - make_interval(mins => 30 + floor(random() * 600)::int);
      s := gen_random_uuid();
      nbl := case when random() < 0.55 then 1 + (random() < 0.2)::int else 0 end;
      insert into public.park_sessions (id, user_id, gate_id, entered_at, last_seen_at, left_at, active_s, walk_m, run_m, blankets_laid, max_others, near_others_s)
      values (s, u, gate.id, entered, entered + make_interval(secs => dur), entered + make_interval(secs => dur),
              floor(dur * (0.55 + 0.4 * random()))::int, dur * (0.2 + 0.7 * random()) * 0.8,
              case when random() < 0.4 then dur * random() * 0.4 else 0 end, nbl,
              floor(random() * 14)::int, floor(dur * random() * 0.4)::int);

      -- a spot a little way in from the gate, towards the middle of the park
      t := 0.08 + random() * 0.5;
      blx := gate.x * (1 - t) + (random() - 0.5) * 60; blz := gate.z * (1 - t) + (random() - 0.5) * 60;
      for k in 1..nbl loop
        color := cols[1 + floor(random() * 8)::int];
        lay_at := entered + make_interval(secs => floor(dur * (0.1 + 0.3 * random()))::int);
        insert into public.park_events (id, session_id, user_id, kind, x, z, lat, lon, started_at, ended_at, on_blanket, blanket_color)
        values (gen_random_uuid(), s, u, 'blanket_lay', blx, blz, lat0 - blz / 111320.0, lon0 + blx / (111320.0 * cos(radians(lat0))), lay_at, lay_at, false, color);
        if random() < 0.7 then
          t_ev := least(lay_at + make_interval(secs => 60 + floor(random() * 240)::int), entered + make_interval(secs => dur));
          insert into public.park_events (id, session_id, user_id, kind, x, z, lat, lon, started_at, ended_at, on_blanket, blanket_color)
          values (gen_random_uuid(), s, u, 'blanket_pickup', blx, blz, lat0 - blz / 111320.0, lon0 + blx / (111320.0 * cos(radians(lat0))), t_ev, t_ev, false, color);
        end if;
      end loop;

      for k in 1..(floor(random() * 3)::int + (random() < 0.25)::int) loop   -- 0 to 3 rests, a quarter of them lying down
        t_ev := entered + make_interval(secs => floor(dur * 0.8 * random())::int);
        ev_len := 20 + floor(random() * 340)::int;
        on_bl := nbl > 0 and random() < 0.6;
        if on_bl then ex := blx + (random() - 0.5); ez := blz + (random() - 0.5);
        else t := 0.05 + random() * 0.6; ex := gate.x * (1 - t) + (random() - 0.5) * 80; ez := gate.z * (1 - t) + (random() - 0.5) * 80; end if;
        insert into public.park_events (id, session_id, user_id, kind, x, z, lat, lon, started_at, ended_at, on_blanket)
        values (gen_random_uuid(), s, u, case when random() < 0.25 then 'lie' else 'sit' end::public.park_event_kind, ex, ez,
                lat0 - ez / 111320.0, lon0 + ex / (111320.0 * cos(radians(lat0))), t_ev,
                least(t_ev + make_interval(secs => ev_len), entered + make_interval(secs => dur)), on_bl);
      end loop;
    end loop;

    -- they signed up a few minutes before their first visit
    update public.profiles p set created_at = (select min(entered_at) - interval '3 minutes' from public.park_sessions where user_id = u) where p.user_id = u;
    update auth.users a set created_at = (select created_at from public.profiles where user_id = u) where a.id = u;
  end loop;
end $$;
