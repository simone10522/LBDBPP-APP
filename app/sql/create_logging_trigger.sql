CREATE OR REPLACE FUNCTION log_trade_complete_debug() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trade_logs (trade_id, message)
  VALUES (
    NEW.id,
    jsonb_build_object(
      'event', TG_OP,
      'user1_id', NEW.user1_id,
      'user2_id', NEW.user2_id,
      'user1_cards', NEW.user1_cards,
      'user2_cards', NEW.user2_cards,
      'user_1_state', NEW.user_1,
      'user_2_state', NEW.user_2
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trade_complete_debug_trigger ON trade_matches;
CREATE TRIGGER trade_complete_debug_trigger
AFTER UPDATE OR DELETE ON trade_matches
FOR EACH ROW
EXECUTE FUNCTION log_trade_complete_debug();
