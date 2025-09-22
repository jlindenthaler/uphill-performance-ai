-- Add average cadence column to activities table
ALTER TABLE public.activities 
ADD COLUMN avg_cadence integer;