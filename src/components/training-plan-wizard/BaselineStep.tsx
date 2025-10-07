import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLabResults } from '@/hooks/useLabResults';
import { useTrainingHistory } from '@/hooks/useTrainingHistory';
import { Activity, TrendingUp, Heart, Zap, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface BaselineStepProps {
  formData: TrainingPlanFormData;
  setFormData: (data: TrainingPlanFormData) => void;
}

export function BaselineStep({ formData, setFormData }: BaselineStepProps) {
  const { labResults, loading: labLoading } = useLabResults();
  const { trainingHistory } = useTrainingHistory(90);
  const navigate = useNavigate();

  const latestLab = labResults?.[0];
  
  const recentAvgTSS = trainingHistory.length > 0
    ? Math.round(
        trainingHistory.reduce((sum, day) => sum + (day.tss || 0), 0) / trainingHistory.length * 7
      )
    : 0;

  const avgSessionsPerWeek = trainingHistory.length > 0
    ? Math.round(trainingHistory.filter(day => day.tss > 0).length / 12)
    : 0;

  const longestSession = trainingHistory.length > 0
    ? Math.max(...trainingHistory.map(day => day.duration || 0))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Baseline & Athlete Context</h3>
        <p className="text-sm text-muted-foreground">
          The AI will use your current fitness data to build an appropriate plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">Thresholds</h4>
            </div>
            <div className="flex items-center gap-2">
              {latestLab && (
                <Badge variant="outline">
                  {formatDistanceToNow(new Date(latestLab.test_date || latestLab.created_at), {
                    addSuffix: true,
                  })}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigate('/?tab=physiology');
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {labLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : latestLab ? (
            <div className="space-y-2 text-sm">
              {latestLab.vt1_power && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VT1 (AeT):</span>
                  <span className="font-medium">{Math.round(latestLab.vt1_power)}W</span>
                </div>
              )}
              {latestLab.vt2_power && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VT2 (GT):</span>
                  <span className="font-medium">{Math.round(latestLab.vt2_power)}W</span>
                </div>
              )}
              {latestLab.critical_power && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CP:</span>
                  <span className="font-medium">{Math.round(latestLab.critical_power)}W</span>
                </div>
              )}
              {latestLab.vo2_max && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VO₂max:</span>
                  <span className="font-medium">{latestLab.vo2_max} ml/kg/min</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                No lab results found. The AI will use activity-derived thresholds.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/?tab=physiology')}
                className="w-full"
              >
                Add Lab Results
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Recent Training Load</h4>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Weekly TSS:</span>
              <span className="font-medium">{recentAvgTSS}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sessions/Week:</span>
              <span className="font-medium">{avgSessionsPerWeek}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Longest Session:</span>
              <span className="font-medium">{Math.floor(longestSession / 60)}h {longestSession % 60}m</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Training Model</h4>
          </div>

          <p className="text-sm text-muted-foreground">
            Current model will be analyzed from your recent training distribution.
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Additional Data</h4>
          </div>

          <div className="space-y-2 text-sm">
            {latestLab?.max_hr && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max HR:</span>
                <span className="font-medium">{latestLab.max_hr} bpm</span>
              </div>
            )}
            {latestLab?.resting_hr && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resting HR:</span>
                <span className="font-medium">{latestLab.resting_hr} bpm</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          ℹ️ The AI has access to your complete training history and will use this baseline to create a personalized plan that builds appropriately from your current fitness level.
        </p>
      </div>
    </div>
  );
}
