-- Create secure storage for Garmin tokens (without vault extension)
CREATE TABLE public.encrypted_garmin_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token_hash TEXT NOT NULL,
  token_secret_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.encrypted_garmin_tokens ENABLE ROW LEVEL SECURITY;

-- Create strict policies - only accessible via secure functions
CREATE POLICY "Users can only access tokens via secure functions" 
ON public.encrypted_garmin_tokens 
FOR ALL 
USING (false);

-- Create secure functions for token management using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to store Garmin tokens securely
CREATE OR REPLACE FUNCTION public.store_garmin_tokens_secure(
  p_user_id UUID,
  p_access_token TEXT,
  p_token_secret TEXT
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log for token access
CREATE TABLE public.garmin_token_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false
);

-- Enable RLS on audit log
ALTER TABLE public.garmin_token_access_log ENABLE ROW LEVEL SECURITY;

-- Policy for audit logging
CREATE POLICY "Allow token access logging" 
ON public.garmin_token_access_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_encrypted_garmin_tokens_updated_at
BEFORE UPDATE ON public.encrypted_garmin_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();