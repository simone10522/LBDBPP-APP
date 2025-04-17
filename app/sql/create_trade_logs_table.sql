-- Crea una tabella per i log
CREATE TABLE IF NOT EXISTS trade_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trade_id UUID,
    action TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funzione per inserire i log
CREATE OR REPLACE FUNCTION log_trade_action(
    p_trade_id UUID,
    p_action TEXT,
    p_details JSONB
)
RETURNS void AS $$
BEGIN
    INSERT INTO trade_logs (trade_id, action, details)
    VALUES (p_trade_id, p_action, p_details);
END;
$$ LANGUAGE plpgsql;
