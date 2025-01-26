DROP POLICY "Authenticated users can create tournaments" ON tournaments;

    CREATE POLICY "Authenticated users can create tournaments"
      ON tournaments FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = created_by);
