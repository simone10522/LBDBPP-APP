-- Creazione della funzione per effettuare il matching delle trade

CREATE OR REPLACE FUNCTION match_trades()
RETURNS void AS $$
DECLARE
  rec1 RECORD;
  rec2 RECORD;
  w1 jsonb;
  h2 jsonb;
  w2 jsonb;
  h1 jsonb;
  exists_match boolean;
  candidate_user1_cards jsonb;
  candidate_user2_cards jsonb;
BEGIN
  -- Clean up any stale matches
  DELETE FROM trade_matches WHERE status = 'pending' OR status = 'request sent';

  FOR rec1 IN SELECT * FROM trade_cards LOOP
    FOR rec2 IN SELECT * FROM trade_cards WHERE user_id > rec1.user_id LOOP
      -- Cicla su tutte le carte che rec1 vuole e rec2 ha
      FOR w1 IN SELECT * FROM jsonb_array_elements(rec1.what_i_want) LOOP
        FOR h2 IN SELECT * FROM jsonb_array_elements(rec2.what_i_have) LOOP
          IF w1->>'id' = h2->>'id' AND w1->>'rarity' = h2->>'rarity' AND (w1->>'count')::int <= (h2->>'count')::int THEN
            -- Cicla su tutte le carte che rec2 vuole e rec1 ha
            FOR w2 IN SELECT * FROM jsonb_array_elements(rec2.what_i_want) LOOP
              FOR h1 IN SELECT * FROM jsonb_array_elements(rec1.what_i_have) LOOP
                IF w2->>'id' = h1->>'id' AND w2->>'rarity' = h1->>'rarity' AND (w2->>'count')::int <= (h1->>'count')::int THEN
                  -- Crea il match solo tra carte con id diverso ma stessa rarità
                  IF (h1->>'id') <> (h2->>'id') AND (h1->>'rarity') = (h2->>'rarity') THEN
                    SELECT EXISTS(
                      SELECT 1 FROM trade_matches 
                      WHERE (
                        (user1_id = rec1.user_id AND user2_id = rec2.user_id AND 
                         user1_cards @> to_jsonb(array[h1]) AND user2_cards @> to_jsonb(array[h2]))
                        OR 
                        (user1_id = rec2.user_id AND user2_id = rec1.user_id AND 
                         user1_cards @> to_jsonb(array[h2]) AND user2_cards @> to_jsonb(array[h1]))
                      )
                      AND status IN ('pending', 'request sent', 'confirmed')
                    ) INTO exists_match;

                    IF NOT exists_match THEN
                      INSERT INTO trade_matches(user1_id, user2_id, user1_cards, user2_cards, status)
                      VALUES (
                        rec1.user_id,
                        rec2.user_id,
                        to_jsonb(array[h1]),
                        to_jsonb(array[h2]),
                        'pending'
                      );
                      RAISE NOTICE 'Created new trade match between users % and %', rec1.user_id, rec2.user_id;
                    END IF;
                  END IF;
                END IF;
              END LOOP;
            END LOOP;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;