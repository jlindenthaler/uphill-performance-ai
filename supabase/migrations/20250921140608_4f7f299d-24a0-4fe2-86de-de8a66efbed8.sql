-- Add unique constraint to power_profile table to fix UPSERT issues
ALTER TABLE public.power_profile 
ADD CONSTRAINT power_profile_user_duration_sport_unique 
UNIQUE (user_id, duration_seconds, sport);