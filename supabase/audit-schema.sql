-- PETITE MOOD - INVENTARIO SICURO DEL DATABASE
-- Sola lettura: non modifica o cancella alcun dato.

select
    n.nspname as schema_name,
    c.relname as object_name,
    case c.relkind
        when 'r' then 'table'
        when 'p' then 'partitioned table'
        when 'v' then 'view'
        when 'm' then 'materialized view'
        else c.relkind::text
    end as object_type,
    coalesce(s.n_live_tup, 0) as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s on s.relid = c.oid
where n.nspname in ('public', 'private')
  and c.relkind in ('r', 'p', 'v', 'm')
order by n.nspname, c.relname;

select
    table_schema,
    table_name,
    ordinal_position,
    column_name,
    data_type,
    is_nullable,
    column_default
from information_schema.columns
where table_schema in ('public', 'private')
order by table_schema, table_name, ordinal_position;

select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
order by n.nspname, p.proname, arguments;

select
    event_object_schema as schema_name,
    event_object_table as table_name,
    trigger_name,
    action_timing,
    event_manipulation
from information_schema.triggers
where event_object_schema in ('public', 'private')
order by event_object_schema, event_object_table, trigger_name;

select
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
from pg_policies
where schemaname in ('public', 'private')
order by schemaname, tablename, policyname;

