-- Add strava_connected column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strava_connected boolean DEFAULT false;

-- Create strava_tokens table for basic token storage
CREATE TABLE IF NOT EXISTS public.strava_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  athlete_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on strava_tokens
ALTER TABLE public.strava_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for strava_tokens
CREATE POLICY "Users can view their own Strava tokens" 
ON public.strava_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Strava tokens" 
ON public.strava_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Strava tokens" 
ON public.strava_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Strava tokens" 
ON public.strava_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at trigger to strava_tokens
CREATE TRIGGER update_strava_tokens_updated_at
BEFORE UPDATE ON public.strava_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();