-- Add goal references to training_plans table
ALTER TABLE training_plans 
ADD COLUMN primary_goal_id uuid REFERENCES goals(id) ON DELETE SET NULL;

-- Create junction table for secondary goals
CREATE TABLE IF NOT EXISTS plan_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(plan_id, goal_id)
);

-- Enable RLS on plan_goals
ALTER TABLE plan_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for plan_goals
CREATE POLICY "Users can view goals for their own plans"
ON plan_goals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM training_plans
    WHERE training_plans.id = plan_goals.plan_id
    AND training_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create goals for their own plans"
ON plan_goals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM training_plans
    WHERE training_plans.id = plan_goals.plan_id
    AND training_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update goals for their own plans"
ON plan_goals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM training_plans
    WHERE training_plans.id = plan_goals.plan_id
    AND training_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete goals from their own plans"
ON plan_goals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM training_plans
    WHERE training_plans.id = plan_goals.plan_id
    AND training_plans.user_id = auth.uid()
  )
);