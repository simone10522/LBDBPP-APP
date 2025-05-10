CREATE TABLE CardPack (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    genetic_apex JSONB DEFAULT '{"cards": []}',
    mythical_island JSONB DEFAULT '{"cards": []}',
    triumphant_light JSONB DEFAULT '{"cards": []}',
    space_time_smackdown JSONB DEFAULT '{"cards": []}',
    shining_revelry JSONB DEFAULT '{"cards": []}',
    promos_a_old JSONB DEFAULT '{"cards": []}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster user lookup
CREATE INDEX cardpack_user_id_idx ON CardPack(user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cardpack_updated_at
    BEFORE UPDATE ON CardPack
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE CardPack ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own card packs"
    ON CardPack FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own card packs"
    ON CardPack FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own card packs"
    ON CardPack FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own card packs"
    ON CardPack FOR DELETE
    USING (user_id = auth.uid());
