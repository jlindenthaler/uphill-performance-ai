-- Create CP results table for storing critical power test results
CREATE TABLE public.cp_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sport_mode TEXT NOT NULL DEFAULT 'cycling',
  test_date TIMESTAMP WITH TIME ZONE NOT NULL,
  protocol_used TEXT NOT NULL,
  cp_watts NUMERIC NOT NULL,
  w_prime_joules NUMERIC NOT NULL,
  efforts_used JSONB NOT NULL DEFAULT '[]',
  efforts_rejected JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cp_results ENABLE ROW LEVEL SECURITY;

-- Create policies for CP results
CREATE POLICY "Users can view their own CP results" 
ON public.cp_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CP results" 
ON public.cp_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CP results" 
ON public.cp_results 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CP results" 
ON public.cp_results 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cp_results_updated_at
BEFORE UPDATE ON public.cp_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_cp_results_user_sport_date ON public.cp_results(user_id, sport_mode, test_date DESC);