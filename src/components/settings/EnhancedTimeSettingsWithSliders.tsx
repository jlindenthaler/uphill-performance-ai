import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Timer } from "lucide-react";
import { useEnhancedTimeAvailability } from "@/hooks/useEnhancedTimeAvailability";

const days = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

const timeOptions = [
  { value: '05:00', label: '5:00 AM' },
  { value: '05:30', label: '5:30 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '06:30', label: '6:30 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '07:30', label: '7:30 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '20:30', label: '8:30 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '21:30', label: '9:30 PM' },
  { value: '22:00', label: '10:00 PM' }
];

export function EnhancedTimeSettingsWithSliders() {
  const { weeklyAvailability, loading, saveWeeklyAvailability, updateDayAvailability } = useEnhancedTimeAvailability();

  const handleTrainingHoursChange = (day: keyof typeof weeklyAvailability, hours: number[]) => {
    updateDayAvailability(day, { training_hours: hours[0] });
  };

  const handleRecoveryHoursChange = (day: keyof typeof weeklyAvailability, hours: number[]) => {
    updateDayAvailability(day, { recovery_hours: hours[0] });
  };

  const handleTrainingTimeChange = (day: keyof typeof weeklyAvailability, time: string) => {
    updateDayAvailability(day, { preferred_training_times: [time] });
  };

  const handleRecoveryTimeChange = (day: keyof typeof weeklyAvailability, time: string) => {
    updateDayAvailability(day, { preferred_recovery_times: [time] });
  };

  const handleSave = async () => {
    try {
      await saveWeeklyAvailability(weeklyAvailability);
    } catch (error) {
      console.error('Error saving weekly availability:', error);
    }
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return "Rest Day";
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours === 1) return "1 hour";
    return `${hours} hours`;
  };

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Weekly Time Availability
        </CardTitle>
        <CardDescription>
          Set your training and recovery time preferences using sliders and time selection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6">
          {days.map((day) => {
            const dayData = weeklyAvailability[day.key as keyof typeof weeklyAvailability];
            
            return (
              <div key={day.key} className="p-6 border rounded-lg bg-card space-y-6">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  {day.label}
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Training */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <Label className="text-sm font-medium">Training Session</Label>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs text-muted-foreground">Duration</Label>
                          <span className="text-xs font-medium text-blue-600">
                            {formatHours(dayData.training_hours)}
                          </span>
                        </div>
                        <Slider
                          value={[dayData.training_hours]}
                          onValueChange={(value) => handleTrainingHoursChange(day.key as keyof typeof weeklyAvailability, value)}
                          max={5}
                          min={0}
                          step={0.25}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Rest</span>
                          <span>5h+</span>
                        </div>
                      </div>

                      {dayData.training_hours > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Preferred Start Time</Label>
                          <Select
                            value={dayData.preferred_training_times[0] || ''}
                            onValueChange={(value) => handleTrainingTimeChange(day.key as keyof typeof weeklyAvailability, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recovery */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <Label className="text-sm font-medium">Recovery Session</Label>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs text-muted-foreground">Duration</Label>
                          <span className="text-xs font-medium text-green-600">
                            {formatHours(dayData.recovery_hours)}
                          </span>
                        </div>
                        <Slider
                          value={[dayData.recovery_hours]}
                          onValueChange={(value) => handleRecoveryHoursChange(day.key as keyof typeof weeklyAvailability, value)}
                          max={3}
                          min={0}
                          step={0.25}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>None</span>
                          <span>3h+</span>
                        </div>
                      </div>

                      {dayData.recovery_hours > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Preferred Start Time</Label>
                          <Select
                            value={dayData.preferred_recovery_times[0] || ''}
                            onValueChange={(value) => handleRecoveryTimeChange(day.key as keyof typeof weeklyAvailability, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
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