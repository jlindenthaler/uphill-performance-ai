-- Create activities table for storing uploaded activity data
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  sport_mode TEXT NOT NULL DEFAULT 'cycling',
  date DATE NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  distance_meters NUMERIC,
  elevation_gain_meters NUMERIC,
  avg_power NUMERIC,
  max_power NUMERIC,
  normalized_power NUMERIC,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  avg_pace_per_km NUMERIC,
  avg_speed_kmh NUMERIC,
  calories INTEGER,
  tss NUMERIC,
  intensity_factor NUMERIC,
  variability_index NUMERIC,
  file_path TEXT,
  file_type TEXT,
  original_filename TEXT,
  gps_data JSONB,
  lap_data JSONB,
  notes TEXT,
  weather_conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own activities" 
ON public.activities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities" 
ON public.activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" 
ON public.activities 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities" 
ON public.activities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for activity files
INSERT INTO storage.buckets (id, name, public) VALUES ('activity-files', 'activity-files', false);

-- Create storage policies for activity files
CREATE POLICY "Users can view their own activity files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'activity-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own activity files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'activity-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own activity files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'activity-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own activity files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'activity-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better performance
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_date ON public.activities(date DESC);
CREATE INDEX idx_activities_sport_mode ON public.activities(sport_mode);
CREATE INDEX idx_activities_user_sport_date ON public.activities(user_id, sport_mode, date DESC);