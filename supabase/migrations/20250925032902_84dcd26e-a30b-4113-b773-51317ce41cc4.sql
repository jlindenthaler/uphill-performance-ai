-- Fix remaining function search path security warnings by updating in place

-- Fix update_goals_updated_at function (modify existing)
CREATE OR REPLACE FUNCTION public.update_goals_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function (modify existing)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix get_garmin_tokens_secure function (modify existing)
CREATE OR REPLACE FUNCTION public.get_garmin_tokens_secure(p_user_id uuid)
RETURNS TABLE(access_token text, token_secret text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT := 'garmin_key_' || p_user_id::text;
  token_record RECORD;
BEGIN
  -- Verify user authorization
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get encrypted tokens
  SELECT INTO token_record 
    encrypted_access_token, 
    encrypted_token_secret 
  FROM public.secure_garmin_tokens 
  WHERE user_id = p_user_id;

  IF FOUND THEN
    RETURN QUERY SELECT 
      convert_from(decrypt(decode(token_record.encrypted_access_token, 'base64'), encryption_key, 'aes'), 'UTF8'),
      convert_from(decrypt(decode(token_record.encrypted_token_secret, 'base64'), encryption_key, 'aes'), 'UTF8');
  END IF;
END;
$$;

-- Fix store_garmin_tokens_secure function (modify existing)
CREATE OR REPLACE FUNCTION public.store_garmin_tokens_secure(p_user_id uuid, p_access_token text, p_token_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  salt_key TEXT;
BEGIN
  -- Generate a deterministic salt based on user_id for consistency
  salt_key := encode(digest(p_user_id::text || 'garmin_salt_key_2024', 'sha256'), 'hex');

  -- Store hashed tokens (using pgcrypto's crypt with salt)
  INSERT INTO public.encrypted_garmin_tokens (
    user_id, 
    access_token_hash, 
    token_secret_hash
  ) VALUES (
    p_user_id,
    crypt(p_access_token, gen_salt('bf', 8)),
    crypt(p_token_secret, gen_salt('bf', 8))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token_hash = crypt(p_access_token, gen_salt('bf', 8)),
    token_secret_hash = crypt(p_token_secret, gen_salt('bf', 8)),
    updated_at = now();

  -- Update profiles table to remove plain text tokens and mark connected
  UPDATE public.profiles 
  SET garmin_connected = true,
      garmin_access_token = NULL, 
      garmin_token_secret = NULL,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;