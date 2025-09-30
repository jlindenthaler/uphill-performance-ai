-- Create garmin_backfill_jobs table for async job queue
CREATE TABLE IF NOT EXISTS public.garmin_backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garmin_user_id TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_date TIMESTAMPTZ,
  activities_synced INTEGER DEFAULT 0,
  activities_skipped INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.garmin_backfill_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for users to view their own jobs
CREATE POLICY "Users can view their own backfill jobs"
  ON public.garmin_backfill_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_garmin_backfill_jobs_status 
  ON public.garmin_backfill_jobs(status, created_at);
  
CREATE INDEX IF NOT EXISTS idx_garmin_backfill_jobs_user 
  ON public.garmin_backfill_jobs(user_id);

-- Add check constraint for valid status values
ALTER TABLE public.garmin_backfill_jobs 
  ADD CONSTRAINT valid_status 
  CHECK (status IN ('pending', 'running', 'completed', 'error', 'cancelled'));