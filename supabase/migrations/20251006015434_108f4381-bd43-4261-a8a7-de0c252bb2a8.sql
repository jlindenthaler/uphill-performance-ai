-- Clean up old power_profile records with null activity_id
DELETE FROM power_profile WHERE activity_id IS NULL;

-- Add foreign key constraint with CASCADE DELETE
-- This ensures when an activity is deleted, all its power_profile records are deleted too
ALTER TABLE power_profile
DROP CONSTRAINT IF EXISTS power_profile_activity_id_fkey;

ALTER TABLE power_profile
ADD CONSTRAINT power_profile_activity_id_fkey 
FOREIGN KEY (activity_id) 
REFERENCES activities(id) 
ON DELETE CASCADE;