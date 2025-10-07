-- Remove unique constraint on lab_results to allow multiple historical entries per user/sport
-- This allows users to store multiple lab test results over time instead of overwriting

-- Drop the unique constraint (if it exists)
ALTER TABLE lab_results DROP CONSTRAINT IF EXISTS lab_results_user_id_sport_mode_key;