-- Add lab test results and time availability tables
CREATE TABLE public.lab_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sport_mode TEXT NOT NULL DEFAULT 'cycling',
  vo2_max NUMERIC,
  vla_max NUMERIC,
  fat_max NUMERIC,
  crossover_point NUMERIC,
  fat_max_intensity NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sport_mode)
);

CREATE TABLE public.time_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  training_hours_per_day NUMERIC NOT NULL DEFAULT 2,
  recovery_hours_per_day NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  structure JSONB NOT NULL,
  sport_mode TEXT NOT NULL DEFAULT 'cycling',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  tss NUMERIC DEFAULT 0,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lab_results
CREATE POLICY "Users can view their own lab results" ON public.lab_results
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lab results" ON public.lab_results
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lab results" ON public.lab_results
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lab results" ON public.lab_results
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for time_availability
CREATE POLICY "Users can view their own time availability" ON public.time_availability
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time availability" ON public.time_availability
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time availability" ON public.time_availability
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time availability" ON public.time_availability
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for workouts
CREATE POLICY "Users can view their own workouts" ON public.workouts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workouts" ON public.workouts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" ON public.workouts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts" ON public.workouts
FOR DELETE USING (auth.uid() = user_id);

-- Add storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add update triggers
CREATE TRIGGER update_lab_results_updated_at
BEFORE UPDATE ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_availability_updated_at
BEFORE UPDATE ON public.time_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at
BEFORE UPDATE ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();