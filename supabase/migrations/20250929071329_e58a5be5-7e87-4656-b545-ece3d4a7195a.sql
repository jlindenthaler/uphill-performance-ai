-- Clear old Strava tokens that can't be decrypted with new system
DELETE FROM public.encrypted_strava_tokens WHERE user_id = 'e91f0a35-b125-47d4-bafb-51187ef27089';

-- Reset Strava connection status so user can reconnect properly
UPDATE public.profiles 
SET strava_connected = false,
    updated_at = now()
WHERE user_id = 'e91f0a35-b125-47d4-bafb-51187ef27089';