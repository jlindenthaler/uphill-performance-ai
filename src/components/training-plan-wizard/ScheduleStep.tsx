import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

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
  const toggleDay = (day: string) => {
    setFormData({
      ...formData,
      weeklyAvailability: {
        ...formData.weeklyAvailability,
        [day]: {
          ...formData.weeklyAvailability[day],
          available: !formData.weeklyAvailability[day].available,
        },
      },
    });
  };

  const toggleTimeSlot = (day: string, slot: 'AM' | 'PM') => {
    const currentSlots = formData.weeklyAvailability[day].timeSlots;
    const newSlots = currentSlots.includes(slot)
      ? currentSlots.filter((s) => s !== slot)
      : [...currentSlots, slot];

    setFormData({
      ...formData,
      weeklyAvailability: {
        ...formData.weeklyAvailability,
        [day]: {
          ...formData.weeklyAvailability[day],
          timeSlots: newSlots,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Weekly Training Availability</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select when you can train each day. This helps the AI create a realistic schedule.
        </p>
      </div>

      <div className="space-y-3">
        {DAYS.map(({ key, label }) => (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={formData.weeklyAvailability[key].available}
                  onCheckedChange={() => toggleDay(key)}
                />
                <Label className="font-medium">{label}</Label>
              </div>

              {formData.weeklyAvailability[key].available && (
                <div className="flex gap-2">
                  <Button
                    variant={
                      formData.weeklyAvailability[key].timeSlots.includes('AM')
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => toggleTimeSlot(key, 'AM')}
                  >
                    AM
                  </Button>
                  <Button
                    variant={
                      formData.weeklyAvailability[key].timeSlots.includes('PM')
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => toggleTimeSlot(key, 'PM')}
                  >
                    PM
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div>
        <Label>Preferred Long Session Day</Label>
        <Select
          value={formData.longSessionDay}
          onValueChange={(value) =>
            setFormData({ ...formData, longSessionDay: value })
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map(({ key, label }) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-2">
          This day will be prioritized for longer endurance sessions
        </p>
      </div>

      <div className="border-t pt-4">
        <Button variant="outline" className="w-full">
          <Settings className="mr-2 h-4 w-4" />
          Edit in Settings
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Save these settings permanently for all future plans
        </p>
      </div>
    </div>
  );
}
