-- ============================================================
-- PETITE MOOD - DASHBOARD PRIVATA NEL SQL EDITOR DI SUPABASE
-- Eseguire dopo setup.sql.
-- Queste viste non sono esposte pubblicamente dal sito.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace view private.dashboard_summary as
select
    (select count(*) from public.questionario) as questionari,
    (select count(*) from public.questionario where join_members) as petite_members,
    (select count(*) from public.newsletter_subscribers where active) as newsletter,
    (select round(avg(height_cm), 1) from public.questionario) as altezza_media_cm,
    (select round(avg(shopping_difficulty), 1) from public.questionario) as difficolta_media,
    (select round(avg(purchase_intent), 1) from public.questionario) as interesse_acquisto_medio;

create or replace view private.product_demand as
select
    product as prodotto,
    count(*) as preferenze
from public.questionario,
     unnest(desired_products) as product
group by product
order by preferenze desc;

create or replace view private.fit_problems as
select
    problem as problema,
    count(*) as segnalazioni
from public.questionario,
     unnest(problem_areas) as problem
group by problem
order by segnalazioni desc;

create or replace view private.preferred_styles as
select
    style as stile,
    count(*) as preferenze
from public.questionario,
     unnest(style_preferences) as style
group by style
order by preferenze desc;

create or replace view private.height_distribution as
select
    case
        when height_cm <= 145 then '130-145 cm'
        when height_cm <= 150 then '146-150 cm'
        when height_cm <= 155 then '151-155 cm'
        else '156-165 cm'
    end as fascia_altezza,
    count(*) as risposte
from public.questionario
group by 1
order by 1;

-- RISULTATI RAPIDI

select * from private.dashboard_summary;
select * from private.product_demand;
select * from private.fit_problems;
select * from private.preferred_styles;
select * from private.height_distribution;
