import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { GoalsStep } from './training-plan-wizard/GoalsStep';
import { ScheduleStep } from './training-plan-wizard/ScheduleStep';
import { BaselineStep } from './training-plan-wizard/BaselineStep';
import { StructureStep } from './training-plan-wizard/StructureStep';
import { AdaptationStep } from './training-plan-wizard/AdaptationStep';
import { ReviewStep } from './training-plan-wizard/ReviewStep';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';

interface AITrainingPlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface TrainingPlanFormData {
  // Step 1: Goals
  primaryGoal: {
    eventName: string;
    eventDate: Date | null;
    eventType: string;
    location?: string;
    priority?: 'A' | 'B' | 'C';
    targetPerformance?: string;
    courseFile?: File;
    cda?: number;
    weight?: number;
    drivetrainLoss?: number;
    goalId?: string; // Reference to existing goal
  };
  secondaryGoals: Array<{
    id: string;
    eventName: string;
    eventDate: Date | null;
    priority: 'B' | 'C';
    goalId?: string; // Reference to existing goal
  }>;
  constraints: Array<{
    id: string;
    startDate: Date | null;
    endDate: Date | null;
    reason: string;
  }>;
  
  // Step 2: Schedule
  weeklyAvailability: {
    [key: string]: {
      available: boolean;
      timeSlots: Array<'AM' | 'PM'>;
      notes?: string;
    };
  };
  longSessionDay: string;
  
  // Step 3: Baseline
  useCurrentBaseline: boolean;
  
  // Step 4: Structure
  periodizationStyle: 'auto' | 'polarized' | 'pyramidal' | 'threshold';
  blockLength: number;
  sessionsPerWeek: number;
  weeklyTLI?: number;
  startWeek: Date | null;
  blocks: Array<{
    id: string;
    name: string;
    duration: number;
    intent: string;
  }>;
  
  // Step 5: Adaptation
  deviationTolerance: {
    tli: number;
    duration: number;
  };
  feedbackSources: {
    hrv: boolean;
    zoneDistribution: boolean;
    rpe: boolean;
  };
  adjustmentBehavior: 'passive' | 'active';
}

const STEPS = [
  { id: 1, name: 'Goals', component: GoalsStep },
  { id: 2, name: 'Schedule', component: ScheduleStep },
  { id: 3, name: 'Baseline', component: BaselineStep },
  { id: 4, name: 'Structure', component: StructureStep },
  { id: 5, name: 'Adaptation', component: AdaptationStep },
  { id: 6, name: 'Review', component: ReviewStep },
];

export function AITrainingPlanWizard({ open, onOpenChange }: AITrainingPlanWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { generatePlan, loading } = useTrainingPlan();
  const [formData, setFormData] = useState<TrainingPlanFormData>({
    primaryGoal: {
      eventName: '',
      eventDate: null,
      eventType: 'road race',
      priority: 'A',
    },
    secondaryGoals: [],
    constraints: [],
    weeklyAvailability: {
      monday: { available: true, timeSlots: [] },
      tuesday: { available: true, timeSlots: [] },
      wednesday: { available: true, timeSlots: [] },
      thursday: { available: true, timeSlots: [] },
      friday: { available: true, timeSlots: [] },
      saturday: { available: true, timeSlots: [] },
      sunday: { available: true, timeSlots: [] },
    },
    longSessionDay: 'saturday',
    useCurrentBaseline: true,
    periodizationStyle: 'auto',
    blockLength: 3,
    sessionsPerWeek: 5,
    startWeek: null,
    blocks: [],
    deviationTolerance: {
      tli: 10,
      duration: 15,
    },
    feedbackSources: {
      hrv: true,
      zoneDistribution: true,
      rpe: true,
    },
    adjustmentBehavior: 'active',
  });

  const progress = (currentStep / STEPS.length) * 100;
  const CurrentStepComponent = STEPS[currentStep - 1].component;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    const plan = await generatePlan(formData);
    if (plan) {
      setCurrentStep(1);
      onOpenChange(false);
      // Reset form
      setFormData({
        primaryGoal: {
          eventName: '',
          eventDate: null,
          eventType: 'road race',
          priority: 'A',
        },
        secondaryGoals: [],
        constraints: [],
        weeklyAvailability: {
          monday: { available: true, timeSlots: [] },
          tuesday: { available: true, timeSlots: [] },
          wednesday: { available: true, timeSlots: [] },
          thursday: { available: true, timeSlots: [] },
          friday: { available: true, timeSlots: [] },
          saturday: { available: true, timeSlots: [] },
          sunday: { available: true, timeSlots: [] },
        },
        longSessionDay: 'saturday',
        useCurrentBaseline: true,
        periodizationStyle: 'auto',
        blockLength: 3,
        sessionsPerWeek: 5,
        startWeek: null,
        blocks: [],
        deviationTolerance: {
          tli: 10,
          duration: 15,
        },
        feedbackSources: {
          hrv: true,
          zoneDistribution: true,
          rpe: true,
        },
        adjustmentBehavior: 'active',
      });
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create AI Training Plan</DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            {STEPS.map((step, index) => (
              <span
                key={step.id}
                className={`${
                  currentStep === step.id
                    ? 'text-primary font-semibold'
                    : currentStep > step.id
                    ? 'text-foreground'
                    : ''
                }`}
              >
                {step.name}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          <CurrentStepComponent
            formData={formData}
            setFormData={setFormData}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                'Generate Plan'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
