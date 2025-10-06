-- Drop the broken Strava cron job
SELECT cron.unschedule('process-strava-backfills');

-- Create the correct Strava cron job with hardcoded anon key (same pattern as Garmin)
SELECT cron.schedule(
  'process-strava-backfills',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://srwuprrcbfuzvkehvgyt.supabase.co/functions/v1/strava-backfill-worker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd3VwcnJjYmZ1enZrZWh2Z3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjQ0NTYsImV4cCI6MjA3MzkwMDQ1Nn0.mysBeAiZM8AjyWKHQs_0ZJUgvMijk-yRyeFfQE7KT2M"}'::jsonb
    ) as request_id;
  $$
);