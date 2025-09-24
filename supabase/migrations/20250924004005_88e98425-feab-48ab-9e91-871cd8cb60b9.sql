-- Create secure storage for Garmin tokens using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table for encrypted tokens
CREATE TABLE public.secure_garmin_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  encrypted_access_token TEXT,
  encrypted_token_secret TEXT,
  token_hash TEXT, -- For integrity verification
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS with strict policies
ALTER TABLE public.secure_garmin_tokens ENABLE ROW LEVEL SECURITY;

-- Create very restrictive policies
CREATE POLICY "Deny all direct access to encrypted tokens" 
ON public.secure_garmin_tokens 
FOR ALL 
USING (false);

-- Create secure functions for token management
CREATE OR REPLACE FUNCTION public.store_garmin_tokens_secure(
  p_user_id UUID,
  p_access_token TEXT,
  p_token_secret TEXT
) RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  encryption_key TEXT := 'garmin_key_' || p_user_id::text;
  token_data TEXT := p_access_token || '|' || p_token_secret;
BEGIN
  -- Verify user authorization
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Store encrypted tokens
  INSERT INTO public.secure_garmin_tokens (
    user_id, 
    encrypted_access_token, 
    encrypted_token_secret,
    token_hash
  ) VALUES (
    p_user_id,
    encode(encrypt(p_access_token::bytea, encryption_key, 'aes'), 'base64'),
    encode(encrypt(p_token_secret::bytea, encryption_key, 'aes'), 'base64'),
    encode(digest(token_data, 'sha256'), 'hex')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    encrypted_access_token = encode(encrypt(p_access_token::bytea, encryption_key, 'aes'), 'base64'),
    encrypted_token_secret = encode(encrypt(p_token_secret::bytea, encryption_key, 'aes'), 'base64'),
    token_hash = encode(digest(token_data, 'sha256'), 'hex'),
    updated_at = now();

  -- Update profiles to clear plain text tokens and mark as connected
  UPDATE public.profiles 
  SET garmin_connected = true,
      garmin_access_token = NULL,
      garmin_token_secret = NULL
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_garmin_tokens_secure(p_user_id UUID)
RETURNS TABLE(access_token TEXT, token_secret TEXT) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
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

-- Create audit table for token access
CREATE TABLE public.token_access_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.token_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own audit logs" 
ON public.token_access_audit 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add trigger for timestamp updates
CREATE TRIGGER update_secure_garmin_tokens_updated_at
BEFORE UPDATE ON public.secure_garmin_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();