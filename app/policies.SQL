-- Policy per la SELECT su messages (solo utenti autenticati)
DROP POLICY IF EXISTS "Users can select messages where they are sender or receiver" ON public.messages;
CREATE POLICY "Users can select messages where they are sender or receiver"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING ((auth.uid()::uuid = sender_id) OR (auth.uid()::uuid = receiver_id));

-- Nuova policy per l'INSERT in messages
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::uuid = sender_id);

-- Policy per la SELECT su chat_settings (limitata al solo utente proprietario)
DROP POLICY IF EXISTS "Authenticated users can select chat settings" ON public.chat_settings;
CREATE POLICY "Authenticated users can select chat settings"
  ON public.chat_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::uuid);

-- Policy per l'inserimento dei tornei (creazione)
DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON public.tournaments;
CREATE POLICY "Authenticated users can create tournaments"
  ON public.tournaments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy per l'aggiornamento dei tornei (solo il creatore può aggiornare)
DROP POLICY IF EXISTS "Tournament creators can update their tournaments" ON public.tournaments;
CREATE POLICY "Tournament creators can update their tournaments"
  ON public.tournaments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy per la cancellazione dei tornei (solo il creatore può cancellare)
DROP POLICY IF EXISTS "Tournament creators can delete their tournaments" ON public.tournaments;
CREATE POLICY "Tournament creators can delete their tournaments"
  ON public.tournaments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy per l'inserimento in tournament_participants
DROP POLICY IF EXISTS "Authenticated users can add partecipants" ON public.tournament_participants;
CREATE POLICY "Authenticated users can add partecipants"
  ON public.tournament_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy per la SELECT su tournament_participants (visibile a tutti)
DROP POLICY IF EXISTS "Tournament participants are viewable by everyone" ON public.tournament_participants;
CREATE POLICY "Tournament participants are viewable by everyone"
  ON public.tournament_participants
  FOR SELECT
  TO public
  USING (true);

-- Policy per l'aggiornamento del deck (solo il partecipante può aggiornare il proprio deck)
DROP POLICY IF EXISTS "Participants can update their own deck" ON public.tournament_participants;
CREATE POLICY "Participants can update their own deck"
  ON public.tournament_participants
  FOR UPDATE
  TO authenticated
  USING (participant_id = auth.uid())
  WITH CHECK (participant_id = auth.uid());
