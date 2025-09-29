-- Fix existing Strava connections where tokens exist but profile not updated
UPDATE profiles 
SET strava_connected = true, updated_at = now() 
WHERE user_id IN (
  SELECT user_id FROM encrypted_strava_tokens
) AND strava_connected = false;