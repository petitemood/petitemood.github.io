-- PETITE MOOD - eventi PWA anonimi
-- Eseguire una sola volta nel SQL Editor di Supabase.

create extension if not exists pgcrypto;

create table if not exists public.pwa_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'install_button_shown', 'install_button_clicked', 'install_accepted',
    'install_dismissed', 'install_confirmed', 'pwa_first_open', 'pwa_open',
    'questionnaire_started_from_pwa', 'questionnaire_completed_from_pwa'
  )),
  session_id uuid not null,
  device_type text not null check (device_type in ('android', 'ios', 'desktop')),
  browser text not null check (browser in ('chrome', 'samsung_internet', 'edge', 'safari', 'other')),
  is_standalone boolean not null default false,
  page_path text not null check (char_length(page_path) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists pwa_events_created_at_idx on public.pwa_events (created_at desc);
create index if not exists pwa_events_type_idx on public.pwa_events (event_type, created_at desc);
create index if not exists pwa_events_session_idx on public.pwa_events (session_id, created_at desc);

alter table public.pwa_events enable row level security;
revoke all on public.pwa_events from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (event_type, session_id, device_type, browser, is_standalone, page_path)
  on public.pwa_events to anon, authenticated;

drop policy if exists "public_can_insert_allowed_pwa_events" on public.pwa_events;
create policy "public_can_insert_allowed_pwa_events"
on public.pwa_events for insert to anon, authenticated
with check (
  event_type in (
    'install_button_shown', 'install_button_clicked', 'install_accepted',
    'install_dismissed', 'install_confirmed', 'pwa_first_open', 'pwa_open',
    'questionnaire_started_from_pwa', 'questionnaire_completed_from_pwa'
  )
  and char_length(page_path) between 1 and 300
);

-- Nessuna policy SELECT/UPDATE/DELETE: il frontend può solo inserire.

-- Query statistiche da eseguire nel pannello Supabase (non pubbliche):
-- Installazioni Android confermate
select count(*) as installazioni_android_confermate
from public.pwa_events where event_type = 'install_confirmed' and device_type = 'android';

-- Prime aperture, aperture totali, utenti attivi e questionari completati dalla PWA
select
  count(*) filter (where event_type = 'pwa_first_open') as prime_aperture_pwa,
  count(*) filter (where event_type in ('pwa_first_open', 'pwa_open')) as aperture_totali_pwa,
  count(distinct session_id) filter (
    where event_type in ('pwa_first_open', 'pwa_open') and created_at >= now() - interval '30 days'
  ) as utenti_pwa_attivi_30_giorni,
  count(*) filter (where event_type = 'questionnaire_completed_from_pwa') as questionari_completati_pwa
from public.pwa_events;
