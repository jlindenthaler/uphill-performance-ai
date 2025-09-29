-- Phase 1: Complete Strava Integration Cleanup
-- Drop all Strava-related database objects

-- Drop Strava-related functions
DROP FUNCTION IF EXISTS public.store_strava_tokens_secure(uuid, text, text, timestamp with time zone, text, bigint);
DROP FUNCTION IF EXISTS public.get_strava_tokens_secure(uuid);

-- Drop Strava-related tables
DROP TABLE IF EXISTS public.encrypted_strava_tokens;
DROP TABLE IF EXISTS public.strava_token_access_log;

-- Remove Strava connection flag from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS strava_connected;

-- Clean up any Strava-related columns from activities if they exist
ALTER TABLE public.activities DROP COLUMN IF EXISTS strava_activity_id;