CREATE OR REPLACE FUNCTION generate_Robin_tournament_matches(tournament_id_param uuid)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      participants_arr uuid[];
      num_participants integer;
      num_rounds integer;
      i integer;
      j integer;
      player1_id uuid;
      player2_id uuid;
    BEGIN
      -- Get all participants for the tournament
      SELECT array_agg(participant_id) INTO participants_arr
      FROM tournament_participants
      WHERE tournament_id = tournament_id_param;

      -- Get the number of participants
      num_participants := array_length(participants_arr, 1);

      -- If there are less than 2 participants, exit
      IF num_participants < 2 THEN
        RETURN;
      END IF;

      -- Calculate the number of rounds
      num_rounds := num_participants - 1;
      IF num_participants % 2 <> 0 THEN
        num_rounds := num_participants;
      END IF;

      -- Generate matches for each round
      FOR i IN 1..num_rounds LOOP
        FOR j IN 1..(num_participants / 2) LOOP
          -- Calculate player indices
          player1_id := participants_arr[j];
          player2_id := participants_arr[num_participants - j + 1];

          -- Insert the match
          IF player1_id IS NOT NULL AND player2_id IS NOT NULL THEN
            INSERT INTO matches (tournament_id, player1_id, player2_id, round)
            VALUES (tournament_id_param, player1_id, player2_id, i);
          END IF;
        END LOOP;

        -- Rotate the participants array for the next round
        participants_arr := array_append(participants_arr[2:array_length(participants_arr, 1)], participants_arr[1]);
      END LOOP;
    END;
    $$;
