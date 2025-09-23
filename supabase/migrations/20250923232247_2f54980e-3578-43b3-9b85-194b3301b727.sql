-- Change activities.date column from date to timestamp with time zone
-- This allows proper timezone handling and display
ALTER TABLE activities 
ALTER COLUMN date TYPE timestamp with time zone 
USING date::timestamp with time zone;