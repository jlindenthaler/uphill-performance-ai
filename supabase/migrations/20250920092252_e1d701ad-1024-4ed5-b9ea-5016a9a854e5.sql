-- Add unique constraint for physiology_data upsert operations
ALTER TABLE public.physiology_data 
ADD CONSTRAINT unique_user_sport_physiology UNIQUE (user_id, sport_mode);

-- Add constraint for lab_results upsert operations (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_sport_lab' 
    AND table_name = 'lab_results'
  ) THEN
    ALTER TABLE public.lab_results 
    ADD CONSTRAINT unique_user_sport_lab UNIQUE (user_id, sport_mode);
  END IF;
END $$;