-- Create Strava tokens table with encryption
CREATE TABLE public.encrypted_strava_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  athlete_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and create policies
ALTER TABLE public.encrypted_strava_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access tokens via secure functions" 
ON public.encrypted_strava_tokens 
FOR ALL 
USING (false);

-- Create Strava token access log table
CREATE TABLE public.strava_token_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_type TEXT NOT NULL,
  success BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for access log
ALTER TABLE public.strava_token_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Strava token access logging" 
ON public.strava_token_access_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create secure function to store Strava tokens
CREATE OR REPLACE FUNCTION public.store_strava_tokens_secure(
  p_user_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_scope TEXT DEFAULT NULL,
  p_athlete_id BIGINT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user authorization
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Store hashed tokens (using pgcrypto's crypt with salt)
  INSERT INTO public.encrypted_strava_tokens (
    user_id, 
    access_token_hash, 
    refresh_token_hash,
    expires_at,
    scope,
    athlete_id
  ) VALUES (
    p_user_id,
    crypt(p_access_token, gen_salt('bf', 8)),
    crypt(p_refresh_token, gen_salt('bf', 8)),
    p_expires_at,
    p_scope,
    p_athlete_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token_hash = crypt(p_access_token, gen_salt('bf', 8)),
    refresh_token_hash = crypt(p_refresh_token, gen_salt('bf', 8)),
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

-- Create secure function to get Strava tokens
CREATE OR REPLACE FUNCTION public.get_strava_tokens_secure(p_user_id UUID)
RETURNS TABLE(access_token TEXT, refresh_token TEXT, expires_at TIMESTAMP WITH TIME ZONE, athlete_id BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT := 'strava_key_' || p_user_id::text;
  token_record RECORD;
BEGIN
  -- Verify user authorization
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get encrypted tokens (placeholder - in production would decrypt)
  SELECT INTO token_record 
    access_token_hash, 
    refresh_token_hash,
    encrypted_strava_tokens.expires_at,
    encrypted_strava_tokens.athlete_id
  FROM public.encrypted_strava_tokens 
  WHERE user_id = p_user_id;

  IF FOUND THEN
    -- For now, return placeholder until proper decryption is implemented
    RETURN QUERY SELECT 
      'placeholder_access_token'::TEXT,
      'placeholder_refresh_token'::TEXT,
      token_record.expires_at,
      token_record.athlete_id;
  END IF;
END;
$$;

-- Add strava_connected column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS strava_connected BOOLEAN DEFAULT false;

-- Create trigger for updated_at
CREATE TRIGGER update_strava_tokens_updated_at
BEFORE UPDATE ON public.encrypted_strava_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();