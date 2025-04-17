SELECT 
    trigger_name,
    event_manipulation as event,
    event_object_table as table_name,
    action_statement as definition
FROM information_schema.triggers
WHERE event_object_table = 'trade_matches'
ORDER BY trigger_name;
