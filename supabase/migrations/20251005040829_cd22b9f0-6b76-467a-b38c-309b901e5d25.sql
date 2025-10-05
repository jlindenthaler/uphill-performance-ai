-- Reset the failed FIT job to retry with FIT file fallback
UPDATE garmin_fit_jobs 
SET 
  status = 'pending',
  attempts = 0,
  last_error = NULL,
  updated_at = NOW()
WHERE garmin_activity_id = '20591829453';