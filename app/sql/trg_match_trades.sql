DROP TRIGGER IF EXISTS trg_match_trades ON trade_cards;

CREATE TRIGGER trg_match_trades
AFTER INSERT OR UPDATE ON trade_cards
FOR EACH ROW
EXECUTE FUNCTION public.trigger_match_trades();
