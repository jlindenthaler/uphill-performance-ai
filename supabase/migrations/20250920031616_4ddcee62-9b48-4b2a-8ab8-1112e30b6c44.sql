-- Create user profiles table for additional user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  timezone text DEFAULT 'UTC',
  units text DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create external connections table for storing 3rd party integrations
CREATE TABLE IF NOT EXISTS public.external_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('strava', 'trainingpeaks', 'garmin', 'zwift', 'trainerroad', 'mywhoosh')),
  provider_user_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  last_sync timestamp with time zone,
  sync_settings jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS on external_connections table
ALTER TABLE public.external_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for external_connections
CREATE POLICY "Users can view their own connections" 
ON public.external_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections" 
ON public.external_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON public.external_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.external_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for external_connections updated_at
CREATE TRIGGER update_external_connections_updated_at
BEFORE UPDATE ON public.external_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create app settings table for user preferences
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  theme text DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  workout_reminders boolean DEFAULT true,
  data_sharing boolean DEFAULT false,
  auto_sync boolean DEFAULT true,
  default_sport text DEFAULT 'cycling' CHECK (default_sport IN ('cycling', 'running')),
  privacy_mode boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on app_settings table
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for app_settings
CREATE POLICY "Users can view their own settings" 
ON public.app_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.app_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for app_settings updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();