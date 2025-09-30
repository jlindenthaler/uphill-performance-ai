-- Fix the training_history sport check constraint to allow all activity sport modes
-- First, drop the existing constraint
ALTER TABLE training_history DROP CONSTRAINT IF EXISTS training_history_sport_check;

-- Add a new constraint that allows all common sport modes
ALTER TABLE training_history ADD CONSTRAINT training_history_sport_check 
CHECK (sport IN ('cycling', 'running', 'swimming', 'workout', 'train_running', 'ride', 'virtual_ride', 'virtual_run', 'trail_run', 'weight_training', 'hiit', 'yoga', 'other'));