CREATE OR REPLACE FUNCTION public.trigger_match_trades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Esegui la pulizia dei trade non validi solo per l'utente interessato
  PERFORM cleanup_invalid_trades();

  -- Esegui la logica per creare nuovi trade match (se necessario)
  PERFORM match_trades();

  -- Restituisci la riga modificata
  RETURN NEW;
END;
$function$;