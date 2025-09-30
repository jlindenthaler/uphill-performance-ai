-- Add columns for additional time series data from Strava
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS cadence_time_series jsonb,
ADD COLUMN IF NOT EXISTS temperature_time_series jsonb,
ADD COLUMN IF NOT EXISTS speed_time_series jsonb,
ADD COLUMN IF NOT EXISTS distance_time_series jsonb,
ADD COLUMN IF NOT EXISTS altitude_time_series jsonb,
ADD COLUMN IF NOT EXISTS time_time_series jsonb;