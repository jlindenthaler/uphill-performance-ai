import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { EnhancedTimeSettings } from '@/components/settings/EnhancedTimeSettings';

interface ScheduleStepProps {
  formData: TrainingPlanFormData;
  setFormData: (data: TrainingPlanFormData) => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export function ScheduleStep({ formData, setFormData }: ScheduleStepProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Weekly Training Availability</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This is a visual reminder of your schedule configured in Settings. Use the button below to modify your availability.
          </p>
        </div>

        <Card className="p-6 bg-muted/30">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Your Current Schedule</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Your training schedule is configured in Settings &gt; Time &amp; Schedule. The AI will use your availability to create an appropriate training plan that fits your lifestyle.
          </p>
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
