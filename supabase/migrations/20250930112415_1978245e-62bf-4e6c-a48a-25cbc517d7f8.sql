-- Update the stuck Garmin backfill job to error status
UPDATE garmin_backfill_jobs 
SET 
  status = 'error',
  last_error = 'Job timed out - manually reset by user',
  updated_at = now()
WHERE id = '9e3ae5e2-e317-49f0-8e12-6da74f205b45' AND status = 'running';