-- Phase 1: Clean up existing Garmin tables and functions

-- Drop old tables
DROP TABLE IF EXISTS encrypted_garmin_tokens CASCADE;
DROP TABLE IF EXISTS secure_garmin_tokens CASCADE;
DROP TABLE IF EXISTS garmin_token_access_log CASCADE;
DROP TABLE IF EXISTS token_access_audit CASCADE;

-- Drop old functions
DROP FUNCTION IF EXISTS store_garmin_tokens_secure(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_garmin_tokens_secure(uuid) CASCADE;

-- Clean up profiles table - remove token columns but keep garmin_connected
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS garmin_access_token,
  DROP COLUMN IF EXISTS garmin_token_secret,
  DROP COLUMN IF EXISTS garmin_code_verifier,
  DROP COLUMN IF EXISTS garmin_oauth_state;

-- Phase 2: Create new simplified token storage

CREATE TABLE garmin_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  code_verifier text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE garmin_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can access own tokens" 
  ON garmin_tokens FOR ALL 
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_garmin_tokens_updated_at
  BEFORE UPDATE ON garmin_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();