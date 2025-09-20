-- First, let's remove duplicates from physiology_data table
-- Keep only the most recent entry per user_id + sport_mode
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, sport_mode 
           ORDER BY updated_at DESC
         ) as rn
  FROM public.physiology_data
)
DELETE FROM public.physiology_data 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE public.physiology_data 
ADD CONSTRAINT unique_user_sport_physiology UNIQUE (user_id, sport_mode);

-- Also clean up lab_results duplicates if any exist
WITH lab_duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, sport_mode 
           ORDER BY updated_at DESC
         ) as rn
  FROM public.lab_results
)
DELETE FROM public.lab_results 
WHERE id IN (
  SELECT id FROM lab_duplicates WHERE rn > 1
);

-- Add constraint for lab_results
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