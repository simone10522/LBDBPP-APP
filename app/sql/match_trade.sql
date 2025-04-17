-- Create the function
CREATE OR REPLACE FUNCTION public.match_trades()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
      )
      AND EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(rec2.what_i_want) AS w2,
             jsonb_array_elements(rec1.what_i_have) AS h1
        WHERE w2->>'id' = h1->>'id'
          AND w2->>'rarity' = h1->>'rarity'
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
          );

          SELECT jsonb_agg(h1)
          INTO candidate_user2_cards
          FROM jsonb_array_elements(rec1.what_i_have) AS h1
          WHERE EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(rec2.what_i_want) AS w2
            WHERE w2->>'id' = h1->>'id'
              AND w2->>'rarity' = h1->>'rarity'
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
  
  RETURN NEW;
END;
$function$;