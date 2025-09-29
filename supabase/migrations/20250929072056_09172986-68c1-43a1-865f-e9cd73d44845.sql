-- Clear all data for user jlindenthaler@gmail.com (e91f0a35-b125-47d4-bafb-51187ef27089) to start fresh

-- Delete encrypted Strava tokens
DELETE FROM public.encrypted_strava_tokens WHERE user_id = 'e91f0a35-b125-47d4-bafb-51187ef27089';

-- Delete encrypted Garmin tokens if any
DELETE FROM public.encrypted_garmin_tokens WHERE user_id = 'e91f0a35-b125-47d4-bafb-51187ef27089';

-- Reset profile connections
UPDATE public.profiles 
SET strava_connected = false,
    garmin_connected = false,
    garmin_access_token = null,
    garmin_token_secret = null,
    updated_at = now()
WHERE user_id = 'e91f0a35-b125-47d4-bafb-51187ef27089';

-- Clear any activities for fresh start
DELETE FROM public.activities WHERE user_id = 'e91f0a35-b125-47d4-bafb-51187ef27089';

-- Clear training history
DELETE FROM public.training_history WHERE user_id = 'e91f0a35-b125-47d4-bafb-51187ef27089';