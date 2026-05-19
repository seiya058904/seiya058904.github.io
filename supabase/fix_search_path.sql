-- Fix Security Advisor: Function Search Path Mutable
-- Explicitly set search_path so these trigger functions
-- cannot be exploited via schema manipulation.

create or replace function public.set_comments_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
