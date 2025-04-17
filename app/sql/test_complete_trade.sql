DO $$
DECLARE
  test_trade_id uuid := 'your-trade-id-here';  -- sostituisci con un ID trade reale
BEGIN
  RAISE NOTICE 'Starting test of complete_trade';
  PERFORM complete_trade(test_trade_id);
  RAISE NOTICE 'Test completed';
END;
$$;
