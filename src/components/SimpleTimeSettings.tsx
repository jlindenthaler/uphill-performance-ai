import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Clock, Save } from 'lucide-react';
import { useTimeAvailability } from '@/hooks/useTimeAvailability';
import { toast } from '@/hooks/use-toast';

const DAYS = [
  { name: 'Monday', short: 'Mon' },
  { name: 'Tuesday', short: 'Tue' },
  { name: 'Wednesday', short: 'Wed' },
  { name: 'Thursday', short: 'Thu' },
  { name: 'Friday', short: 'Fri' },
  { name: 'Saturday', short: 'Sat' },
  { name: 'Sunday', short: 'Sun' }
];

const TIME_OPTIONS = [
  { value: '05:00', label: '5:00 AM' },
  { value: '05:30', label: '5:30 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '06:30', label: '6:30 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' }
];

interface DaySchedule {
  trainingHours: number;
  recoveryHours: number;
  trainingTime: string;
  recoveryTime: string;
}

export function SimpleTimeSettings() {
  const { timeAvailability, loading, saveTimeAvailability } = useTimeAvailability();
  const [saving, setSaving] = useState(false);
  
  // Initialize schedule with default values
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, DaySchedule>>(() => {
    const defaultSchedule: Record<string, DaySchedule> = {};
    DAYS.forEach(day => {
      defaultSchedule[day.name] = {
        trainingHours: 2,
        recoveryHours: 1,
        trainingTime: '07:00',
        recoveryTime: '20:00'
      };
    });
    return defaultSchedule;
  });

  // Update schedule when time availability data loads
  useEffect(() => {
    if (timeAvailability) {
      const newSchedule = { ...weeklySchedule };
      DAYS.forEach(day => {
        newSchedule[day.name] = {
          trainingHours: timeAvailability.training_hours_per_day || 2,
          recoveryHours: timeAvailability.recovery_hours_per_day || 1,
          trainingTime: '07:00',
          recoveryTime: '20:00'
        };
      });
      setWeeklySchedule(newSchedule);
    }
  }, [timeAvailability]);

  const updateDaySchedule = (day: string, field: keyof DaySchedule, value: number | string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Calculate average hours for the simple time availability table
      const avgTrainingHours = DAYS.reduce((sum, day) => 
        sum + weeklySchedule[day.name].trainingHours, 0) / DAYS.length;
      
      const avgRecoveryHours = DAYS.reduce((sum, day) => 
        sum + weeklySchedule[day.name].recoveryHours, 0) / DAYS.length;

      await saveTimeAvailability({
        training_hours_per_day: avgTrainingHours,
        recovery_hours_per_day: avgRecoveryHours
      });

      toast({
        title: "Schedule saved",
        description: "Your weekly training schedule has been updated.",
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  if (loading) {
    return (
      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Weekly Training Schedule
        </CardTitle>
        <CardDescription>
          Set your daily training and recovery time preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6">
          {DAYS.map((day) => (
            <div key={day.name} className="space-y-4 p-4 bg-secondary/20 rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground">{day.name}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Training */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Training Duration</Label>
                    <span className="text-sm text-muted-foreground">
                      {formatHours(weeklySchedule[day.name].trainingHours)}
                    </span>
                  </div>
                  <Slider
                    value={[weeklySchedule[day.name].trainingHours]}
                    onValueChange={(value) => updateDaySchedule(day.name, 'trainingHours', value[0])}
                    max={4}
                    min={0}
                    step={0.25}
                    className="w-full"
                  />
                  
                  {weeklySchedule[day.name].trainingHours > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Preferred Start Time</Label>
                      <Select
                        value={weeklySchedule[day.name].trainingTime}
                        onValueChange={(value) => updateDaySchedule(day.name, 'trainingTime', value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time.value} value={time.value} className="text-xs">
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Recovery */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Recovery Duration</Label>
                    <span className="text-sm text-muted-foreground">
                      {formatHours(weeklySchedule[day.name].recoveryHours)}
                    </span>
                  </div>
                  <Slider
                    value={[weeklySchedule[day.name].recoveryHours]}
                    onValueChange={(value) => updateDaySchedule(day.name, 'recoveryHours', value[0])}
                    max={2}
                    min={0}
                    step={0.25}
                    className="w-full"
                  />
                  
                  {weeklySchedule[day.name].recoveryHours > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Preferred Start Time</Label>
                      <Select
                        value={weeklySchedule[day.name].recoveryTime}
                        onValueChange={(value) => updateDaySchedule(day.name, 'recoveryTime', value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time.value} value={time.value} className="text-xs">
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full primary-gradient"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving Schedule...' : 'Save Weekly Schedule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}