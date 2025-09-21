-- Add Garmin integration columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS garmin_access_token TEXT,
ADD COLUMN IF NOT EXISTS garmin_token_secret TEXT,
ADD COLUMN IF NOT EXISTS garmin_connected BOOLEAN DEFAULT false;

-- Add Garmin activity ID to activities table for sync tracking
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS garmin_activity_id TEXT,
ADD COLUMN IF NOT EXISTS external_sync_source TEXT DEFAULT NULL;

-- Add missing lab result fields that were referenced in the UI
ALTER TABLE public.lab_results
ADD COLUMN IF NOT EXISTS aet NUMERIC,
ADD COLUMN IF NOT EXISTS aet_hr INTEGER,
ADD COLUMN IF NOT EXISTS gt NUMERIC, 
ADD COLUMN IF NOT EXISTS gt_hr INTEGER,
ADD COLUMN IF NOT EXISTS map_value NUMERIC,
ADD COLUMN IF NOT EXISTS max_hr INTEGER,
ADD COLUMN IF NOT EXISTS resting_hr INTEGER,
ADD COLUMN IF NOT EXISTS body_weight NUMERIC,
ADD COLUMN IF NOT EXISTS metabolic_efficiency NUMERIC,
ADD COLUMN IF NOT EXISTS critical_power NUMERIC,
ADD COLUMN IF NOT EXISTS w_prime NUMERIC;

-- Add enhanced time availability table for daily schedule management
CREATE TABLE IF NOT EXISTS public.enhanced_time_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'training', -- training, recovery, both
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week, start_time, activity_type)
);

-- Enable RLS on enhanced_time_availability
ALTER TABLE public.enhanced_time_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for enhanced_time_availability
CREATE POLICY "Users can view their own time availability" 
ON public.enhanced_time_availability 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time availability" 
ON public.enhanced_time_availability 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time availability" 
ON public.enhanced_time_availability 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time availability" 
ON public.enhanced_time_availability 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_enhanced_time_availability_updated_at
BEFORE UPDATE ON public.enhanced_time_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create recovery tools table
CREATE TABLE IF NOT EXISTS public.recovery_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  frequency TEXT, -- daily, weekly, as_needed
  notes TEXT,
  sport_mode TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on recovery_tools
ALTER TABLE public.recovery_tools ENABLE ROW LEVEL SECURITY;

-- Create policies for recovery_tools
CREATE POLICY "Users can view their own recovery tools" 
ON public.recovery_tools 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recovery tools" 
ON public.recovery_tools 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery tools" 
ON public.recovery_tools 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recovery tools" 
ON public.recovery_tools 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_recovery_tools_updated_at
BEFORE UPDATE ON public.recovery_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();