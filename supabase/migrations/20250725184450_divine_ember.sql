/*
  # Add confirmed_by column to sessions table

  1. Changes
    - Add `confirmed_by` column to `sessions` table to track who confirmed each session
    - Column references users table and is nullable (for existing sessions)

  2. Security
    - No RLS changes needed as this is just adding a tracking column
*/

-- Add confirmed_by column to sessions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'confirmed_by'
  ) THEN
    ALTER TABLE sessions ADD COLUMN confirmed_by UUID REFERENCES users(id);
  END IF;
END $$;