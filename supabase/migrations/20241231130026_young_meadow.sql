/*
      # Add increment points function

      1. New Functions
        - `increment_points`: Function to increment tournament participant points
          - Input: tournament_id (uuid), participant_id (uuid)
          - Updates points for the specified participant in the tournament
          - Returns the updated points value
    */

    CREATE OR REPLACE FUNCTION increment_points(
      tournament_id_param uuid,
      participant_id_param uuid
    )
    RETURNS integer
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      current_points integer;
    BEGIN
      UPDATE tournament_participants
      SET points = points + 1
      WHERE tournament_id = tournament_id_param
      AND participant_id = participant_id_param
      RETURNING points INTO current_points;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Participant not found in tournament';
      END IF;
      
      RETURN current_points;
    END;
    $$;
