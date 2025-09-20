import React, { createContext, useContext, useState, useEffect } from 'react';

type SportMode = 'cycling' | 'running' | 'swimming';

interface SportModeContextType {
  sportMode: SportMode;
  setSportMode: (mode: SportMode) => void;
  isRunning: boolean;
  isCycling: boolean;
  isSwimming: boolean;
}

const SportModeContext = createContext<SportModeContextType | undefined>(undefined);

export function SportModeProvider({ children }: { children: React.ReactNode }) {
  const [sportMode, setSportModeState] = useState<SportMode>('cycling');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sportMode') as SportMode;
    if (saved === 'cycling' || saved === 'running' || saved === 'swimming') {
      setSportModeState(saved);
    }
  }, []);

  // Save to localStorage when changed
  const setSportMode = (mode: SportMode) => {
    setSportModeState(mode);
    localStorage.setItem('sportMode', mode);
  };

  const isRunning = sportMode === 'running';
  const isCycling = sportMode === 'cycling';
  const isSwimming = sportMode === 'swimming';

  return (
    <SportModeContext.Provider value={{
      sportMode,
      setSportMode,
      isRunning,
      isCycling,
      isSwimming
    }}>
      {children}
    </SportModeContext.Provider>
  );
}

export function useSportMode() {
  const context = useContext(SportModeContext);
  if (!context) {
    throw new Error('useSportMode must be used within SportModeProvider');
  }
  return context;
}