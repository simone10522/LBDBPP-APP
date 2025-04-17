SELECT 
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing,
    string_agg(event_manipulation, ',') AS events,
    action_statement AS definition
FROM information_schema.triggers
GROUP BY 1,2,3,4,6
ORDER BY table_name, trigger_name;
