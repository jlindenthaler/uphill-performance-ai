-- Create recovery sessions table for enhanced recovery tracking
CREATE TABLE public.recovery_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  pre_fatigue_level INTEGER NOT NULL CHECK (pre_fatigue_level >= 1 AND pre_fatigue_level <= 10),
  post_fatigue_level INTEGER NOT NULL CHECK (post_fatigue_level >= 1 AND post_fatigue_level <= 10),
  effectiveness_rating INTEGER NOT NULL CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
  muscle_groups TEXT[] DEFAULT '{}',
  recovery_tools_used TEXT[] DEFAULT '{}',
  notes TEXT,
  sport_mode TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recovery_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own recovery sessions" 
ON public.recovery_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recovery sessions" 
ON public.recovery_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery sessions" 
ON public.recovery_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recovery sessions" 
ON public.recovery_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for timestamp updates
CREATE TRIGGER update_recovery_sessions_updated_at
BEFORE UPDATE ON public.recovery_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();