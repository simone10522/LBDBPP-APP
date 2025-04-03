-- Supabase function for SUBSEQUENT rounds (one at a time)
CREATE OR REPLACE FUNCTION generate_next_round_matches(tournament_id_param uuid, previous_round_number integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    participants_cursor CURSOR FOR
        SELECT tp.participant_id, tp.points
        FROM tournament_participants tp
        WHERE tp.tournament_id = tournament_id_param
        ORDER BY tp.points DESC; -- Order by points (descending)
    participant1_record RECORD;
    participant2_record RECORD;
    paired_participants uuid[] := '{}'; -- Array to track already paired participants
    has_met BOOLEAN;
BEGIN
    OPEN participants_cursor;
    LOOP
        FETCH participants_cursor INTO participant1_record;
        EXIT WHEN NOT FOUND; -- Exit when no more participants to pair

        -- Skip if participant1 has already been paired
        IF participant1_record.participant_id = ANY(paired_participants) THEN
            CONTINUE;
        END IF;

        -- Find an opponent not already paired and with a similar score
        LOOP
            FETCH participants_cursor INTO participant2_record;
            EXIT WHEN NOT FOUND;

            -- Skip if participant2 has already been paired
            IF participant2_record.participant_id = ANY(paired_participants) THEN
                CONTINUE;
            END IF;

            -- Check if participant1 and participant2 have already played against each other
            SELECT EXISTS (
                SELECT 1
                FROM matches
                WHERE tournament_id = tournament_id_param
                AND (
                    (player1_id = participant1_record.participant_id AND player2_id = participant2_record.participant_id)
                    OR (player1_id = participant2_record.participant_id AND player2_id = participant1_record.participant_id)
                )
            ) INTO has_met;

            -- If they haven't met, pair them
            IF NOT has_met THEN
                -- Pair participant1 and participant2
                INSERT INTO matches (tournament_id, player1_id, player2_id, round)
                VALUES (tournament_id_param, participant1_record.participant_id, participant2_record.participant_id, previous_round_number + 1);

                -- Add both participants to the list of paired participants
                paired_participants := array_append(paired_participants, participant1_record.participant_id);
                paired_participants := array_append(paired_participants, participant2_record.participant_id);
                EXIT; -- Exit the inner loop after finding a valid match
            END IF;
        END LOOP;
    END LOOP;
    CLOSE participants_cursor;
    -- Handle bye rounds (odd number of participants) - Optional, but good practice
    IF array_length(paired_participants, 1) < (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = tournament_id_param) THEN
        -- Logic to handle a bye round (e.g., give a win to the unpaired player, or just skip them)
        -- For simplicity, we are not adding a specific bye round logic here.
    END IF;
END;
$$;
