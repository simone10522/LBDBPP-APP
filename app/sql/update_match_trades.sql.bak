CREATE OR REPLACE FUNCTION public.match_trades()
RETURNS void
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
      -- Prima verifica se uno dei due utenti ha già un trade in stato completed
      IF EXISTS (
        SELECT 1 FROM trade_matches 
        WHERE ((user1_id = rec1.user_id OR user2_id = rec1.user_id)
           OR (user1_id = rec2.user_id OR user2_id = rec2.user_id))
        AND (user_1 = 'completed' OR user_2 = 'completed')
      ) THEN
        CONTINUE;
      END IF;

      -- ... resto del codice della funzione rimane invariato ...
    END LOOP;
  END LOOP;
END;
$function$;
