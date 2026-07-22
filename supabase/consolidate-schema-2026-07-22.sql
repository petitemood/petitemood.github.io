-- PETITE MOOD - CONSOLIDAMENTO DEFINITIVO DELLO SCHEMA
-- Verificato il 22/07/2026 sul progetto sortfvzxjcxuvhexkqeg.

begin;

-- La tabella inglese era un duplicato storico. La rimuoviamo soltanto se vuota.
do $$
declare
    legacy_rows bigint;
begin
    if to_regclass('public.questionnaire_responses') is not null then
        execute 'select count(*) from public.questionnaire_responses' into legacy_rows;
        if legacy_rows > 0 then
            raise exception 'Migrazione interrotta: questionnaire_responses contiene % righe', legacy_rows;
        end if;

        -- CASCADE rimuove soltanto le vecchie viste private dipendenti;
        -- finalize-italian-schema.sql le ricrea con nomi italiani.
        drop table public.questionnaire_responses cascade;
    end if;
end;
$$;

-- Rimuove il vecchio trigger incrementale: il trigger ufficiale ricalcola i totali reali.
drop trigger if exists trigger_update_questionnaire_count on public.questionario;
drop trigger if exists trg_update_questionnaire_count on public.questionario;
drop function if exists public.update_questionnaire_count();

-- Mantiene una sola policy, con un nome chiaro, per il questionario.
drop policy if exists "consenti inserimento questionario" on public.questionario;
drop policy if exists "public_can_submit_questionnaire" on public.questionario;
create policy "questionario_inserimento_pubblico"
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

-- Mantiene una sola policy di lettura pubblica per i contatori.
drop policy if exists "Allow public read site_stats" on public.site_stats;
drop policy if exists "public_can_read_site_stats" on public.site_stats;
create policy "contatori_lettura_pubblica"
on public.site_stats
for select
to anon, authenticated
using (true);

-- Distingue le iscrizioni provenienti dalla versione inglese.
alter table public.newsletter_subscribers
    drop constraint if exists newsletter_subscribers_source_check;
alter table public.newsletter_subscribers
    add constraint newsletter_subscribers_source_check
    check (source in (
        'website_newsletter',
        'website_newsletter_en',
        'website_questionnaire'
    ));

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
        when p_source in (
            'website_newsletter',
            'website_newsletter_en',
            'website_questionnaire'
        ) then p_source
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

-- Riallinea i contatori ai dati realmente presenti.
select public.refresh_site_stats();

-- Il totale visite deve corrispondere al registro dettagliato.
update public.site_stats
set site_visit_count = (select count(*) from public.site_visits),
    updated_at = now()
where id = 1;

commit;

-- VERIFICA FINALE
select
    to_regclass('public.questionario') as tabella_questionari,
    to_regclass('public.questionnaire_responses') as duplicato_rimosso,
    (select count(*) from public.questionario) as questionari_reali,
    (select count(*) from public.questionario where join_members) as membri_reali,
    (select count(*) from public.newsletter_subscribers where active) as iscritti_newsletter,
    (select count(*) from public.site_visits) as visite_registrate,
    (select questionnaire_count from public.site_stats where id = 1) as contatore_questionari,
    (select members_count from public.site_stats where id = 1) as contatore_membri,
    (select newsletter_count from public.site_stats where id = 1) as contatore_newsletter,
    (select site_visit_count from public.site_stats where id = 1) as contatore_visite;
