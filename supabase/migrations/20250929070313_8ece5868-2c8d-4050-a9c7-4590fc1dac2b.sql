-- Fix Strava token storage to use proper encryption instead of hashing
-- Drop and recreate the functions with proper encryption

DROP FUNCTION IF EXISTS public.store_strava_tokens_secure(uuid, text, text, timestamp with time zone, text, bigint);
DROP FUNCTION IF EXISTS public.get_strava_tokens_secure(uuid);

CREATE OR REPLACE FUNCTION public.store_strava_tokens_secure(
  p_user_id uuid, 
  p_access_token text, 
  p_refresh_token text, 
  p_expires_at timestamp with time zone, 
  p_scope text DEFAULT NULL::text, 
  p_athlete_id bigint DEFAULT NULL::bigint
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key TEXT := 'strava_key_' || p_user_id::text;
BEGIN
  -- Verify user authorization
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Store encrypted tokens using AES encryption
  INSERT INTO public.encrypted_strava_tokens (
    user_id, 
    access_token_hash, 
    refresh_token_hash,
    expires_at,
    scope,
    athlete_id
  ) VALUES (
    p_user_id,
    encode(encrypt(p_access_token::bytea, encryption_key, 'aes'), 'base64'),
    encode(encrypt(p_refresh_token::bytea, encryption_key, 'aes'), 'base64'),
    p_expires_at,
    p_scope,
    p_athlete_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token_hash = encode(encrypt(p_access_token::bytea, encryption_key, 'aes'), 'base64'),
    refresh_token_hash = encode(encrypt(p_refresh_token::bytea, encryption_key, 'aes'), 'base64'),
    expires_at = p_expires_at,
    scope = p_scope,
    athlete_id = p_athlete_id,
    updated_at = now();

  -- Update profiles table to mark Strava as connected
  UPDATE public.profiles 
  SET strava_connected = true,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_strava_tokens_secure(p_user_id uuid)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone, athlete_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key TEXT := 'strava_key_' || p_user_id::text;
  token_record RECORD;
BEGIN
  -- Verify user authorization
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get encrypted tokens
  SELECT INTO token_record 
    access_token_hash, 
    refresh_token_hash,
    encrypted_strava_tokens.expires_at,
    encrypted_strava_tokens.athlete_id
  FROM public.encrypted_strava_tokens 
  WHERE user_id = p_user_id;

  IF FOUND THEN
    -- Decrypt and return the actual tokens
    RETURN QUERY SELECT 
      convert_from(decrypt(decode(token_record.access_token_hash, 'base64'), encryption_key, 'aes'), 'UTF8'),
      convert_from(decrypt(decode(token_record.refresh_token_hash, 'base64'), encryption_key, 'aes'), 'UTF8'),
      token_record.expires_at,
      token_record.athlete_id;
  END IF;
END;
$$;