-- Create physiology_data table for storing athlete physiology and recovery data
CREATE TABLE public.physiology_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Laboratory Results
  vo2_max DECIMAL,
  lactate_threshold DECIMAL,
  lactate_threshold_2 DECIMAL,
  resting_hr INTEGER,
  max_hr INTEGER,
  hrv_rmssd DECIMAL,
  
  -- Performance Markers
  ftp DECIMAL,
  critical_power DECIMAL,
  w_prime DECIMAL,
  anaerobic_capacity DECIMAL,
  neuromuscular_power DECIMAL,
  
  -- Metabolic Efficiency
  fat_max_rate DECIMAL,
  fat_max_intensity DECIMAL,
  carb_max_rate DECIMAL,
  metabolic_flexibility DECIMAL,
  
  -- Recovery Preferences
  sleep_hours DECIMAL,
  sleep_quality INTEGER,
  stress_level INTEGER,
  recovery_methods TEXT[],
  nutrition_strategy TEXT,
  hydration_target DECIMAL,
  
  -- Additional fields for extensibility
  notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.physiology_data ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own physiology data" 
ON public.physiology_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own physiology data" 
ON public.physiology_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own physiology data" 
ON public.physiology_data 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own physiology data" 
ON public.physiology_data 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_physiology_data_updated_at
  BEFORE UPDATE ON public.physiology_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_physiology_data_user_id ON public.physiology_data(user_id);
CREATE INDEX idx_physiology_data_created_at ON public.physiology_data(created_at DESC);