-- Drop the existing constraint
ALTER TABLE training_history DROP CONSTRAINT IF EXISTS training_history_sport_check;

-- Add comprehensive constraint with all sport type variations grouped by primary mode
ALTER TABLE training_history ADD CONSTRAINT training_history_sport_check 
CHECK (sport IN (
  -- Running group (includes walking, hiking, trail running)
  'running', 'run', 'walk', 'walking', 'hike', 'hiking',
  'trail_run', 'trailrun', 'virtual_run', 'virtualrun',
  'treadmill', 'treadmill_running', 'train_running',
  
  -- Cycling group (includes all bike variations)
  'cycling', 'ride', 'virtual_ride', 'virtualride',
  'e_bike_ride', 'ebikeride', 'e_mountain_bike_ride',
  'mountain_bike_ride', 'mountainbikeride', 'gravel_ride',
  'gravelride', 'handcycle',
  
  -- Swimming group (includes pool and open water)
  'swimming', 'swim', 'pool_swim', 'open_water_swim', 'lap_swimming',
  
  -- Other (for data integrity)
  'workout', 'other'
));