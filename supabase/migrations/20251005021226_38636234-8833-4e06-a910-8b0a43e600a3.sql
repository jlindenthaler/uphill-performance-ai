-- Add UPDATE policy for garmin_backfill_jobs so users can cancel their own jobs
CREATE POLICY "Users can update their own backfill jobs"
ON garmin_backfill_jobs
FOR UPDATE
USING (auth.uid() = user_id);