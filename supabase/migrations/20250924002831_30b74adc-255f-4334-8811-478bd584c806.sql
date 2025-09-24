-- Create weekly targets table for storing user's weekly TLI and session targets
CREATE TABLE public.weekly_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weekly_tli_target NUMERIC NOT NULL DEFAULT 400,
  weekly_sessions_target INTEGER NOT NULL DEFAULT 12,
  sport_mode TEXT NOT NULL DEFAULT 'cycling',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sport_mode)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for weekly targets
CREATE POLICY "Users can view their own weekly targets" 
ON public.weekly_targets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly targets" 
ON public.weekly_targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly targets" 
ON public.weekly_targets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly targets" 
ON public.weekly_targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_weekly_targets_updated_at
BEFORE UPDATE ON public.weekly_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();