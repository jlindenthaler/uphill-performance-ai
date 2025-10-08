
-- Drop the unique constraint that prevents multiple lab results per user/sport
-- This allows users to save multiple historical lab test results
ALTER TABLE public.lab_results 
DROP CONSTRAINT IF EXISTS unique_user_sport_lab;
