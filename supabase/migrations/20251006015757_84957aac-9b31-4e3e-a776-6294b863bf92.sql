-- Create a function to recalculate training_history for a specific user/date/sport
CREATE OR REPLACE FUNCTION public.recalculate_training_history_for_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _date date;
  _sport text;
  _total_tss numeric;
  _total_duration integer;
BEGIN
  -- Use OLD record from the deleted activity
  _user_id := OLD.user_id;
  _date := OLD.date::date;
  _sport := OLD.sport_mode;
  
  -- Calculate totals for this date/sport from remaining activities
  SELECT 
    COALESCE(SUM(tss), 0),
    COALESCE(SUM(duration_seconds / 60), 0)
  INTO _total_tss, _total_duration
  FROM activities
  WHERE user_id = _user_id
    AND date::date = _date
    AND sport_mode = _sport;
  
  -- If no activities remain for this date, delete the training_history record
  IF _total_tss = 0 AND _total_duration = 0 THEN
    DELETE FROM training_history
    WHERE user_id = _user_id
      AND date = _date
      AND sport = _sport;
  ELSE
    -- Update the training_history record with recalculated values
    -- Note: CTL, ATL, TSB should be recalculated by the PMC calculator
    UPDATE training_history
    SET 
      tss = _total_tss,
      duration_minutes = _total_duration,
      updated_at = now()
    WHERE user_id = _user_id
      AND date = _date
      AND sport = _sport;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger on activities table to recalculate training_history after delete
DROP TRIGGER IF EXISTS recalculate_training_history_on_delete ON activities;

CREATE TRIGGER recalculate_training_history_on_delete
AFTER DELETE ON activities
FOR EACH ROW
EXECUTE FUNCTION recalculate_training_history_for_date();