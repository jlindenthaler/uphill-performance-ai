-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the Garmin FIT worker to run every minute
SELECT cron.schedule(
  'process-garmin-fit-jobs',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://srwuprrcbfuzvkehvgyt.supabase.co/functions/v1/garmin-fit-worker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd3VwcnJjYmZ1enZrZWh2Z3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjQ0NTYsImV4cCI6MjA3MzkwMDQ1Nn0.mysBeAiZM8AjyWKHQs_0ZJUgvMijk-yRyeFfQE7KT2M"}'::jsonb
    ) as request_id;
  $$
);
