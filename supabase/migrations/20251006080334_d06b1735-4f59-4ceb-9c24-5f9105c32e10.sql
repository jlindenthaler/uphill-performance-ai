-- Add time_window column to power_profile table
ALTER TABLE power_profile 
ADD COLUMN IF NOT EXISTS time_window TEXT DEFAULT 'all-time';

-- Create index to ensure uniqueness across user, duration, sport, and time_window
CREATE UNIQUE INDEX IF NOT EXISTS power_profile_user_duration_sport_window_unique 
ON power_profile(user_id, duration_seconds, sport, time_window);

-- Backfill existing records as 'all-time' records
UPDATE power_profile 
SET time_window = 'all-time' 
WHERE time_window IS NULL OR time_window = 'all-time';

-- Create an index for efficient querying by time_window
CREATE INDEX IF NOT EXISTS idx_power_profile_time_window 
ON power_profile(user_id, sport, time_window, duration_seconds);