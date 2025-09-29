-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Now manually insert the Strava tokens for user e91f0a35-b125-47d4-bafb-51187ef27089
INSERT INTO encrypted_strava_tokens (
  user_id, 
  access_token_hash, 
  refresh_token_hash, 
  expires_at, 
  scope, 
  athlete_id
) VALUES (
  'e91f0a35-b125-47d4-bafb-51187ef27089',
  crypt('fb5fcb3f0f7c07e27116b7c8d197b92457ed2985', gen_salt('bf', 8)),
  crypt('0cce92845bd5fdeb8916e78bbdd1c694a2494fc9', gen_salt('bf', 8)),
  now() + interval '6 hours',
  'read,activity:read_all',
  1
) ON CONFLICT (user_id) DO UPDATE SET
  access_token_hash = crypt('fb5fcb3f0f7c07e27116b7c8d197b92457ed2985', gen_salt('bf', 8)),
  refresh_token_hash = crypt('0cce92845bd5fdeb8916e78bbdd1c694a2494fc9', gen_salt('bf', 8)),
  expires_at = now() + interval '6 hours',
  scope = 'read,activity:read_all',
  athlete_id = 1,
  updated_at = now();

-- Update profiles table to mark Strava as connected
UPDATE profiles 
SET strava_connected = true, updated_at = now()
WHERE user_id = 'e91f0a35-b125-47d4-bafb-51187ef27089';