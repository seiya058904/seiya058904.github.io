-- Harden an already-deployed comments table. Run manually in Supabase SQL Editor.

revoke all on table public.comments from anon, authenticated;

drop policy if exists "Authenticated users can insert their own comments" on public.comments;

grant select (id, item_id, user_id, content, status, created_at)
  on table public.comments to anon, authenticated;
grant select, insert, update, delete on table public.comments to service_role;
