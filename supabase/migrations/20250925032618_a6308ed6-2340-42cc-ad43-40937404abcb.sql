-- Fix function search path security warnings
DROP FUNCTION IF EXISTS public.get_mapbox_elevation_profile(jsonb);

-- Recreate function with proper search path
CREATE OR REPLACE FUNCTION public.get_mapbox_elevation_profile(coordinates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
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