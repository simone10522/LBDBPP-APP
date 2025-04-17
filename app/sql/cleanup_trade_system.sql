-- Rimuovi i trigger
DROP TRIGGER IF EXISTS trg_match_trades ON trade_cards;
DROP TRIGGER IF EXISTS update_trade_matches_updated_at ON trade_matches;

-- Rimuovi le funzioni
DROP FUNCTION IF EXISTS public.cleanup_invalid_trades();
DROP FUNCTION IF EXISTS public.complete_trade(uuid);
DROP FUNCTION IF EXISTS public.create_trade_match_transaction(uuid, uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.match_trades();
DROP FUNCTION IF EXISTS public.trigger_match_trades();

-- Log della pulizia
DO $$
BEGIN
  RAISE NOTICE 'Trade system cleaned up successfully';
END $$;
