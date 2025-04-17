-- Tabella per le richieste di scambio (trade_matches)
CREATE TABLE trade_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES profiles(id) NOT NULL,
    user2_id UUID REFERENCES profiles(id) NOT NULL,
    user1_cards JSONB NOT NULL,  -- Carte offerte dall'utente 1 (formato: [{id: '...', count: 1, rarity: '...'}, ...])
    user2_cards JSONB NOT NULL,  -- Carte offerte dall'utente 2 (formato: [{id: '...', count: 1, rarity: '...'}, ...])
    status TEXT CHECK (status IN ('pending', 'matched', 'confirmed', 'rejected', 'completed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per migliorare le prestazioni delle query
CREATE INDEX idx_trade_matches_user1_id ON trade_matches (user1_id);
CREATE INDEX idx_trade_matches_user2_id ON trade_matches (user2_id);
CREATE INDEX idx_trade_matches_status ON trade_matches (status);
CREATE INDEX idx_trade_matches_user1_cards ON trade_matches USING GIN (user1_cards); -- Indice GIN per la ricerca JSONB
CREATE INDEX idx_trade_matches_user2_cards ON trade_matches USING GIN (user2_cards); -- Indice GIN per la ricerca JSONB

-- Funzione per verificare la corrispondenza di rarità (da usare nella logica di abbinamento)
-- Questa funzione è un'utility, non una stored procedure.  La logica principale sarà nella Edge Function.
CREATE OR REPLACE FUNCTION check_rarity_match(card1 JSONB, card2 JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica che entrambe le carte abbiano la chiave 'rarity' e che i valori corrispondano.
    RETURN card1->>'rarity' = card2->>'rarity';
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Funzione di trigger per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trade_matches_updated_at
BEFORE UPDATE ON trade_matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Abilita Row Level Security (RLS)
ALTER TABLE trade_matches ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo i match che li riguardano
CREATE POLICY "Users can see their own trade matches"
ON trade_matches FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Policy per permettere agli utenti di creare richieste di scambio (ma la logica di abbinamento sarà gestita dalla Edge Function)
CREATE POLICY "Users can create trade match requests"
ON trade_matches FOR INSERT
WITH CHECK (auth.uid() = user1_id);

-- Policy per permettere agli utenti di aggiornare lo stato dei propri match (es. confermare o rifiutare)
CREATE POLICY "Users can update their own trade matches"
ON trade_matches FOR UPDATE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Policy per impedire agli utenti di eliminare le richieste di scambio (opzionale)
-- CREATE POLICY "Users cannot delete trade matches"
-- ON trade_matches FOR DELETE
-- USING (false);


