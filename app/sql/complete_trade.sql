DROP FUNCTION IF EXISTS public.complete_trade(uuid);

CREATE OR REPLACE FUNCTION public.complete_trade(trade_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user1_id uuid;
  v_user2_id uuid;
  -- For what_i_have update (inverted card IDs)
  v_user1_card_id text;
  v_user2_card_id text;
  -- For what_i_want update (direct card IDs)
  v_user1_want_card_id text;
  v_user2_want_card_id text;
BEGIN
  -- Recupera gli user ID e le carte dal trade match:
  SELECT user1_id, user2_id,
         (user2_cards->0->>'id') AS v_user1_card_id,  -- for what_i_have update: use card from user2_cards
         (user1_cards->0->>'id') AS v_user2_card_id,  -- for what_i_have update: use card from user1_cards
         (user1_cards->0->>'id') AS v_user1_want_card_id,  -- for what_i_want update: use card from user1_cards
         (user2_cards->0->>'id') AS v_user2_want_card_id   -- for what_i_want update: use card from user2_cards
  INTO v_user1_id, v_user2_id, v_user1_card_id, v_user2_card_id, v_user1_want_card_id, v_user2_want_card_id
  FROM trade_matches 
  WHERE id = trade_match_id;
  
  RAISE NOTICE 'Processing trade completion - User1: %, Card (have): %, Card (want): %, User2: %, Card (have): %, Card (want): %',
               v_user1_id, v_user1_card_id, v_user1_want_card_id, v_user2_id, v_user2_card_id, v_user2_want_card_id;
  
  -- Aggiorna "what_i_have" per user1: decrementa il count della carta v_user1_card_id; se il count è 1 la carta viene rimossa
  UPDATE trade_cards
  SET what_i_have = (
    SELECT jsonb_agg(updated_elem)
    FROM (
      SELECT 
        CASE 
          WHEN elem->>'id' = v_user1_card_id THEN
            CASE
              WHEN (elem->>'count')::int > 1 THEN
                jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
              ELSE NULL
            END
          ELSE elem
        END AS updated_elem
      FROM jsonb_array_elements(what_i_have) AS elem
    ) AS subquery
    WHERE updated_elem IS NOT NULL
  )
  WHERE user_id = v_user1_id;
  
  -- Aggiorna "what_i_have" per user2: decrementa il count della carta v_user2_card_id
  UPDATE trade_cards
  SET what_i_have = (
    SELECT jsonb_agg(updated_elem)
    FROM (
      SELECT 
        CASE 
          WHEN elem->>'id' = v_user2_card_id THEN
            CASE
              WHEN (elem->>'count')::int > 1 THEN
                jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
              ELSE NULL
            END
          ELSE elem
        END AS updated_elem
      FROM jsonb_array_elements(what_i_have) AS elem
    ) AS subquery
    WHERE updated_elem IS NOT NULL
  )
  WHERE user_id = v_user2_id;
  
  -- Aggiorna "what_i_want" per user1: decrementa il count della carta v_user1_want_card_id; se il count è 1 la carta viene rimossa
  UPDATE trade_cards
  SET what_i_want = (
    SELECT jsonb_agg(updated_elem)
    FROM (
      SELECT 
        CASE 
          WHEN elem->>'id' = v_user1_want_card_id THEN
            CASE
              WHEN (elem->>'count')::int > 1 THEN
                jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
              ELSE NULL
            END
          ELSE elem
        END AS updated_elem
      FROM jsonb_array_elements(what_i_want) AS elem
    ) AS subquery
    WHERE updated_elem IS NOT NULL
  )
  WHERE user_id = v_user1_id;
  
  -- Aggiorna "what_i_want" per user2: decrementa il count della carta v_user2_want_card_id
  UPDATE trade_cards
  SET what_i_want = (
    SELECT jsonb_agg(updated_elem)
    FROM (
      SELECT 
        CASE 
          WHEN elem->>'id' = v_user2_want_card_id THEN
            CASE
              WHEN (elem->>'count')::int > 1 THEN
                jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
              ELSE NULL
            END
          ELSE elem
        END AS updated_elem
      FROM jsonb_array_elements(what_i_want) AS elem
    ) AS subquery
    WHERE updated_elem IS NOT NULL
  )
  WHERE user_id = v_user2_id;
  
  -- Elimina il trade match
  DELETE FROM trade_matches WHERE id = trade_match_id;
  
  RAISE NOTICE 'Trade completion finished successfully';
END;
$function$;

-- Aggiungi i permessi necessari
GRANT EXECUTE ON FUNCTION public.complete_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_trade(uuid) TO service_role;
