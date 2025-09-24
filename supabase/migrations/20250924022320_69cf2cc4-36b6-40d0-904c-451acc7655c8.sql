-- Add missing columns to lab_results table for comprehensive lab results
ALTER TABLE public.lab_results 
ADD COLUMN IF NOT EXISTS vt1_hr integer,
ADD COLUMN IF NOT EXISTS vt1_power numeric,
ADD COLUMN IF NOT EXISTS vt2_hr integer,
ADD COLUMN IF NOT EXISTS vt2_power numeric,
ADD COLUMN IF NOT EXISTS lt1_hr integer,
ADD COLUMN IF NOT EXISTS lt1_power numeric,
ADD COLUMN IF NOT EXISTS lt2_hr integer,
ADD COLUMN IF NOT EXISTS lt2_power numeric,
ADD COLUMN IF NOT EXISTS rmr numeric,
ADD COLUMN IF NOT EXISTS fat_oxidation_rate numeric,
ADD COLUMN IF NOT EXISTS carb_oxidation_rate numeric,
ADD COLUMN IF NOT EXISTS test_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS test_type text;