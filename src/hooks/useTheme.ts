import { useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { useAppSettings } from './useSettings';

export function useTheme() {
  const { theme, setTheme } = useNextTheme();
  const { settings, updateSettings } = useAppSettings();

  // Sync database theme setting with next-themes when settings load
  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    }
  }, [settings?.theme, theme, setTheme]);

  // Update database when theme changes through next-themes
  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (settings) {
      await updateSettings({ theme: newTheme });
    }
  };

  return {
    theme,
    setTheme: handleThemeChange,
    resolvedTheme: theme,
  };
}