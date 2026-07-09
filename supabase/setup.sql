-- ============================================================
-- PETITE MOOD - DATABASE SUPABASE
-- Tabella questionario reale usata dal sito: public.questionario
-- Eseguire nel SQL Editor di Supabase.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- QUESTIONARI

create table if not exists public.questionario (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    height_cm smallint not null check (height_cm between 130 and 165),
    age_range text not null check (age_range in (
        'under_18', '18_24', '25_34', '35_44', '45_54', '55_plus'
    )),
    region text,
    body_proportion text check (
        body_proportion is null or body_proportion in ('balanced', 'long_torso', 'long_legs')
    ),
    top_size text,
    bottom_size text,
    shopping_difficulty smallint not null check (shopping_difficulty between 1 and 5),
    problem_areas text[] not null check (cardinality(problem_areas) between 1 and 8),
    difficult_products text[] not null check (cardinality(difficult_products) between 1 and 6),
    alterations_frequency text,
    alterations_cost text,
    preferred_fits text[] not null default '{}',
    desired_products text[] not null check (cardinality(desired_products) between 1 and 6),
    style_preferences text[] not null default '{}',
    preferred_colors text check (char_length(preferred_colors) <= 150),
    budget_trousers text,
    purchase_intent smallint not null check (purchase_intent between 1 and 5),
    discovery_channels text[] not null default '{}',
    feedback text check (char_length(feedback) <= 1000),
    first_name text check (char_length(first_name) <= 80),
    email citext check (
        email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    ),
    join_members boolean not null default false,
    newsletter_consent boolean not null default false,
    privacy_consent boolean not null check (privacy_consent = true),
    source text not null default 'website_questionnaire' check (
        source in ('website_questionnaire')
    ),
    constraint email_required_for_contact check (
        (not join_members and not newsletter_consent) or email is not null
    )
);

create index if not exists questionario_created_at_idx
    on public.questionario (created_at desc);

create index if not exists questionario_member_email_idx
    on public.questionario (email)
    where join_members = true and email is not null;

alter table public.questionario enable row level security;

drop policy if exists "public_can_submit_questionnaire" on public.questionario;

create policy "public_can_submit_questionnaire"
on public.questionario
for insert
to anon, authenticated
with check (
    privacy_consent = true
    and height_cm between 130 and 165
    and shopping_difficulty between 1 and 5
    and purchase_intent between 1 and 5
    and cardinality(problem_areas) between 1 and 8
    and cardinality(difficult_products) between 1 and 6
    and cardinality(desired_products) between 1 and 6
);

revoke all on public.questionario from anon, authenticated;

grant insert (
    height_cm, age_range, region, body_proportion, top_size, bottom_size,
    shopping_difficulty, problem_areas, difficult_products,
    alterations_frequency, alterations_cost, preferred_fits, desired_products,
    style_preferences, preferred_colors, budget_trousers, purchase_intent,
    discovery_channels, feedback, first_name, email, join_members,
    newsletter_consent, privacy_consent, source
) on public.questionario to anon, authenticated;

-- CONTATORI PUBBLICI

create table if not exists public.site_stats (
    id integer primary key default 1 check (id = 1),
    instagram_followers integer not null default 0,
    tiktok_followers integer not null default 0,
    questionnaire_count integer not null default 0,
    members_count integer not null default 0,
    newsletter_count integer not null default 0,
    site_visit_count integer not null default 0,
    updated_at timestamptz not null default now()
);

alter table public.site_stats
add column if not exists instagram_followers integer not null default 0,
add column if not exists tiktok_followers integer not null default 0,
add column if not exists questionnaire_count integer not null default 0,
add column if not exists members_count integer not null default 0,
add column if not exists newsletter_count integer not null default 0,
add column if not exists site_visit_count integer not null default 0,
add column if not exists updated_at timestamptz not null default now();

insert into public.site_stats (id)
values (1)
on conflict (id) do nothing;

alter table public.site_stats enable row level security;

drop policy if exists "public_can_read_site_stats" on public.site_stats;

create policy "public_can_read_site_stats"
on public.site_stats
for select
to anon, authenticated
using (true);

grant select (
    instagram_followers,
    tiktok_followers,
    questionnaire_count,
    members_count,
    newsletter_count,
    site_visit_count,
    updated_at
) on public.site_stats to anon, authenticated;

-- VISITE SITO

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

-- NEWSLETTER

create table if not exists public.newsletter_subscribers (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    email citext not null unique check (
        email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    ),
    consent_at timestamptz not null default now(),
    source text not null default 'website_newsletter' check (
        source in ('website_newsletter', 'website_questionnaire')
    ),
    active boolean not null default true
);

alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;

create or replace function public.refresh_site_stats()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    update public.site_stats
    set
        questionnaire_count = (select count(*) from public.questionario),
        members_count = (
            select count(*)
            from public.questionario
            where join_members = true
        ),
        newsletter_count = (
            select count(*)
            from public.newsletter_subscribers
            where active = true
        ),
        updated_at = now()
    where id = 1;
end;
$$;

create or replace function public.subscribe_newsletter(
    p_email text,
    p_source text default 'website_newsletter'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    normalized_email citext := lower(trim(p_email));
    safe_source text := case
        when p_source in ('website_newsletter', 'website_questionnaire') then p_source
        else 'website_newsletter'
    end;
begin
    if normalized_email is null
       or normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
        raise exception 'invalid_email';
    end if;

    insert into public.newsletter_subscribers (email, source, consent_at, active)
    values (normalized_email, safe_source, now(), true)
    on conflict (email) do update
       set active = true,
           consent_at = now(),
           updated_at = now(),
           source = excluded.source;

    perform public.refresh_site_stats();

    return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.subscribe_newsletter(text, text) from public;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;

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

-- Se nel questionario viene dato il consenso newsletter, l'iscrizione e' automatica.

create or replace function public.questionario_after_insert_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if new.newsletter_consent = true and new.email is not null then
        perform public.subscribe_newsletter(new.email::text, 'website_questionnaire');
    else
        perform public.refresh_site_stats();
    end if;

    return new;
end;
$$;

do $$
begin
    if to_regclass('public.questionnaire_responses') is not null then
        drop trigger if exists questionnaire_newsletter_sync_trigger
            on public.questionnaire_responses;
    end if;
end;
$$;

drop trigger if exists questionnaire_newsletter_sync_trigger
    on public.questionario;

drop trigger if exists trg_update_questionnaire_count
    on public.questionario;

create trigger questionario_after_insert_sync_trigger
after insert on public.questionario
for each row execute function public.questionario_after_insert_sync();

-- Evita confusione se in passato era stata usata la tabella inglese.
do $$
begin
    if to_regclass('public.questionnaire_responses') is not null then
        drop trigger if exists trg_update_questionnaire_count
            on public.questionnaire_responses;
    end if;
end;
$$;

-- Riallineamento immediato dei dati esistenti.
select public.refresh_site_stats();

-- VERIFICA FINALE
select
    'Petite Mood database configurato' as risultato,
    count(*) filter (where tablename = 'questionario') as tabella_questionari,
    count(*) filter (where tablename = 'site_stats') as tabella_contatori,
    count(*) filter (where tablename = 'newsletter_subscribers') as tabella_newsletter
from pg_tables
where schemaname = 'public';
