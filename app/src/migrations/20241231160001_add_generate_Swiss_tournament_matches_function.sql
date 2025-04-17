-- Supabase function for the FIRST round ONLY
CREATE OR REPLACE FUNCTION generate_tournament_matches(tournament_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    participants_arr uuid[];
    num_participants integer;
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

    -- Randomize the participants array
    SELECT array_agg(pid ORDER BY random()) INTO participants_arr
    FROM unnest(participants_arr) AS pid;

    -- Generate matches for the first round
    FOR j IN 1..(num_participants / 2) LOOP
        -- Calculate player indices
        player1_id := participants_arr[j];
        player2_id := participants_arr[num_participants - j + 1];

        -- Insert the match
        IF player1_id IS NOT NULL AND player2_id IS NOT NULL THEN
            INSERT INTO matches (tournament_id, player1_id, player2_id, round)
            VALUES (tournament_id_param, player1_id, player2_id, 1);
        END IF;
    END LOOP;
END;
$$;
