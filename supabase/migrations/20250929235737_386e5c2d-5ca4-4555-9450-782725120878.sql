-- Add strava_activity_id column to activities table
ALTER TABLE public.activities 
ADD COLUMN strava_activity_id text;

-- Add unique constraint to prevent duplicate Strava activities per user
ALTER TABLE public.activities 
ADD CONSTRAINT unique_user_strava_activity UNIQUE (user_id, strava_activity_id);

-- Add index for faster lookups
CREATE INDEX idx_activities_strava_id ON public.activities(strava_activity_id) WHERE strava_activity_id IS NOT NULL;

-- Add index for faster Garmin lookups
CREATE INDEX idx_activities_garmin_id ON public.activities(garmin_activity_id) WHERE garmin_activity_id IS NOT NULL;