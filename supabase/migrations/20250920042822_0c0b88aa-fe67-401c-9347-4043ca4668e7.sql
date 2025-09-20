-- Add sport_mode column to physiology_data table to support sport-specific data
ALTER TABLE public.physiology_data 
ADD COLUMN IF NOT EXISTS sport_mode text DEFAULT 'cycling';

-- Create index for better query performance when filtering by sport_mode
CREATE INDEX IF NOT EXISTS idx_physiology_data_sport_mode 
ON public.physiology_data(user_id, sport_mode);

-- Update existing records to have cycling as default sport_mode if null
UPDATE public.physiology_data 
SET sport_mode = 'cycling' 
WHERE sport_mode IS NULL;