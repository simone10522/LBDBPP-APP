-- Aggiorna la funzione trigger_match_trades per usare SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.trigger_match_trades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Prima pulisci i trade non più validi
  PERFORM cleanup_invalid_trades();
  -- Poi crea nuovi trade match
  PERFORM match_trades();
  RETURN NEW;
END;
$function$;

-- Ricrea il trigger
DROP TRIGGER IF EXISTS trigger_match_trades ON trade_cards;
CREATE TRIGGER trigger_match_trades
  AFTER INSERT OR UPDATE OR DELETE
  ON trade_cards
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_match_trades();
