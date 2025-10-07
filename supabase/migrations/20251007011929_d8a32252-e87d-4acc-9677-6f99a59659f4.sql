-- Create function to recompute training context when activities change
CREATE OR REPLACE FUNCTION public.recompute_training_context_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_date date;
BEGIN
  -- Get the date of the activity (either NEW or OLD depending on operation)
  IF TG_OP = 'DELETE' THEN
    activity_date := OLD.date::date;
  ELSE
    activity_date := NEW.date::date;
  END IF;

  -- Trigger PMC recalculation for this user from this date forward
  -- This will be handled by the existing updateTrainingHistoryForDate logic
  -- We'll queue this as a background job via a notification
  PERFORM pg_notify(
    'training_context_update',
    json_build_object(
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'date', activity_date,
      'sport_mode', COALESCE(NEW.sport_mode, OLD.sport_mode),
      'operation', TG_OP
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on activities table
DROP TRIGGER IF EXISTS trigger_recompute_training_context ON public.activities;
CREATE TRIGGER trigger_recompute_training_context
  AFTER INSERT OR UPDATE OR DELETE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.recompute_training_context_on_activity();

COMMENT ON FUNCTION public.recompute_training_context_on_activity() IS 
'Automatically queues PMC recalculation when activities are inserted, updated, or deleted';

COMMENT ON TRIGGER trigger_recompute_training_context ON public.activities IS
'Ensures training history metrics stay up-to-date in real-time when activities change';