CREATE TABLE IF NOT EXISTS trade_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trade_id UUID,
  message JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funzione di logging standalone
CREATE OR REPLACE FUNCTION log_trade_event(trade_id UUID, message JSONB)
RETURNS void AS $$
BEGIN
  INSERT INTO trade_logs (trade_id, message)
  VALUES (trade_id, message);
END;
$$ LANGUAGE plpgsql;
