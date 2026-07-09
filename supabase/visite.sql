-- ============================================================
-- PETITE MOOD - CONTATORE VISITE SITO
-- Eseguire nel SQL Editor di Supabase.
-- ============================================================

create extension if not exists pgcrypto;

alter table public.site_stats
add column if not exists site_visit_count integer not null default 0;

create table if not exists public.site_visits (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    path text not null default '/',
    user_agent text
);

create index if not exists site_visits_created_at_idx
    on public.site_visits (created_at desc);

alter table public.site_visits enable row level security;
revoke all on public.site_visits from anon, authenticated;

grant select (
    instagram_followers,
    tiktok_followers,
    questionnaire_count,
    members_count,
    newsletter_count,
    site_visit_count,
    updated_at
) on public.site_stats to anon, authenticated;

create or replace function public.track_site_visit(
    p_path text default '/'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    safe_path text := left(coalesce(nullif(trim(p_path), ''), '/'), 300);
    new_total integer;
begin
    insert into public.site_visits (path)
    values (safe_path);

    insert into public.site_stats (id, site_visit_count, updated_at)
    values (1, 1, now())
    on conflict (id) do update
       set site_visit_count = public.site_stats.site_visit_count + 1,
           updated_at = now()
    returning site_visit_count into new_total;

    return jsonb_build_object('ok', true, 'site_visit_count', new_total);
end;
$$;

revoke all on function public.track_site_visit(text) from public;
grant execute on function public.track_site_visit(text) to anon, authenticated;

select 'Contatore visite Petite Mood configurato' as risultato;
