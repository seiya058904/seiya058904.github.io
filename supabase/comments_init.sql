-- Comments table for seiya058904.github.io.
-- Run this in the SQL Editor of the existing Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  content text not null,
  status text not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_item_id_format check (item_id ~ '^[a-z0-9-]+$'),
  constraint comments_content_length check (char_length(btrim(content)) between 1 and 500),
  constraint comments_status_allowed check (status in ('visible', 'hidden', 'deleted'))
);

create index if not exists comments_item_created_idx
  on public.comments (item_id, created_at desc);

create index if not exists comments_user_id_idx
  on public.comments (user_id);

create index if not exists comments_status_idx
  on public.comments (status);

create or replace function public.set_comments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists comments_set_updated_at on public.comments;

create trigger comments_set_updated_at
before update on public.comments
for each row
execute function public.set_comments_updated_at();

alter table public.comments enable row level security;

drop policy if exists "Anyone can read visible comments" on public.comments;
create policy "Anyone can read visible comments"
on public.comments
for select
to anon, authenticated
using (status = 'visible');

drop policy if exists "Authenticated users can insert their own comments" on public.comments;
create policy "Authenticated users can insert their own comments"
on public.comments
for insert
to authenticated
with check ((select auth.uid()) = user_id);

grant select on table public.comments to anon, authenticated;
grant insert on table public.comments to authenticated;
grant select, insert, update, delete on table public.comments to service_role;
