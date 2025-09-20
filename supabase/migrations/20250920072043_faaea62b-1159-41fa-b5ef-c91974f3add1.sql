-- Drop external_connections table and related functions
DROP TABLE IF EXISTS public.external_connections CASCADE;
DROP FUNCTION IF EXISTS public.encrypt_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.decrypt_token(text) CASCADE;
DROP VIEW IF EXISTS public.secure_external_connections CASCADE;
DROP FUNCTION IF EXISTS public.upsert_external_connection CASCADE;

-- Add missing DELETE policy for app_settings table
CREATE POLICY "Users can delete their own app settings" 
ON public.app_settings 
FOR DELETE 
USING (auth.uid() = user_id);