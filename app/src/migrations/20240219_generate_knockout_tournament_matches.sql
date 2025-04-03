-- Funzione per generare gli accoppiamenti di un torneo knockout
CREATE OR REPLACE FUNCTION generate_knockout_tournament_matches(tournament_id_param UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    total_participants INTEGER;
    participants_array UUID[];
    match_pwd TEXT;
BEGIN
    -- Ottieni il numero totale di partecipanti e i loro ID in ordine casuale
    SELECT ARRAY(
        SELECT participant_id
        FROM tournament_participants
        WHERE tournament_id = tournament_id_param
        ORDER BY random()
    ) INTO participants_array;
    
    total_participants := array_length(participants_array, 1);
    
    -- Crea i match per il primo round
    FOR i IN 1..total_participants BY 2 LOOP
        -- Genera una password casuale alfanumerica di 10 caratteri
        match_pwd := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
        
        -- Se c'è un partecipante successivo, crea un match completo
        IF i + 1 <= total_participants THEN
            INSERT INTO matches (
                tournament_id,
                player1_id,
                player2_id,
                round,
                status,
                match_password
            ) VALUES (
                tournament_id_param,
                participants_array[i],
                participants_array[i + 1],
                1,
                'scheduled',
                match_pwd
            );
        -- Se non c'è un partecipante successivo, crea un bye
        ELSE
            INSERT INTO matches (
                tournament_id,
                player1_id,
                round,
                status,
                match_password
            ) VALUES (
                tournament_id_param,
                participants_array[i],
                1,
                'scheduled',
                match_pwd
            );
        END IF;
    END LOOP;
END;
$$;

-- Funzione per generare il prossimo round del torneo knockout
CREATE OR REPLACE FUNCTION generate_next_knockout_round(tournament_id_param UUID, previous_round_number INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    winners_array UUID[];
    match_pwd TEXT;
BEGIN
    -- Seleziona i vincitori del round precedente
    SELECT ARRAY(
        SELECT winner_id
        FROM matches
        WHERE tournament_id = tournament_id_param 
        AND round = previous_round_number
        AND winner_id IS NOT NULL
        ORDER BY random()
    ) INTO winners_array;

    -- Se non ci sono vincitori, esci
    IF array_length(winners_array, 1) IS NULL THEN
        RETURN;
    END IF;

    -- Crea i match per il prossimo round
    FOR i IN 1..array_length(winners_array, 1) BY 2 LOOP
        -- Genera una password casuale alfanumerica di 10 caratteri
        match_pwd := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
        
        -- Se c'è un altro vincitore per completare il match
        IF i + 1 <= array_length(winners_array, 1) THEN
            INSERT INTO matches (
                tournament_id,
                player1_id,
                player2_id,
                round,
                status,
                match_password
            ) VALUES (
                tournament_id_param,
                winners_array[i],
                winners_array[i + 1],
                previous_round_number + 1,
                'scheduled',
                match_pwd
            );
        -- Se rimane un vincitore senza avversario (bye)
        ELSE
            INSERT INTO matches (
                tournament_id,
                player1_id,
                round,
                status,
                match_password
            ) VALUES (
                tournament_id_param,
                winners_array[i],
                previous_round_number + 1,
                'scheduled',
                match_pwd
            );
        END IF;
    END LOOP;
END;
$$;
