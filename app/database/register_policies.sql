-- Aggiorna la policy per l'inserimento del profilo per permettere la registrazione
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."profiles";
CREATE POLICY "Users can insert their own profile"
ON "public"."profiles"
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Aggiungi policy per l'aggiornamento del push token
DROP POLICY IF EXISTS "Users can update their push token" ON "public"."profiles";
CREATE POLICY "Users can update their push token"
ON "public"."profiles"
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    AND (
        -- Permetti solo l'aggiornamento del push_token e dei campi del profilo
        (xmax = 0) OR 
        (OLD.* IS DISTINCT FROM NEW.* AND NEW.id = OLD.id)
    )
);
