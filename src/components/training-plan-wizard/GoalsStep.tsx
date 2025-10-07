import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGoals } from '@/hooks/useGoals';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GoalsStepProps {
  formData: TrainingPlanFormData;
  setFormData: (data: TrainingPlanFormData) => void;
}

const EVENT_TYPES = [
  { value: 'road race', label: 'Road Race' },
  { value: 'time trial', label: 'Time Trial' },
  { value: 'criterium', label: 'Criterium' },
  { value: 'gran fondo', label: 'Gran Fondo' },
  { value: 'stage race', label: 'Stage Race' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'A', label: 'A - Top Priority' },
  { value: 'B', label: 'B - Medium Priority' },
  { value: 'C', label: 'C - Low Priority' }
];

export function GoalsStep({ formData, setFormData }: GoalsStepProps) {
  const { goals } = useGoals();
  const [selectedSecondaryGoalIds, setSelectedSecondaryGoalIds] = useState<string[]>(
    formData.secondaryGoals.filter(sg => sg.goalId).map(sg => sg.goalId!)
  );

  const aGoals = goals.filter(g => g.priority === 'A' && g.status === 'active');
  const bcGoals = goals.filter(g => (g.priority === 'B' || g.priority === 'C') && g.status === 'active');

  const handlePrimaryGoalSelect = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setFormData({
        ...formData,
        primaryGoal: {
          eventName: goal.name,
          eventDate: new Date(goal.event_date),
          eventType: goal.event_type,
          location: goal.location || '',
          priority: 'A',
          targetPerformance: goal.target_performance || '',
          goalId: goal.id,
        }
      });
    }
  };

  const toggleSecondaryGoal = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const isSelected = selectedSecondaryGoalIds.includes(goalId);
    
    if (isSelected) {
      setSelectedSecondaryGoalIds(prev => prev.filter(id => id !== goalId));
      setFormData({
        ...formData,
        secondaryGoals: formData.secondaryGoals.filter(sg => sg.goalId !== goalId)
      });
    } else {
      setSelectedSecondaryGoalIds(prev => [...prev, goalId]);
      setFormData({
        ...formData,
        secondaryGoals: [
          ...formData.secondaryGoals,
          {
            id: crypto.randomUUID(),
            eventName: goal.name,
            eventDate: new Date(goal.event_date),
            priority: goal.priority as 'B' | 'C',
            goalId: goal.id,
          }
        ]
      });
    }
  };

  const addConstraint = () => {
    setFormData({
      ...formData,
      constraints: [
        ...formData.constraints,
        {
          id: crypto.randomUUID(),
          startDate: null,
          endDate: null,
          reason: '',
        },
      ],
    });
  };

  const removeConstraint = (id: string) => {
    setFormData({
      ...formData,
      constraints: formData.constraints.filter(constraint => constraint.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Define Your Training Goals</h3>
        <p className="text-sm text-muted-foreground">
          Select an existing goal or create a new one for your training plan.
        </p>
      </div>

      {/* Existing Goals - Primary (A Priority) */}
      {aGoals.length > 0 && (
        <div className="space-y-3">
          <Label>Select Existing A Priority Goal (Primary)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aGoals.map(goal => (
              <Card
                key={goal.id}
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  formData.primaryGoal.goalId === goal.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                )}
                onClick={() => handlePrimaryGoalSelect(goal.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{goal.name}</h4>
                      <Badge variant="default">A</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(goal.event_date), 'PP')} • {goal.event_type}
                    </p>
                    {goal.location && (
                      <p className="text-xs text-muted-foreground mt-1">{goal.location}</p>
                    )}
                  </div>
                  {formData.primaryGoal.goalId === goal.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Primary Goal - Create New */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Primary Goal (A Priority)</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eventName">Event Name *</Label>
            <Input
              id="eventName"
              value={formData.primaryGoal.eventName}
              onChange={(e) => setFormData({
                ...formData,
                primaryGoal: { ...formData.primaryGoal, eventName: e.target.value, goalId: undefined }
              })}
              placeholder="e.g., Grand Fondo, Marathon"
            />
          </div>

          <div className="space-y-2">
            <Label>Event Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.primaryGoal.eventDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.primaryGoal.eventDate ? (
                    format(formData.primaryGoal.eventDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.primaryGoal.eventDate || undefined}
                  onSelect={(date) => setFormData({
                    ...formData,
                    primaryGoal: { ...formData.primaryGoal, eventDate: date || null, goalId: undefined }
                  })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <Select
              value={formData.primaryGoal.eventType}
              onValueChange={(value) => setFormData({
                ...formData,
                primaryGoal: { ...formData.primaryGoal, eventType: value, goalId: undefined }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.primaryGoal.location || ''}
              onChange={(e) => setFormData({
                ...formData,
                primaryGoal: { ...formData.primaryGoal, location: e.target.value, goalId: undefined }
              })}
              placeholder="City, Country"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetPerformance">Target Performance</Label>
          <Input
            id="targetPerformance"
            value={formData.primaryGoal.targetPerformance || ''}
            onChange={(e) => setFormData({
              ...formData,
              primaryGoal: { ...formData.primaryGoal, targetPerformance: e.target.value, goalId: undefined }
            })}
            placeholder="e.g., Sub 4 hours, Top 10 finish"
          />
        </div>
      </div>

      {/* Secondary Goals - Select from B/C Priority */}
      {bcGoals.length > 0 && (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Secondary Goals (B/C Priority)</h4>
            <p className="text-sm text-muted-foreground">Select one or more secondary goals to incorporate into your plan</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bcGoals.map(goal => (
              <Card
                key={goal.id}
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  selectedSecondaryGoalIds.includes(goal.id)
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                )}
                onClick={() => toggleSecondaryGoal(goal.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{goal.name}</h4>
                      <Badge variant={goal.priority === 'B' ? 'secondary' : 'outline'}>
                        {goal.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(goal.event_date), 'PP')} • {goal.event_type}
                    </p>
                    {goal.location && (
                      <p className="text-xs text-muted-foreground mt-1">{goal.location}</p>
                    )}
                  </div>
                  {selectedSecondaryGoalIds.includes(goal.id) && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              </Card>
            ))}
          </div>

          {selectedSecondaryGoalIds.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No secondary goals selected. The plan will focus on your primary goal.
            </p>
          )}
        </div>
      )}

      {/* Constraints */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Constraints (Optional)</h4>
          <Button type="button" variant="outline" size="sm" onClick={addConstraint}>
            <Plus className="h-4 w-4 mr-2" />
            Add Constraint
          </Button>
        </div>

        {formData.constraints.map((constraint, index) => (
          <Card key={constraint.id} className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium">Constraint {index + 1}</h5>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeConstraint(constraint.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !constraint.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {constraint.startDate ? format(constraint.startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={constraint.startDate || undefined}
                        onSelect={(date) => {
                          const updated = formData.constraints.map(c =>
                            c.id === constraint.id ? { ...c, startDate: date || null } : c
                          );
                          setFormData({ ...formData, constraints: updated });
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !constraint.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {constraint.endDate ? format(constraint.endDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={constraint.endDate || undefined}
                        onSelect={(date) => {
                          const updated = formData.constraints.map(c =>
                            c.id === constraint.id ? { ...c, endDate: date || null } : c
                          );
                          setFormData({ ...formData, constraints: updated });
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={constraint.reason}
                  onChange={(e) => {
                    const updated = formData.constraints.map(c =>
                      c.id === constraint.id ? { ...c, reason: e.target.value } : c
                    );
                    setFormData({ ...formData, constraints: updated });
                  }}
                  placeholder="e.g., Family vacation, work travel"
                />
              </div>
            </div>
          </Card>
        ))}

        {formData.constraints.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No constraints added yet. Add periods when you can't train normally.
          </p>
        )}
      </div>
    </div>
  );
}
