create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 2 and 24),
  constraint profiles_display_name_allowed_chars check (btrim(display_name) ~ '^[一-龥A-Za-z0-9 _-]+$'),
  constraint profiles_display_name_no_angle_brackets check (display_name !~ '[<>]'),
  constraint profiles_display_name_not_numeric check (btrim(display_name) !~ '^[0-9]+$')
);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Anyone can read public profiles" on public.profiles;
create policy "Anyone can read public profiles"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can insert their own profile" on public.profiles;
create policy "Authenticated users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Authenticated users can update their own profile" on public.profiles;
create policy "Authenticated users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

grant select (id, display_name) on table public.profiles to anon, authenticated;
grant insert (id, display_name), update (display_name) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;
