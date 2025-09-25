-- Add activity_id column to power_profile table to track which activity generated each record
ALTER TABLE public.power_profile 
ADD COLUMN activity_id UUID REFERENCES public.activities(id);

-- Create index for better performance when querying by activity_id
CREATE INDEX idx_power_profile_activity_id ON public.power_profile(activity_id);

-- Create index for better performance when excluding activity_id
CREATE INDEX idx_power_profile_user_sport_exclude_activity ON public.power_profile(user_id, sport, activity_id);