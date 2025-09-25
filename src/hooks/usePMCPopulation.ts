import { useEffect, useState } from 'react';
import { useAuth } from './useSupabase';
import { populateTrainingHistory } from '@/utils/pmcCalculator';

export function usePMCPopulation() {
  const { user } = useAuth();
  const [isPopulated, setIsPopulated] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);

  const populatePMCData = async () => {
    if (!user || isPopulating) return;

    setIsPopulating(true);
    try {
      console.log('Populating PMC data for user...');
      await populateTrainingHistory(user.id);
      setIsPopulated(true);
      console.log('PMC data population completed');
    } catch (error) {
      console.error('Failed to populate PMC data:', error);
      // Don't set isPopulated to true on error, but also don't prevent retry
    } finally {
      setIsPopulating(false);
    }
  };

  useEffect(() => {
    if (user && !isPopulated && !isPopulating) {
      // Small delay to ensure activities are loaded first
      const timeoutId = setTimeout(() => {
        populatePMCData();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, isPopulated, isPopulating]);

  return {
    isPopulated,
    isPopulating,
    populatePMCData
  };
}