-- Create cron job to process Strava backfill jobs every minute
SELECT cron.schedule(
  'process-strava-backfills',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://srwuprrcbfuzvkehvgyt.supabase.co/functions/v1/strava-backfill-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);