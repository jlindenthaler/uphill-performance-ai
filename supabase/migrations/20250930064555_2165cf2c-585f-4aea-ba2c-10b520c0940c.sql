-- Create Strava backfill jobs table
CREATE TABLE IF NOT EXISTS public.strava_backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strava_athlete_id TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_page INTEGER DEFAULT 1,
  activities_synced INTEGER DEFAULT 0,
  activities_skipped INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strava_backfill_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own jobs
CREATE POLICY "Users can view their own backfill jobs"
  ON public.strava_backfill_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_strava_backfill_jobs_user_id ON public.strava_backfill_jobs(user_id);
CREATE INDEX idx_strava_backfill_jobs_status ON public.strava_backfill_jobs(status);
CREATE INDEX idx_strava_backfill_jobs_created_at ON public.strava_backfill_jobs(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_strava_backfill_jobs_updated_at
  BEFORE UPDATE ON public.strava_backfill_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add check constraint for status
ALTER TABLE public.strava_backfill_jobs
  ADD CONSTRAINT check_strava_backfill_status
  CHECK (status IN ('pending', 'running', 'completed', 'error'));