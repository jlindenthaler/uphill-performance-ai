import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface AdaptationStepProps {
  formData: TrainingPlanFormData;
  setFormData: (data: TrainingPlanFormData) => void;
}

export function AdaptationStep({ formData, setFormData }: AdaptationStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Adaptation & Monitoring</h3>
        <p className="text-sm text-muted-foreground">
          Configure how the plan adapts based on your actual training.
        </p>
      </div>

      <Card className="p-4">
        <h4 className="font-semibold mb-4">Deviation Tolerance</h4>
        <p className="text-sm text-muted-foreground mb-4">
          How much variance from planned sessions before triggering adjustments?
        </p>

        <div className="space-y-4">
          <div>
            <Label>TLI Tolerance: ±{formData.deviationTolerance.tli}%</Label>
            <Slider
              value={[formData.deviationTolerance.tli]}
              onValueChange={([value]) =>
                setFormData({
                  ...formData,
                  deviationTolerance: {
                    ...formData.deviationTolerance,
                    tli: value,
                  },
                })
              }
              min={5}
              max={30}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Duration Tolerance: ±{formData.deviationTolerance.duration}%</Label>
            <Slider
              value={[formData.deviationTolerance.duration]}
              onValueChange={([value]) =>
                setFormData({
                  ...formData,
                  deviationTolerance: {
                    ...formData.deviationTolerance,
                    duration: value,
                  },
                })
              }
              min={5}
              max={30}
              step={5}
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-semibold mb-4">Feedback Sources</h4>
        <p className="text-sm text-muted-foreground mb-4">
          What data should the AI use to assess your readiness and recovery?
        </p>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.feedbackSources.hrv}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  feedbackSources: {
                    ...formData.feedbackSources,
                    hrv: checked as boolean,
                  },
                })
              }
            />
            <Label>HRV / Resting Heart Rate</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.feedbackSources.zoneDistribution}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  feedbackSources: {
                    ...formData.feedbackSources,
                    zoneDistribution: checked as boolean,
                  },
                })
              }
            />
            <Label>Zone Distribution & HR Decoupling</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.feedbackSources.rpe}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  feedbackSources: {
                    ...formData.feedbackSources,
                    rpe: checked as boolean,
                  },
                })
              }
            />
            <Label>Manual RPE Check-ins</Label>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-semibold mb-4">Adjustment Behavior</h4>
        <p className="text-sm text-muted-foreground mb-4">
          How should the plan respond to deviations?
        </p>

        <RadioGroup
          value={formData.adjustmentBehavior}
          onValueChange={(value: 'passive' | 'active') =>
            setFormData({ ...formData, adjustmentBehavior: value })
          }
        >
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <RadioGroupItem value="passive" id="passive" />
            <div>
              <Label htmlFor="passive" className="font-medium">
                Passive
              </Label>
              <p className="text-sm text-muted-foreground">
                Flag deviations but don't modify the plan automatically
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <RadioGroupItem value="active" id="active" />
            <div>
              <Label htmlFor="active" className="font-medium">
                Active
              </Label>
              <p className="text-sm text-muted-foreground">
                Auto-adjust plan to keep load trajectory on track
              </p>
            </div>
          </div>
        </RadioGroup>
      </Card>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 Active adjustment keeps your plan aligned with your actual capacity while maintaining the overall progression toward your goal.
        </p>
      </div>
    </div>
  );
}
