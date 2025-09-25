-- Add caching fields to activities table for performance optimization
ALTER TABLE public.activities 
ADD COLUMN elevation_profile jsonb,
ADD COLUMN summary_metrics jsonb,
ADD COLUMN power_curve_cache jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activities_user_sport_date ON public.activities(user_id, sport_mode, date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_date_desc ON public.activities(date DESC);

-- Create function to get cached elevation from MapBox API during upload
CREATE OR REPLACE FUNCTION public.get_mapbox_elevation_profile(coordinates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  coord_array jsonb[];
  elevation_data jsonb := '[]'::jsonb;
BEGIN
  -- If coordinates are provided, return them as-is for now
  -- In production, this would call MapBox Elevation API
  IF coordinates IS NOT NULL THEN
    result := jsonb_build_object(
      'coordinates', coordinates,
      'calculated_at', now(),
      'source', 'gps_fallback'
    );
  ELSE 
    result := jsonb_build_object(
      'coordinates', '[]'::jsonb,
      'calculated_at', now(),
      'source', 'none'
    );
  END IF;
  
  RETURN result;
END;
$$;