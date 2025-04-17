SELECT 
    tgname AS trigger_name,
    relname AS table_name,
    proname AS function_name,
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS timing,
    CASE 
        WHEN tgtype & 4 = 4 THEN 'FOR EACH ROW'
        ELSE 'FOR EACH STATEMENT'
    END AS level,
    CASE 
        WHEN tgtype & 8 = 8 THEN 'INSERT'
        WHEN tgtype & 16 = 16 THEN 'DELETE'
        WHEN tgtype & 32 = 32 THEN 'UPDATE'
    END AS event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
ORDER BY relname, tgname;
