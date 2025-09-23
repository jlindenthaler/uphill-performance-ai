-- Update existing activities to store full timestamps instead of date-only
-- This allows timezone conversions to be visible when displaying dates
UPDATE activities 
SET date = date::timestamp + time '12:00:00'
WHERE date IS NOT NULL 
  AND date::text ~ '^\d{4}-\d{2}-\d{2}$';