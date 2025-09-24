-- Add missing time series columns to activities table
ALTER TABLE public.activities 
ADD COLUMN power_time_series JSONB,
ADD COLUMN heart_rate_time_series JSONB;