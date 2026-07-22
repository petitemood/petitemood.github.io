begin;

-- Descrizioni italiane visibili nel pannello Supabase.
comment on table public.questionario is 'Risposte al questionario Petite Mood';
comment on table public.site_stats is 'Contatori e statistiche pubbliche del sito';
comment on table public.site_visits is 'Registro dettagliato delle visite al sito';
comment on table public.newsletter_subscribers is 'Iscritte alla newsletter Petite Mood';
comment on table public.pwa_events is 'Eventi anonimi dell app Petite Mood';

-- Policy uniche e comprensibili.
drop policy if exists "consenti inserimento questionario" on public.questionario;
drop policy if exists "public_can_submit_questionnaire" on public.questionario;
drop policy if exists "questionario_inserimento_pubblico" on public.questionario;
create policy "inserimento_pubblico_questionario"
on public.questionario for insert to anon, authenticated
with check (
    privacy_consent = true
    and height_cm between 130 and 165
    and shopping_difficulty between 1 and 5
    and purchase_intent between 1 and 5
    and cardinality(problem_areas) between 1 and 8
    and cardinality(difficult_products) between 1 and 6
    and cardinality(desired_products) between 1 and 6
);

drop policy if exists "Allow public read site_stats" on public.site_stats;
drop policy if exists "public_can_read_site_stats" on public.site_stats;
drop policy if exists "contatori_lettura_pubblica" on public.site_stats;
create policy "lettura_pubblica_contatori"
on public.site_stats for select to anon, authenticated using (true);

-- Dashboard privata con nomi italiani.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace view private.riepilogo_generale as
select
    (select count(*) from public.questionario) as questionari,
    (select count(*) from public.questionario where join_members) as membri,
    (select count(*) from public.newsletter_subscribers where active) as newsletter,
    (select site_visit_count from public.site_stats where id = 1) as visite_sito;

create or replace view private.prodotti_richiesti as
select p.prodotto, count(*) as preferenze
from public.questionario
cross join lateral unnest(desired_products) as p(prodotto)
group by p.prodotto order by preferenze desc;

create or replace view private.problemi_vestibilita as
select p.problema, count(*) as segnalazioni
from public.questionario
cross join lateral unnest(problem_areas) as p(problema)
group by p.problema order by segnalazioni desc;

create or replace view private.stili_preferiti as
select s.stile, count(*) as preferenze
from public.questionario
cross join lateral unnest(style_preferences) as s(stile)
group by s.stile order by preferenze desc;

create or replace view private.distribuzione_altezze as
select case
    when height_cm <= 145 then '130-145 cm'
    when height_cm <= 150 then '146-150 cm'
    when height_cm <= 155 then '151-155 cm'
    else '156-165 cm'
end as fascia_altezza, count(*) as risposte
from public.questionario group by 1 order by 1;

create or replace view private.visite_per_pagina as
select path as pagina, count(*) as visite, max(created_at) as ultima_visita
from public.site_visits group by path order by visite desc, ultima_visita desc;

select public.refresh_site_stats();
update public.site_stats
set site_visit_count = (select count(*) from public.site_visits), updated_at = now()
where id = 1;

commit;

select
    (select count(*) from public.questionario) as questionari_reali,
    (select questionnaire_count from public.site_stats where id = 1) as contatore_questionari,
    (select count(*) from public.questionario where join_members) as membri_reali,
    (select members_count from public.site_stats where id = 1) as contatore_membri,
    (select count(*) from public.site_visits) as visite_reali,
    (select site_visit_count from public.site_stats where id = 1) as contatore_visite;
