import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, AlertCircle } from 'lucide-react';
import { useAITrainingCoach } from '@/hooks/useAITrainingCoach';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AISessionFeedbackProps {
  activity: any;
  workout?: any;
}

export const AISessionFeedback: React.FC<AISessionFeedbackProps> = ({ 
  activity, 
  workout 
}) => {
  const [feedback, setFeedback] = useState<string>('');
  const { getSessionFeedback, loading, error } = useAITrainingCoach();

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const result = await getSessionFeedback(activity, workout);
        setFeedback(result);
      } catch (err) {
        console.error('Failed to load AI feedback:', err);
      }
    };

    loadFeedback();
  }, [activity.id, workout?.id]);

  if (loading) {
    return (
      <div className="space-y-2 pt-3 border-t mt-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">AI Coach Insight</span>
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-3">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          AI feedback temporarily unavailable
        </AlertDescription>
      </Alert>
    );
  }

  if (!feedback) return null;

  return (
    <div className="space-y-2 pt-3 border-t mt-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-sm font-medium">AI Coach Insight</span>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
        {feedback}
      </div>
    </div>
  );
};
