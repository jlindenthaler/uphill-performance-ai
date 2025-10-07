-- Add column to store per-day weekly schedule
ALTER TABLE time_availability 
ADD COLUMN weekly_schedule jsonb DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN time_availability.weekly_schedule IS 'Stores per-day availability as: {"monday": {"training_hours": 2, "recovery_hours": 1}, ...}';
