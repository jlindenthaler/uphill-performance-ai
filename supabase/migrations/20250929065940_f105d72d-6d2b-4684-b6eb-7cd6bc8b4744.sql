-- Update the profile to mark Strava as connected
UPDATE public.profiles 
SET strava_connected = true,
    updated_at = now()
WHERE user_id = 'e91f0a35-b125-47d4-bafb-51187ef27089';