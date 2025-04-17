-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_trade_matches_updated_at ON trade_matches;

-- Create the trigger
CREATE TRIGGER update_trade_matches_updated_at
    BEFORE UPDATE
    ON trade_matches
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_updated_at_column();
