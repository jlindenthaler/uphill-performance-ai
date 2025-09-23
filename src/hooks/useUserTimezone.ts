import { useState, useEffect } from 'react';
import { useUserProfile } from './useSettings';

export function useUserTimezone() {
  const { profile, loading } = useUserProfile();
  const [timezone, setTimezone] = useState<string>('UTC');

  useEffect(() => {
    if (profile?.timezone) {
      setTimezone(profile.timezone);
    } else {
      // Fallback to browser timezone if no user preference is set
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(browserTimezone || 'UTC');
    }
  }, [profile]);

  return {
    timezone,
    loading,
    isUserTimezone: !!profile?.timezone
  };
}