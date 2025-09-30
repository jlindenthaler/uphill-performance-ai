-- Add columns to garmin_backfill_jobs for filtering and user selection
ALTER TABLE garmin_backfill_jobs
ADD COLUMN IF NOT EXISTS activity_types text[] DEFAULT ARRAY['running', 'cycling', 'swimming', 'train_running'],
ADD COLUMN IF NOT EXISTS user_selected boolean DEFAULT false;

-- Add columns to strava_backfill_jobs for filtering and user selection
ALTER TABLE strava_backfill_jobs
ADD COLUMN IF NOT EXISTS activity_types text[] DEFAULT ARRAY['Run', 'Ride', 'Swim', 'VirtualRide', 'VirtualRun', 'TrailRun'],
ADD COLUMN IF NOT EXISTS user_selected boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_garmin_backfill_status ON garmin_backfill_jobs(status, user_id);
CREATE INDEX IF NOT EXISTS idx_strava_backfill_status ON strava_backfill_jobs(status, user_id);