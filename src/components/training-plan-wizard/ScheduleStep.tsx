import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { EnhancedTimeSettings } from '@/components/settings/EnhancedTimeSettings';
import { useEnhancedTimeAvailability } from '@/hooks/useEnhancedTimeAvailability';

interface ScheduleStepProps {
  formData: TrainingPlanFormData;
  setFormData: (data: TrainingPlanFormData) => void;
}

const DAYS = [
  { key: 0, label: 'Monday', short: 'Mon' },
  { key: 1, label: 'Tuesday', short: 'Tue' },
  { key: 2, label: 'Wednesday', short: 'Wed' },
  { key: 3, label: 'Thursday', short: 'Thu' },
  { key: 4, label: 'Friday', short: 'Fri' },
  { key: 5, label: 'Saturday', short: 'Sat' },
  { key: 6, label: 'Sunday', short: 'Sun' },
];

export function ScheduleStep({ formData, setFormData }: ScheduleStepProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { weeklyAvailability, loading } = useEnhancedTimeAvailability();

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Weekly Training Availability</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This is a visual reminder of your schedule configured in Settings. Use the button below to modify your availability.
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Your Current Weekly Schedule</h4>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading schedule...</p>
          ) : (
            <div className="space-y-3">
              {DAYS.map(day => {
                const dayAvailability = weeklyAvailability[day.label.toLowerCase()];
                const hasTraining = dayAvailability?.trainingHours > 0;
                const hasRecovery = dayAvailability?.recoveryHours > 0;
                
                return (
                  <div key={day.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="font-medium w-24">{day.label}</span>
                      <div className="flex gap-4 text-sm">
                        {hasTraining && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-muted-foreground">
                              Training: {dayAvailability.trainingHours}h
                            </span>
                          </div>
                        )}
                        {hasRecovery && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-secondary" />
                            <span className="text-muted-foreground">
                              Recovery: {dayAvailability.recoveryHours}h
                            </span>
                          </div>
                        )}
                        {!hasTraining && !hasRecovery && (
                          <span className="text-muted-foreground">No availability</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            ℹ️ The AI will analyze your available time windows and create sessions that fit your schedule while maximizing training effectiveness.
          </p>
        </div>

        <div className="border-t pt-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit in Settings
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Configure your training availability for all future plans
          </p>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Time &amp; Schedule Settings</DialogTitle>
          </DialogHeader>
          <EnhancedTimeSettings />
        </DialogContent>
      </Dialog>
    </>
  );
}
