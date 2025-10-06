-- Remove overlapping fields from physiology_data table
-- Keep only lifestyle/training tracking fields
-- Lab test values should come from lab_results table only

ALTER TABLE physiology_data 
DROP COLUMN IF EXISTS vo2_max,
DROP COLUMN IF EXISTS critical_power,
DROP COLUMN IF EXISTS w_prime,
DROP COLUMN IF EXISTS ftp,
DROP COLUMN IF EXISTS lactate_threshold,
DROP COLUMN IF EXISTS lactate_threshold_2,
DROP COLUMN IF EXISTS body_weight,
DROP COLUMN IF EXISTS max_hr,
DROP COLUMN IF EXISTS resting_hr;

-- physiology_data now focuses on:
-- - Training lifestyle: sleep_hours, sleep_quality, stress_level, hrv_rmssd
-- - Nutrition: hydration_target, carb_max_rate, fat_max_rate, nutrition_strategy
-- - Metabolic: metabolic_flexibility, respiratory_exchange_ratio, fat_max_intensity
-- - Recovery: recovery_methods
-- - Capacity: neuromuscular_power, anaerobic_capacity
-- - Notes and tags

COMMENT ON TABLE physiology_data IS 'Lifestyle and training tracking data. For lab test results (VO2max, thresholds, CP, etc), use lab_results table.';