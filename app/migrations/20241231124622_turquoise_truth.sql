/*
      # Add Profile Insert Policy

      1. Security Changes
        - Add RLS policy to allow users to insert their own profile during registration
    */

    CREATE POLICY "Users can insert their own profile"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
