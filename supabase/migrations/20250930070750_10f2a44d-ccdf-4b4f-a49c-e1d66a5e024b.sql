-- Schedule garmin-backfill-worker to run every 3 minutes
SELECT cron.schedule(
  'garmin-backfill-worker',
  '*/3 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://srwuprrcbfuzvkehvgyt.supabase.co/functions/v1/garmin-backfill-worker',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd3VwcnJjYmZ1enZrZWh2Z3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjQ0NTYsImV4cCI6MjA3MzkwMDQ1Nn0.mysBeAiZM8AjyWKHQs_0ZJUgvMijk-yRyeFfQE7KT2M"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);