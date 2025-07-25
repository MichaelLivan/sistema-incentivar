/*
  # Add confirmed_by column to sessions table

  1. Schema Changes
    - Add `confirmed_by` column to `sessions` table
    - Column references `users` table to track who confirmed each session

  2. Purpose
    - Track which user confirmed each session for audit purposes
    - Required by the session confirmation functionality in the backend
*/

-- Add confirmed_by column to sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'confirmed_by'
  ) THEN
    ALTER TABLE sessions ADD COLUMN confirmed_by UUID REFERENCES users(id);
  END IF;
END $$;