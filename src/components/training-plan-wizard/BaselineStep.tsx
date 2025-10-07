import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLabResults } from '@/hooks/useLabResults';
import { useTrainingHistory } from '@/hooks/useTrainingHistory';
import { Activity, TrendingUp, Heart, Zap, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getUserThresholdPower } from '@/utils/thresholdHierarchy';
import { useAuth } from '@/hooks/useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';
import { useState, useEffect } from 'react';

interface BaselineStepProps {
  formData: TrainingPlanFormData;
  setFormData: (data: TrainingPlanFormData) => void;
}

export function BaselineStep({ formData, setFormData }: BaselineStepProps) {
  const { labResults, loading: labLoading } = useLabResults();
  const { trainingHistory } = useTrainingHistory(90);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const [thresholdData, setThresholdData] = useState<{ value: number; source: string } | null>(null);

  const latestLab = labResults;

  // Fetch threshold data using hierarchy
  useEffect(() => {
    const fetchThreshold = async () => {
      if (!user) return;
      
      try {
        const result = await getUserThresholdPower(user.id, new Date(), sportMode);
        setThresholdData(result);
      } catch (error) {
        console.error('Error fetching threshold:', error);
      }
    };
    
    fetchThreshold();
  }, [user, sportMode, labResults]);
  
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
          ) : (latestLab || thresholdData) ? (
            <div className="space-y-2 text-sm">
              {latestLab?.vt1_power && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aerobic Threshold (AeT):</span>
                  <span className="font-medium">
                    {Math.round(latestLab.vt1_power)}W
                    {(latestLab.vt1_hr || latestLab.lt1_hr) && ` @ ${latestLab.vt1_hr || latestLab.lt1_hr} bpm`}
                  </span>
                </div>
              )}
              {thresholdData && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Glycolytic Threshold (GT):</span>
                  <span className="font-medium">
                    {Math.round(thresholdData.value)}W
                    {(latestLab?.vt2_hr || latestLab?.lt2_hr) && ` @ ${latestLab?.vt2_hr || latestLab?.lt2_hr} bpm`}
                  </span>
                </div>
              )}
              {latestLab?.map_value && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MAP (Maximal Aerobic Power):</span>
                  <span className="font-medium">
                    {Math.round(latestLab.map_value)}W
                    {latestLab.max_hr && ` @ ${latestLab.max_hr} bpm`}
                  </span>
                </div>
              )}
              {latestLab?.vo2_max && (
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
            <Heart className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Heart Rate Data</h4>
          </div>

          {latestLab?.max_hr || latestLab?.resting_hr ? (
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
              {latestLab?.vt1_hr && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VT1 HR:</span>
                  <span className="font-medium">{latestLab.vt1_hr} bpm</span>
                </div>
              )}
              {latestLab?.vt2_hr && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VT2 HR:</span>
                  <span className="font-medium">{latestLab.vt2_hr} bpm</span>
                </div>
              )}
              {latestLab?.lt1_hr && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LT1 HR:</span>
                  <span className="font-medium">{latestLab.lt1_hr} bpm</span>
                </div>
              )}
              {latestLab?.lt2_hr && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LT2 HR:</span>
                  <span className="font-medium">{latestLab.lt2_hr} bpm</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No heart rate data available. Add lab results for HR-based training zones.
            </p>
          )}
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
