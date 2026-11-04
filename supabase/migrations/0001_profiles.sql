-- One character profile per account. Run once in the Supabase SQL Editor.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 2 and 16),
  skin_color text not null check (skin_color ~ '^#[0-9a-fA-F]{6}$'),
  top_color  text not null check (top_color  ~ '^#[0-9a-fA-F]{6}$'),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each account can read and write only its own row.
create policy "profiles: read own"   on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles: update own" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
