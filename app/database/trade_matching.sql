-- Funzione trigger per chiamare match_trades() dopo inserimenti o aggiornamenti su trade_cards
CREATE OR REPLACE FUNCTION trigger_match_trades()
RETURNS trigger AS $$
BEGIN
  PERFORM match_trades();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Creazione del trigger sulla tabella trade_cards
DROP TRIGGER IF EXISTS trg_match_trades ON trade_cards;
CREATE TRIGGER trg_match_trades
AFTER INSERT OR UPDATE ON trade_cards
FOR EACH ROW
EXECUTE FUNCTION trigger_match_trades();

-- Remove the old complete_trade function that accepts an integer:
DROP FUNCTION IF EXISTS complete_trade(integer);

-- New function: complete_trade (parameter type changed to uuid) with added logs
CREATE OR REPLACE FUNCTION complete_trade(trade_match_id uuid)
RETURNS void AS $$
DECLARE
  tm RECORD;
BEGIN
  -- Retrieve the trade match record
  SELECT * INTO tm FROM trade_matches WHERE id = trade_match_id;
  IF tm IS NULL THEN
    RAISE NOTICE 'Trade match % not found', trade_match_id;
    RETURN;
  END IF;
  
  -- Log starting update for user1
  RAISE NOTICE 'Starting complete_trade for trade_match %, updating user1 trade_cards for card id %', trade_match_id, tm.user1_cards->0->>'id';
  WITH updated AS (
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'id' = tm.user1_cards->0->>'id' THEN 
          CASE WHEN (elem->>'count')::int > 1 
               THEN jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
               ELSE NULL 
          END
        ELSE elem
      END
    ) AS new_array
    FROM jsonb_array_elements((SELECT what_i_have FROM trade_cards WHERE user_id = tm.user1_id)) AS elem
  )
  UPDATE trade_cards
  SET what_i_have = (
    SELECT jsonb_agg(x.value)
    FROM (
      SELECT value
      FROM jsonb_array_elements((SELECT new_array FROM updated)) AS x
      WHERE x.value IS NOT NULL
    ) AS x
  )
  WHERE user_id = tm.user1_id;
  RAISE NOTICE 'User1 trade_cards updated for card id %', tm.user1_cards->0->>'id';
  
  -- Aggiorna anche what_i_want per user1
  UPDATE trade_cards
  SET what_i_want = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(what_i_want) AS elem
    WHERE NOT (
      elem->>'id' = tm.user2_cards->0->>'id'
      AND elem->>'rarity' = tm.user2_cards->0->>'rarity'
    )
  )
  WHERE user_id = tm.user1_id;

  -- Log starting update for user2
  RAISE NOTICE 'Starting update for user2 trade_cards for card id %', tm.user2_cards->0->>'id';
  WITH updated2 AS (
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'id' = tm.user2_cards->0->>'id' THEN 
          CASE WHEN (elem->>'count')::int > 1 
               THEN jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
               ELSE NULL 
          END
        ELSE elem
      END
    ) AS new_array
    FROM jsonb_array_elements((SELECT what_i_have FROM trade_cards WHERE user_id = tm.user2_id)) AS elem
  )
  UPDATE trade_cards
  SET what_i_have = (
    SELECT jsonb_agg(x.value)
    FROM (
      SELECT value
      FROM jsonb_array_elements((SELECT new_array FROM updated2)) AS x
      WHERE x.value IS NOT NULL
    ) AS x
  )
  WHERE user_id = tm.user2_id;
  RAISE NOTICE 'User2 trade_cards updated for card id %', tm.user2_cards->0->>'id';
  
  -- Aggiorna anche what_i_want per user2
  UPDATE trade_cards
  SET what_i_want = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(what_i_want) AS elem
    WHERE NOT (
      elem->>'id' = tm.user1_cards->0->>'id'
      AND elem->>'rarity' = tm.user1_cards->0->>'rarity'
    )
  )
  WHERE user_id = tm.user2_id;

  -- Delete the trade match record and log completion
  DELETE FROM trade_matches WHERE id = trade_match_id;
  RAISE NOTICE 'Trade match % completed and deleted successfully.', trade_match_id;
END;
$$ LANGUAGE plpgsql;
