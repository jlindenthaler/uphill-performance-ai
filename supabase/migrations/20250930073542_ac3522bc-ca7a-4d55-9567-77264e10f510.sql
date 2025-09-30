-- Add INSERT policies for garmin_backfill_jobs
CREATE POLICY "Users can create their own backfill jobs"
ON garmin_backfill_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add INSERT policies for strava_backfill_jobs
CREATE POLICY "Users can create their own backfill jobs"
ON strava_backfill_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);