-- Add garmin_user_id column to store Garmin's user identifier
ALTER TABLE garmin_tokens ADD COLUMN IF NOT EXISTS garmin_user_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_garmin_tokens_garmin_user_id ON garmin_tokens(garmin_user_id);