import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Plus, RefreshCw } from 'lucide-react';
import { useAITrainingCoach } from '@/hooks/useAITrainingCoach';
import { useAuth } from '@/hooks/useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';

interface AICoachRecommendationProps {
  onNavigate: (section: string) => void;
  currentTSB: number;
  tsbStatus: string;
}

const CACHE_KEY_PREFIX = 'ai_coach_recommendation';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface CachedRecommendation {
  recommendation: string;
  timestamp: number;
  tsb: number;
}

export const AICoachRecommendation: React.FC<AICoachRecommendationProps> = ({
  onNavigate,
  currentTSB,
  tsbStatus
}) => {
  const [recommendation, setRecommendation] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { getDailyRecommendation, loading, error } = useAITrainingCoach();
  const { user } = useAuth();
  const { sportMode } = useSportMode();

  const getCacheKey = () => `${CACHE_KEY_PREFIX}_${user?.id}_${sportMode}`;

  const loadFromCache = (): CachedRecommendation | null => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) {
        console.log('[AI Coach Cache] Miss: No cached data found');
        return null;
      }
      const parsed = JSON.parse(cached);
      const ageMinutes = Math.round((Date.now() - parsed.timestamp) / 1000 / 60);
      const tsbDrift = Math.abs(parsed.tsb - currentTSB);
      console.log('[AI Coach Cache] Hit:', { ageMinutes, tsbDrift, currentTSB, cachedTSB: parsed.tsb });
      return parsed;
    } catch (err) {
      console.error('[AI Coach Cache] Parse error:', err);
      return null;
    }
  };

  const saveToCache = (rec: string) => {
    try {
      const cached: CachedRecommendation = {
        recommendation: rec,
        timestamp: Date.now(),
        tsb: currentTSB
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(cached));
      console.log('[AI Coach Cache] Saved:', { tsb: currentTSB, length: rec.length });
    } catch (err) {
      console.error('[AI Coach Cache] Failed to save:', err);
    }
  };

  const fetchRecommendation = async (forceRefresh = false) => {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        const age = Date.now() - cached.timestamp;
        const tsbChanged = Math.abs(cached.tsb - currentTSB) > 5;
        
        // Use cache if fresh and TSB hasn't changed significantly
        if (age < CACHE_DURATION_MS && !tsbChanged) {
          console.log('[AI Coach Cache] Using cached recommendation');
          setRecommendation(cached.recommendation);
          setIsInitialLoad(false);
          return;
        } else {
          console.log('[AI Coach Cache] Invalidated:', { ageExpired: age >= CACHE_DURATION_MS, tsbChanged });
        }
      }
    }

    // Fetch new recommendation
    try {
      console.log('[AI Coach] Fetching new recommendation...');
      const response = await getDailyRecommendation();
      console.log('[AI Coach] Received response:', response?.substring(0, 100));
      setRecommendation(response);
      saveToCache(response);
    } catch (err) {
      console.error('[AI Coach] Failed to get recommendation:', err);
      const fallback = getFallbackRecommendation(currentTSB, tsbStatus);
      setRecommendation(fallback);
      saveToCache(fallback);
    } finally {
      setIsInitialLoad(false);
    }
  };

  // Initial load effect - only runs on mount or when user/sport changes
  useEffect(() => {
    if (user) {
      console.log('[AI Coach] Initial load triggered');
      fetchRecommendation();
    }
  }, [user, sportMode]);

  // TSB change effect - invalidates cache if TSB drifts significantly
  useEffect(() => {
    if (!user || isInitialLoad) return;
    
    const cached = loadFromCache();
    if (cached) {
      const tsbChanged = Math.abs(cached.tsb - currentTSB) > 5;
      if (tsbChanged) {
        console.log('[AI Coach] TSB drift detected, refreshing...');
        fetchRecommendation(true);
      }
    }
  }, [currentTSB]);

  const getFallbackRecommendation = (tsb: number, status: string): string => {
    if (tsb > 15) {
      return "You're feeling fresh! Consider a high-intensity session or skills work to capitalize on your recovered state.";
    } else if (tsb > 5) {
      return "You're well-rested and ready for quality training. A threshold or tempo session would be ideal today.";
    } else if (tsb > -10) {
      return "Your form is balanced. Focus on steady aerobic work in Zone 2 to build your aerobic base.";
    } else if (tsb > -20) {
      return "You're carrying some fatigue. Consider an easy recovery session or active rest to help your body adapt.";
    } else {
      return "You're quite fatigued. Prioritize recovery today - easy movement, stretching, or complete rest.";
    }
  };

  return (
    <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4" />
          AI Coach Recommendation
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchRecommendation(true)}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {(loading || isInitialLoad) && !recommendation ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">
          {recommendation}
        </p>
      )}

      <Button size="sm" onClick={() => onNavigate('workouts')}>
        <Plus className="w-4 h-4 mr-1" />
        Plan Session
      </Button>

      {error && (
        <p className="text-xs text-destructive mt-2">
          AI temporarily unavailable - showing personalized fallback
        </p>
      )}
    </div>
  );
};