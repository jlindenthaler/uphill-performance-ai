-- Clean up phantom training_history entries for sports with zero TSS
-- This removes entries for running/swimming that were created as zero-TSS placeholders
DELETE FROM training_history
WHERE tss = 0 
  AND duration_minutes = 0
  AND sport IN ('running', 'swimming')
  AND user_id IN (
    -- Only clean up for users who have no actual activities in these sports
    SELECT DISTINCT th.user_id 
    FROM training_history th
    WHERE th.sport IN ('running', 'swimming')
      AND NOT EXISTS (
        SELECT 1 FROM activities a 
        WHERE a.user_id = th.user_id 
          AND a.sport_mode IN ('running', 'swimming')
          AND a.tss > 0
      )
  );

-- Add an index to speed up training_history queries by sport
CREATE INDEX IF NOT EXISTS idx_training_history_user_sport_date 
ON training_history(user_id, sport, date DESC);