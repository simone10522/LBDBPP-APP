-- Function to cleanup invalid trades
CREATE OR REPLACE FUNCTION public.cleanup_invalid_trades()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  trade_match RECORD;
  user1_have_valid BOOLEAN;
  user2_have_valid BOOLEAN;
  user1_want_valid BOOLEAN;
  user2_want_valid BOOLEAN;
BEGIN
  -- Scansiona tutti i trade matches attivi
  FOR trade_match IN SELECT * FROM trade_matches WHERE status IN ('pending', 'request sent', 'confirmed') LOOP
    
    -- Controlla se le carte che il primo utente offre sono ancora nella sua lista "what_i_have"
    SELECT EXISTS (
      SELECT 1 
      FROM trade_cards tc, 
           jsonb_array_elements(tc.what_i_have) AS user_card,
           jsonb_array_elements(trade_match.user1_cards) AS trade_card
      WHERE tc.user_id = trade_match.user1_id
        AND user_card->>'id' = trade_card->>'id'
        AND user_card->>'rarity' = trade_card->>'rarity'
    ) INTO user1_have_valid;
    
    -- Controlla se le carte che il secondo utente offre sono ancora nella sua lista "what_i_have"
    SELECT EXISTS (
      SELECT 1 
      FROM trade_cards tc, 
           jsonb_array_elements(tc.what_i_have) AS user_card,
           jsonb_array_elements(trade_match.user2_cards) AS trade_card
      WHERE tc.user_id = trade_match.user2_id
        AND user_card->>'id' = trade_card->>'id'
        AND user_card->>'rarity' = trade_card->>'rarity'
    ) INTO user2_have_valid;
    
    -- Controlla se le carte che il primo utente riceve sono ancora nella sua lista "what_i_want"
    SELECT EXISTS (
      SELECT 1 
      FROM trade_cards tc, 
           jsonb_array_elements(tc.what_i_want) AS user_want,
           jsonb_array_elements(trade_match.user2_cards) AS trade_card
      WHERE tc.user_id = trade_match.user1_id
        AND user_want->>'id' = trade_card->>'id'
        AND user_want->>'rarity' = trade_card->>'rarity'
    ) INTO user1_want_valid;
    
    -- Controlla se le carte che il secondo utente riceve sono ancora nella sua lista "what_i_want"
    SELECT EXISTS (
      SELECT 1 
      FROM trade_cards tc, 
           jsonb_array_elements(tc.what_i_want) AS user_want,
           jsonb_array_elements(trade_match.user1_cards) AS trade_card
      WHERE tc.user_id = trade_match.user2_id
        AND user_want->>'id' = trade_card->>'id'
        AND user_want->>'rarity' = trade_card->>'rarity'
    ) INTO user2_want_valid;
    
    -- Se una delle condizioni non è più valida, rimuovi il trade
    IF NOT user1_have_valid OR NOT user2_have_valid OR NOT user1_want_valid OR NOT user2_want_valid THEN
      RAISE NOTICE 'Removing invalid trade match % (user1_have: %, user2_have: %, user1_want: %, user2_want: %)', 
        trade_match.id, user1_have_valid, user2_have_valid, user1_want_valid, user2_want_valid;
      
      IF trade_match.id IS NOT NULL THEN
         DELETE FROM trade_matches WHERE id = trade_match.id;
      END IF;
    END IF;
  END LOOP;
END;
$function$;
