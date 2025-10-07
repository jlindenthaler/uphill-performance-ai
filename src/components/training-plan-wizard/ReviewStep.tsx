import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, Target, TrendingUp, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewStepProps {
  formData: TrainingPlanFormData;
  setFormData: (data: TrainingPlanFormData) => void;
}

export function ReviewStep({ formData }: ReviewStepProps) {
  const availableDays = Object.values(formData.weeklyAvailability).filter(
    (day) => day.available
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review & Generate</h3>
        <p className="text-sm text-muted-foreground">
          Review your plan configuration before generating.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Primary Goal</h4>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Event:</span>
            <span className="font-medium">
              {formData.primaryGoal.eventName || 'Not specified'}
            </span>
          </div>
          {formData.primaryGoal.eventDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {format(formData.primaryGoal.eventDate, 'PPP')}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline">{formData.primaryGoal.eventType}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Objective:</span>
            <Badge variant="secondary">{formData.primaryGoal.targetObjective}</Badge>
          </div>
        </div>
      </Card>

      {formData.secondaryGoals.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Secondary Goals</h4>
          <div className="space-y-2">
            {formData.secondaryGoals.map((goal) => (
              <div key={goal.id} className="flex justify-between text-sm">
                <span>{goal.eventName}</span>
                <Badge variant="outline" className="text-xs">
                  Priority {goal.priority}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Weekly Schedule</h4>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Training Days:</span>
            <span className="font-medium">{availableDays} days/week</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Long Session Day:</span>
            <span className="font-medium capitalize">{formData.longSessionDay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target Sessions:</span>
            <span className="font-medium">{formData.sessionsPerWeek}/week</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Plan Structure</h4>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Periodization:</span>
            <Badge variant="outline" className="capitalize">
              {formData.periodizationStyle}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Block Length:</span>
            <span className="font-medium">{formData.blockLength} weeks</span>
          </div>
          {formData.weeklyTLI && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Weekly TLI:</span>
              <span className="font-medium">{formData.weeklyTLI}</span>
            </div>
          )}
          {formData.startWeek && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Date:</span>
              <span className="font-medium">{format(formData.startWeek, 'PP')}</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Adaptation Settings</h4>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">TLI Tolerance:</span>
            <span className="font-medium">±{formData.deviationTolerance.tli}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration Tolerance:</span>
            <span className="font-medium">±{formData.deviationTolerance.duration}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Adjustment Mode:</span>
            <Badge variant="secondary" className="capitalize">
              {formData.adjustmentBehavior}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="bg-primary/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium mb-1">Ready to Generate</p>
            <p className="text-sm text-muted-foreground">
              Click "Generate Plan" to create your personalized training plan. The AI will analyze your baseline, goals, and availability to build a science-based progression.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
