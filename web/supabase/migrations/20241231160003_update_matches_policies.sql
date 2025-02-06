/*
      # Update Matches Policies

      1. Security Changes
        - Update RLS policy to allow tournament participants to manage matches
    */

    DROP POLICY "Tournament creators can manage matches" ON matches;

    CREATE POLICY "Tournament participants can manage matches"
      ON matches
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tournament_participants
          WHERE tournament_id = tournament_id
          AND participant_id = auth.uid()
        )
      );
