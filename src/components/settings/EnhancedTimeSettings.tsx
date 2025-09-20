import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock } from "lucide-react";
import { useEnhancedTimeAvailability } from "@/hooks/useEnhancedTimeAvailability";

const timeSlots = [
  { value: 'early-morning', label: 'Early Morning (5-7 AM)' },
  { value: 'morning', label: 'Morning (7-10 AM)' },
  { value: 'late-morning', label: 'Late Morning (10-12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12-3 PM)' },
  { value: 'late-afternoon', label: 'Late Afternoon (3-6 PM)' },
  { value: 'evening', label: 'Evening (6-8 PM)' },
  { value: 'night', label: 'Night (8-10 PM)' }
];

const days = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

export function EnhancedTimeSettings() {
  const { weeklyAvailability, loading, saveWeeklyAvailability, updateDayAvailability } = useEnhancedTimeAvailability();

  const handleTrainingHoursChange = (day: any, hours: string) => {
    updateDayAvailability(day, { training_hours: parseFloat(hours) });
  };

  const handleRecoveryHoursChange = (day: any, hours: string) => {
    updateDayAvailability(day, { recovery_hours: parseFloat(hours) });
  };

  const handleTrainingTimeChange = (day: any, times: string[]) => {
    updateDayAvailability(day, { preferred_training_times: times });
  };

  const handleRecoveryTimeChange = (day: any, times: string[]) => {
    updateDayAvailability(day, { preferred_recovery_times: times });
  };

  const handleSave = async () => {
    try {
      await saveWeeklyAvailability(weeklyAvailability);
    } catch (error) {
      console.error('Error saving weekly availability:', error);
    }
  };

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Weekly Time Availability
        </CardTitle>
        <CardDescription>
          Set your training and recovery time preferences for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6">
          {days.map((day) => {
            const dayData = weeklyAvailability[day.key as keyof typeof weeklyAvailability];
            
            return (
              <div key={day.key} className="p-4 border rounded-lg space-y-4">
                <h4 className="font-medium text-lg">{day.label}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Training */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Training</Label>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`training-hours-${day.key}`} className="text-xs text-muted-foreground">
                        Available Hours
                      </Label>
                      <Select
                        value={dayData.training_hours.toString()}
                        onValueChange={(value) => handleTrainingHoursChange(day.key, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Rest Day</SelectItem>
                          <SelectItem value="0.5">30 minutes</SelectItem>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="1.5">1.5 hours</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="2.5">2.5 hours</SelectItem>
                          <SelectItem value="3">3 hours</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="5">5+ hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Preferred Times</Label>
                      <div className="space-y-1">
                        {timeSlots.map((slot) => (
                          <div key={slot.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`training-${day.key}-${slot.value}`}
                              checked={dayData.preferred_training_times.includes(slot.value)}
                              onCheckedChange={(checked) => {
                                const times = checked
                                  ? [...dayData.preferred_training_times, slot.value]
                                  : dayData.preferred_training_times.filter(t => t !== slot.value);
                                handleTrainingTimeChange(day.key, times);
                              }}
                            />
                            <Label
                              htmlFor={`training-${day.key}-${slot.value}`}
                              className="text-xs"
                            >
                              {slot.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recovery */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Recovery</Label>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`recovery-hours-${day.key}`} className="text-xs text-muted-foreground">
                        Available Hours
                      </Label>
                      <Select
                        value={dayData.recovery_hours.toString()}
                        onValueChange={(value) => handleRecoveryHoursChange(day.key, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No recovery</SelectItem>
                          <SelectItem value="0.25">15 minutes</SelectItem>
                          <SelectItem value="0.5">30 minutes</SelectItem>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="1.5">1.5 hours</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="3">3+ hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Preferred Times</Label>
                      <div className="space-y-1">
                        {timeSlots.map((slot) => (
                          <div key={slot.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`recovery-${day.key}-${slot.value}`}
                              checked={dayData.preferred_recovery_times.includes(slot.value)}
                              onCheckedChange={(checked) => {
                                const times = checked
                                  ? [...dayData.preferred_recovery_times, slot.value]
                                  : dayData.preferred_recovery_times.filter(t => t !== slot.value);
                                handleRecoveryTimeChange(day.key, times);
                              }}
                            />
                            <Label
                              htmlFor={`recovery-${day.key}-${slot.value}`}
                              className="text-xs"
                            >
                              {slot.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={handleSave} className="w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Save Weekly Schedule'}
        </Button>
      </CardContent>
    </Card>
  );
}