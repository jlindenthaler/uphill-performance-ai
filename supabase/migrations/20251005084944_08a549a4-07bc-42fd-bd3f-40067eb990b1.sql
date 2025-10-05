-- Enable RLS on strava_backfill_jobs table
ALTER TABLE strava_backfill_jobs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own jobs
CREATE POLICY "Users can view their own Strava jobs"
ON strava_backfill_jobs
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own jobs
CREATE POLICY "Users can update their own Strava jobs"
ON strava_backfill_jobs
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to insert their own jobs
CREATE POLICY "Users can create their own Strava jobs"
ON strava_backfill_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);