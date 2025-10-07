-- Create training plans table
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport_mode TEXT NOT NULL DEFAULT 'cycling',
  plan_name TEXT NOT NULL,
  goal_event_name TEXT,
  goal_event_date DATE,
  goal_event_type TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  periodization_style TEXT DEFAULT 'auto',
  total_weeks INTEGER,
  sessions_per_week INTEGER DEFAULT 5,
  weekly_tli_target NUMERIC,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create plan blocks table
CREATE TABLE public.plan_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL,
  block_intent TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  week_count INTEGER,
  block_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create plan sessions table
CREATE TABLE public.plan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.plan_blocks(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts(id),
  scheduled_date DATE NOT NULL,
  session_name TEXT NOT NULL,
  session_structure JSONB,
  session_intent TEXT,
  tss_target NUMERIC,
  duration_minutes INTEGER,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_plans
CREATE POLICY "Users can view their own training plans"
  ON public.training_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training plans"
  ON public.training_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training plans"
  ON public.training_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training plans"
  ON public.training_plans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for plan_blocks
CREATE POLICY "Users can view blocks from their own plans"
  ON public.plan_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_plans
      WHERE training_plans.id = plan_blocks.plan_id
      AND training_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create blocks for their own plans"
  ON public.plan_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.training_plans
      WHERE training_plans.id = plan_blocks.plan_id
      AND training_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update blocks from their own plans"
  ON public.plan_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.training_plans
      WHERE training_plans.id = plan_blocks.plan_id
      AND training_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete blocks from their own plans"
  ON public.plan_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.training_plans
      WHERE training_plans.id = plan_blocks.plan_id
      AND training_plans.user_id = auth.uid()
    )
  );

-- RLS Policies for plan_sessions
CREATE POLICY "Users can view sessions from their own plans"
  ON public.plan_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_blocks
      JOIN public.training_plans ON training_plans.id = plan_blocks.plan_id
      WHERE plan_blocks.id = plan_sessions.block_id
      AND training_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sessions for their own plans"
  ON public.plan_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_blocks
      JOIN public.training_plans ON training_plans.id = plan_blocks.plan_id
      WHERE plan_blocks.id = plan_sessions.block_id
      AND training_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sessions from their own plans"
  ON public.plan_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_blocks
      JOIN public.training_plans ON training_plans.id = plan_blocks.plan_id
      WHERE plan_blocks.id = plan_sessions.block_id
      AND training_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sessions from their own plans"
  ON public.plan_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_blocks
      JOIN public.training_plans ON training_plans.id = plan_blocks.plan_id
      WHERE plan_blocks.id = plan_sessions.block_id
      AND training_plans.user_id = auth.uid()
    )
  );

-- Add updated_at trigger for training_plans
CREATE TRIGGER update_training_plans_updated_at
  BEFORE UPDATE ON public.training_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();