/*
      # Round Robin Tournament Schema

      1. New Tables
        - `profiles`
          - `id` (uuid, primary key) - matches auth.users id
          - `username` (text, unique)
          - `created_at` (timestamp)
        - `tournaments`
          - `id` (uuid, primary key)
          - `name` (text)
          - `description` (text)
          - `created_by` (uuid, references profiles)
          - `status` (enum: 'draft', 'in_progress', 'completed')
          - `created_at` (timestamp)
        - `tournament_participants`
          - `tournament_id` (uuid, references tournaments)
          - `participant_id` (uuid, references profiles)
          - `points` (integer)
        - `matches`
          - `id` (uuid, primary key)
          - `tournament_id` (uuid, references tournaments)
          - `player1_id` (uuid, references profiles)
          - `player2_id` (uuid, references profiles)
          - `winner_id` (uuid, references profiles, nullable)
          - `round` (integer)
          - `status` (enum: 'scheduled', 'completed')
          - `played_at` (timestamp)

      2. Security
        - Enable RLS on all tables
        - Add policies for authenticated users
    */

    -- Create custom types
    CREATE TYPE tournament_status AS ENUM ('draft', 'in_progress', 'completed');
    CREATE TYPE match_status AS ENUM ('scheduled', 'completed');

    -- Create profiles table
    CREATE TABLE profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id),
      username text UNIQUE NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    -- Create tournaments table
    CREATE TABLE tournaments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      created_by uuid REFERENCES profiles(id) NOT NULL,
      status tournament_status DEFAULT 'draft',
      created_at timestamptz DEFAULT now()
    );

    -- Create tournament participants table
    CREATE TABLE tournament_participants (
      tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
      participant_id uuid REFERENCES profiles(id),
      points integer DEFAULT 0,
      PRIMARY KEY (tournament_id, participant_id)
    );

    -- Create matches table
    CREATE TABLE matches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
      player1_id uuid REFERENCES profiles(id),
      player2_id uuid REFERENCES profiles(id),
      winner_id uuid REFERENCES profiles(id),
      round integer NOT NULL,
      status match_status DEFAULT 'scheduled',
      played_at timestamptz,
      created_at timestamptz DEFAULT now()
    );

    -- Enable Row Level Security
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

    -- Profiles policies
    CREATE POLICY "Public profiles are viewable by everyone"
      ON profiles FOR SELECT
      USING (true);

    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id);

    -- Tournaments policies
    CREATE POLICY "Tournaments are viewable by everyone"
      ON tournaments FOR SELECT
      USING (true);

    CREATE POLICY "Authenticated users can create tournaments"
      ON tournaments FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = created_by);

    CREATE POLICY "Tournament creators can update their tournaments"
      ON tournaments FOR UPDATE
      USING (auth.uid() = created_by);

    -- Tournament participants policies
    CREATE POLICY "Tournament participants are viewable by everyone"
      ON tournament_participants FOR SELECT
      USING (true);

    CREATE POLICY "Tournament creators can manage participants"
      ON tournament_participants
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tournaments
          WHERE id = tournament_id
          AND created_by = auth.uid()
        )
      );

    -- Matches policies
    CREATE POLICY "Matches are viewable by everyone"
      ON matches FOR SELECT
      USING (true);

    CREATE POLICY "Tournament creators can manage matches"
      ON matches
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tournaments
          WHERE id = tournament_id
          AND created_by = auth.uid()
        )
      );
