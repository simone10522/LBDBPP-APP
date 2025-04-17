-- Lista di tutte le functions nel database
SELECT 
    n.nspname as "Schema",
    p.proname as "Name",
    CASE 
        WHEN p.prokind = 'a' THEN pg_get_function_arguments(p.oid)
        ELSE pg_get_function_arguments(p.oid)
    END as "Arguments",
    t.typname as "Return type",
    CASE p.prokind 
        WHEN 'f' THEN 'normal function'
        WHEN 'p' THEN 'procedure'
        WHEN 'a' THEN 'aggregate function'
        WHEN 'w' THEN 'window function'
    END as "Type",
    CASE 
        WHEN p.provolatile = 'i' THEN 'immutable'
        WHEN p.provolatile = 's' THEN 'stable'
        WHEN p.provolatile = 'v' THEN 'volatile'
    END as "Volatility",
    CASE 
        WHEN p.prosecdef THEN 'security definer'
        ELSE 'security invoker'
    END as "Security",
    CASE 
        WHEN p.prokind = 'a' THEN 'Aggregate function - definition not available'
        ELSE pg_get_functiondef(p.oid)
    END as "Definition"
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_type t ON p.prorettype = t.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND n.nspname = 'public'  -- Filtra solo le funzioni nello schema public
ORDER BY n.nspname, p.proname;
