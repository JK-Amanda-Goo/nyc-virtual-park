-- updated_at used to come from the browser clock while created_at comes from the server clock,
-- so a new profile could end up "updated" a few milliseconds before it was "created".
-- The server now stamps updated_at itself, on every insert and update.
create or replace function public.profiles_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.profiles_touch();

-- repair rows already affected
update public.profiles set created_at = updated_at where updated_at < created_at;
