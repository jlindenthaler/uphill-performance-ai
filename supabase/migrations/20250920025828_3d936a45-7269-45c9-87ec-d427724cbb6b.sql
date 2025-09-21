-- Add missing fields to physiology_data table for enhanced metabolic calculations and sport mode support
ALTER TABLE public.physiology_data 
ADD COLUMN IF NOT EXISTS body_weight numeric,
ADD COLUMN IF NOT EXISTS respiratory_exchange_ratio numeric,
ADD COLUMN IF NOT EXISTS sport_mode text DEFAULT 'cycling' CHECK (sport_mode IN ('cycling', 'running')),
ADD COLUMN IF NOT EXISTS pace_zones jsonb;

-- Create power_profile table for storing training trends
CREATE TABLE IF NOT EXISTS public.power_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  duration_seconds integer NOT NULL,
  power_watts numeric,
  pace_per_km numeric, -- for running (seconds per km)
  date_achieved timestamp with time zone NOT NULL,
  sport text NOT NULL CHECK (sport IN ('cycling', 'running')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, duration_seconds, sport, date_achieved)
);

-- Enable RLS on power_profile table
ALTER TABLE public.power_profile ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for power_profile
CREATE POLICY "Users can view their own power profile data" 
ON public.power_profile 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own power profile data" 
ON public.power_profile 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own power profile data" 
ON public.power_profile 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own power profile data" 
ON public.power_profile 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create training_history table for PMC data
CREATE TABLE IF NOT EXISTS public.training_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  tss numeric DEFAULT 0,
  ctl numeric DEFAULT 0,
  atl numeric DEFAULT 0,
  tsb numeric DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  sport text NOT NULL CHECK (sport IN ('cycling', 'running')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, sport)
);

-- Enable RLS on training_history table
ALTER TABLE public.training_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for training_history
CREATE POLICY "Users can view their own training history" 
ON public.training_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training history" 
ON public.training_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training history" 
ON public.training_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training history" 
ON public.training_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for training_history updated_at
CREATE TRIGGER update_training_history_updated_at
BEFORE UPDATE ON public.training_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();