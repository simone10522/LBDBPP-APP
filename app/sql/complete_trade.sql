DROP FUNCTION IF EXISTS public.complete_trade(uuid);

CREATE OR REPLACE FUNCTION public.complete_trade(trade_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user1_id uuid;
  v_user2_id uuid;
  v_user1_card_id text;
  v_user2_card_id text;
  v_user1_card_rarity text;
  v_user2_card_rarity text;
BEGIN
  -- Recupera gli user ID e le carte coinvolte dallo scambio
  SELECT user1_id, user2_id,
         (user1_cards->0->>'id') AS v_user1_card_id,
         (user2_cards->0->>'id') AS v_user2_card_id,
         (user1_cards->0->>'rarity') AS v_user1_card_rarity,
         (user2_cards->0->>'rarity') AS v_user2_card_rarity
    INTO v_user1_id, v_user2_id, v_user1_card_id, v_user2_card_id, v_user1_card_rarity, v_user2_card_rarity
    FROM trade_matches
    WHERE id = trade_match_id;

  -- Decrementa o rimuove la carta scambiata da what_i_have di user1
  UPDATE trade_cards
  SET what_i_have = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM (
      SELECT
        CASE
          WHEN elem->>'id' = v_user1_card_id AND elem->>'rarity' = v_user1_card_rarity THEN
            CASE
              WHEN (elem->>'count')::int > 1 THEN jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
              ELSE NULL
            END
          ELSE elem
        END AS elem
      FROM jsonb_array_elements(what_i_have) AS elem
    ) sub
    WHERE elem IS NOT NULL
  )
  WHERE user_id = v_user1_id;

  -- Decrementa o rimuove la carta scambiata da what_i_have di user2
  UPDATE trade_cards
  SET what_i_have = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM (
      SELECT
        CASE
          WHEN elem->>'id' = v_user2_card_id AND elem->>'rarity' = v_user2_card_rarity THEN
            CASE
              WHEN (elem->>'count')::int > 1 THEN jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
              ELSE NULL
            END
          ELSE elem
        END AS elem
      FROM jsonb_array_elements(what_i_have) AS elem
    ) sub
    WHERE elem IS NOT NULL
  )
  WHERE user_id = v_user2_id;

  -- Decrementa o rimuove la carta scambiata da what_i_want di user1
  UPDATE trade_cards
  SET what_i_want = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM (
      SELECT
        CASE
          WHEN elem->>'id' = v_user2_card_id AND elem->>'rarity' = v_user2_card_rarity THEN
            CASE
              WHEN (elem->>'count')::int > 1 THEN jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
              ELSE NULL
            END
          ELSE elem
        END AS elem
      FROM jsonb_array_elements(what_i_want) AS elem
    ) sub
    WHERE elem IS NOT NULL
  )
  WHERE user_id = v_user1_id;

  -- Decrementa o rimuove la carta scambiata da what_i_want di user2
  UPDATE trade_cards
  SET what_i_want = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM (
      SELECT
        CASE
          WHEN elem->>'id' = v_user1_card_id AND elem->>'rarity' = v_user1_card_rarity THEN
            CASE
              WHEN (elem->>'count')::int > 1 THEN jsonb_set(elem, '{count}', to_jsonb((elem->>'count')::int - 1))
              ELSE NULL
            END
          ELSE elem
        END AS elem
      FROM jsonb_array_elements(what_i_want) AS elem
    ) sub
    WHERE elem IS NOT NULL
  )
  WHERE user_id = v_user2_id;

  RAISE NOTICE 'Trade completion finished and cards updated for users % and %', v_user1_id, v_user2_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.complete_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_trade(uuid) TO service_role;