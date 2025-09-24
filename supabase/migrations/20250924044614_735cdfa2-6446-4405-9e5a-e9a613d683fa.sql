-- Add CP test related columns to activities table
ALTER TABLE public.activities 
ADD COLUMN activity_type TEXT DEFAULT 'normal',
ADD COLUMN cp_test_protocol TEXT,
ADD COLUMN cp_test_target_duration INTEGER;

-- Add index for CP test queries
CREATE INDEX idx_activities_cp_test ON public.activities(user_id, activity_type, cp_test_protocol, date) WHERE activity_type = 'cp_test';