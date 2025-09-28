import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Plus, RefreshCw } from 'lucide-react';
import { useAITrainingCoach } from '@/hooks/useAITrainingCoach';

interface AICoachRecommendationProps {
  onNavigate: (section: string) => void;
  currentTSB: number;
  tsbStatus: string;
}

export const AICoachRecommendation: React.FC<AICoachRecommendationProps> = ({
  onNavigate,
  currentTSB,
  tsbStatus
}) => {
  const [recommendation, setRecommendation] = useState<string>('');
  const { getDailyRecommendation, loading, error } = useAITrainingCoach();

  const fetchRecommendation = async () => {
    try {
      const response = await getDailyRecommendation();
      setRecommendation(response);
    } catch (err) {
      console.error('Failed to get AI recommendation:', err);
      // Fallback recommendation based on TSB
      const fallback = getFallbackRecommendation(currentTSB, tsbStatus);
      setRecommendation(fallback);
    }
  };

  useEffect(() => {
    fetchRecommendation();
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
          onClick={fetchRecommendation}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">
          {recommendation}
        </p>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={() => onNavigate('workouts')}>
          <Plus className="w-4 h-4 mr-1" />
          Plan Session
        </Button>
        <Button variant="outline" size="sm" onClick={fetchRecommendation} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Advice'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive mt-2">
          AI temporarily unavailable - showing personalized fallback
        </p>
      )}
    </div>
  );
};