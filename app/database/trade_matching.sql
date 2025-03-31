-- Creazione della funzione per effettuare il matching delle trade

CREATE OR REPLACE FUNCTION match_trades()
RETURNS void AS $$
DECLARE
  rec1 RECORD;
  rec2 RECORD;
  exists_match boolean;
  candidate_user1_cards jsonb;
  candidate_user2_cards jsonb;
BEGIN
  FOR rec1 IN SELECT * FROM trade_cards LOOP
    FOR rec2 IN SELECT * FROM trade_cards WHERE user_id > rec1.user_id LOOP
      -- Verifica match iniziale
      IF EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(rec1.what_i_want) AS w1,
             jsonb_array_elements(rec2.what_i_have) AS h2
        WHERE w1->>'id' = h2->>'id'
          AND w1->>'rarity' = h2->>'rarity'
          AND w1->>'language' = h2->>'language'
      )
      AND EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(rec2.what_i_want) AS w2,
             jsonb_array_elements(rec1.what_i_have) AS h1
        WHERE w2->>'id' = h1->>'id'
          AND w2->>'rarity' = h1->>'rarity'
          AND w2->>'language' = h1->>'language'
      ) THEN
          -- Calcola gli array delle carte per il trade candidato
          SELECT jsonb_agg(h2)
          INTO candidate_user1_cards
          FROM jsonb_array_elements(rec2.what_i_have) AS h2
          WHERE EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(rec1.what_i_want) AS w1
            WHERE w1->>'id' = h2->>'id'
              AND w1->>'rarity' = h2->>'rarity'
              AND w1->>'language' = h2->>'language'
          );

          SELECT jsonb_agg(h1)
          INTO candidate_user2_cards
          FROM jsonb_array_elements(rec1.what_i_have) AS h1
          WHERE EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(rec2.what_i_want) AS w2
            WHERE w2->>'id' = h1->>'id'
              AND w2->>'rarity' = h1->>'rarity'
              AND w2->>'language' = h1->>'language'
          );

          -- Verifica se esiste già un trade match simile
          SELECT EXISTS(
            SELECT 1 FROM trade_matches 
            WHERE (
              (user1_id = rec1.user_id AND user2_id = rec2.user_id AND 
               user1_cards @> candidate_user1_cards AND user2_cards @> candidate_user2_cards)
              OR 
              (user1_id = rec2.user_id AND user2_id = rec1.user_id AND 
               user1_cards @> candidate_user2_cards AND user2_cards @> candidate_user1_cards)
            )
            AND status IN ('pending', 'request sent', 'confirmed')
          ) INTO exists_match;
          
          -- Inserisci solo se non esiste un match simile
          IF NOT exists_match AND candidate_user1_cards IS NOT NULL AND candidate_user2_cards IS NOT NULL THEN
              INSERT INTO trade_matches(user1_id, user2_id, user1_cards, user2_cards, status)
              VALUES (
                rec1.user_id,
                rec2.user_id,
                candidate_user1_cards,
                candidate_user2_cards,
                'pending'
              );
          END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

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
  
  -- Delete the trade match record and log completion
  DELETE FROM trade_matches WHERE id = trade_match_id;
  RAISE NOTICE 'Trade match % completed and deleted successfully.', trade_match_id;
END;
$$ LANGUAGE plpgsql;
