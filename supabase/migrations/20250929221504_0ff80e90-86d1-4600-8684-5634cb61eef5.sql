-- Add temporary OAuth fields to profiles table for Garmin OAuth flow
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS garmin_code_verifier TEXT,
ADD COLUMN IF NOT EXISTS garmin_oauth_state TEXT;