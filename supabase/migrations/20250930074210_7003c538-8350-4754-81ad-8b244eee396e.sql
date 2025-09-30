-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to run strava-backfill-worker every minute
SELECT cron.schedule(
  'strava-backfill-worker-cron',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://srwuprrcbfuzvkehvgyt.supabase.co/functions/v1/strava-backfill-worker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd3VwcnJjYmZ1enZrZWh2Z3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjQ0NTYsImV4cCI6MjA3MzkwMDQ1Nn0.mysBeAiZM8AjyWKHQs_0ZJUgvMijk-yRyeFfQE7KT2M"}'::jsonb
    ) as request_id;
  $$
);

-- Also set up garmin-backfill-worker cron
SELECT cron.schedule(
  'garmin-backfill-worker-cron',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://srwuprrcbfuzvkehvgyt.supabase.co/functions/v1/garmin-backfill-worker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd3VwcnJjYmZ1enZrZWh2Z3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjQ0NTYsImV4cCI6MjA3MzkwMDQ1Nn0.mysBeAiZM8AjyWKHQs_0ZJUgvMijk-yRyeFfQE7KT2M"}'::jsonb
    ) as request_id;
  $$
);