import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, X, Check, Edit, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGoals } from '@/hooks/useGoals';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  { value: 'A', label: 'Priority A' },
  { value: 'B', label: 'Priority B' },
  { value: 'C', label: 'Priority C' }
];

export function GoalsStep({ formData, setFormData }: GoalsStepProps) {
  const { goals, updateGoal } = useGoals();
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeGoals = goals.filter(g => g.status === 'active');

  const handleGoalSelect = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setFormData({
        ...formData,
        primaryGoal: {
          eventName: goal.name,
          eventDate: new Date(goal.event_date),
          eventType: goal.event_type,
          location: goal.location || '',
          priority: goal.priority as 'A' | 'B' | 'C',
          targetPerformance: goal.target_performance || '',
          goalId: goal.id,
        }
      });
      setEditMode(false);
    }
  };

  const handleEditGoal = () => {
    setEditMode(true);
  };

  const handleSaveGoal = async () => {
    if (!formData.primaryGoal.goalId) return;
    
    setSaving(true);
    try {
      await updateGoal(formData.primaryGoal.goalId, {
        name: formData.primaryGoal.eventName,
        event_date: formData.primaryGoal.eventDate?.toISOString().split('T')[0] || '',
        event_type: formData.primaryGoal.eventType,
        location: formData.primaryGoal.location,
        priority: formData.primaryGoal.priority || 'A',
        target_performance: formData.primaryGoal.targetPerformance,
      });
      toast.success('Goal updated successfully');
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to update goal');
    } finally {
      setSaving(false);
    }
  };

  const addSecondaryGoal = () => {
    setFormData({
      ...formData,
      secondaryGoals: [
        ...formData.secondaryGoals,
        {
          id: crypto.randomUUID(),
          eventName: '',
          eventDate: null,
          priority: 'B',
        },
      ],
    });
  };

  const removeSecondaryGoal = (id: string) => {
    setFormData({
      ...formData,
      secondaryGoals: formData.secondaryGoals.filter(goal => goal.id !== id),
    });
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
      {/* Existing Goals Selection */}
      {activeGoals.length > 0 && !showCreateNew && !editMode && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select from Existing Goals</h3>
          
          <div className="space-y-3">
            {activeGoals.map(goal => (
              <Card
                key={goal.id}
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  formData.primaryGoal.goalId === goal.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                )}
                onClick={() => handleGoalSelect(goal.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{goal.name}</h4>
                      <Badge variant={
                        goal.priority === 'A' ? 'default' :
                        goal.priority === 'B' ? 'secondary' :
                        'outline'
                      }>
                        Priority {goal.priority}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>📅 {format(new Date(goal.event_date), 'MMMM d, yyyy')}</div>
                      <div>🏁 {goal.event_type}</div>
                      {goal.location && <div>📍 {goal.location}</div>}
                      {goal.target_performance && <div>🎯 {goal.target_performance}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {formData.primaryGoal.goalId === goal.id && (
                      <>
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditGoal();
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => setShowCreateNew(true)}
            className="w-full"
          >
            Create New Goal Instead
          </Button>
        </div>
      )}

      {/* Create/Edit Goal Form */}
      {(activeGoals.length === 0 || showCreateNew || editMode) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editMode ? 'Edit Goal' : 'Define Your Primary Goal'}
            </h3>
            <div className="flex gap-2">
              {editMode && (
                <Button
                  onClick={handleSaveGoal}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Goal'}
                </Button>
              )}
              {activeGoals.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateNew(false);
                    setEditMode(false);
                  }}
                >
                  ← Back to existing goals
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={formData.primaryGoal.eventName}
                onChange={(e) => setFormData({
                  ...formData,
                  primaryGoal: { ...formData.primaryGoal, eventName: e.target.value, goalId: undefined }
                })}
                placeholder="e.g., National Championship"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Event Date</Label>
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
                      {formData.primaryGoal.eventDate
                        ? format(formData.primaryGoal.eventDate, "PPP")
                        : "Pick a date"}
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

              <div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Event Type</Label>
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

              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.primaryGoal.priority || 'A'}
                  onValueChange={(value: any) => setFormData({
                    ...formData,
                    primaryGoal: { ...formData.primaryGoal, priority: value, goalId: undefined }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="targetPerformance">Target Performance</Label>
              <Input
                id="targetPerformance"
                value={formData.primaryGoal.targetPerformance || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  primaryGoal: { ...formData.primaryGoal, targetPerformance: e.target.value, goalId: undefined }
                })}
                placeholder="e.g., Podium Sub 32 mins"
              />
            </div>

            {/* Course File Upload */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label>Upload Course File (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Upload a .gpx, .fit, or .tcx file for course analysis (coming soon)
              </p>
              <Input
                type="file"
                accept=".gpx,.fit,.tcx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    toast.info('Course file analysis coming soon! File stored for future use.');
                    setFormData({
                      ...formData,
                      primaryGoal: {
                        ...formData.primaryGoal,
                        courseFile: file,
                      },
                    });
                  }
                }}
              />
              
              {formData.primaryGoal.courseFile && (
                <div className="grid grid-cols-3 gap-4 pt-2 border-t mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="cda" className="text-xs">CdA (m²)</Label>
                    <Input
                      id="cda"
                      type="number"
                      step="0.001"
                      placeholder="0.280"
                      value={formData.primaryGoal.cda || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          primaryGoal: {
                            ...formData.primaryGoal,
                            cda: parseFloat(e.target.value) || undefined,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-xs">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={formData.primaryGoal.weight || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          primaryGoal: {
                            ...formData.primaryGoal,
                            weight: parseFloat(e.target.value) || undefined,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dtLoss" className="text-xs">Drivetrain Loss (%)</Label>
                    <Input
                      id="dtLoss"
                      type="number"
                      step="0.1"
                      placeholder="2.5"
                      value={formData.primaryGoal.drivetrainLoss || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          primaryGoal: {
                            ...formData.primaryGoal,
                            drivetrainLoss: parseFloat(e.target.value) || undefined,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Secondary Goals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Secondary Goals (Optional)</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSecondaryGoal}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Secondary Goal
          </Button>
        </div>

        {formData.secondaryGoals.map((goal, index) => (
          <Card key={goal.id} className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSecondaryGoal(goal.id)}
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label>Event name</Label>
                <Input
                  value={goal.eventName}
                  onChange={(e) => {
                    const updated = formData.secondaryGoals.map(g =>
                      g.id === goal.id ? { ...g, eventName: e.target.value } : g
                    );
                    setFormData({ ...formData, secondaryGoals: updated });
                  }}
                  placeholder="Event name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Pick date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !goal.eventDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {goal.eventDate ? format(goal.eventDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={goal.eventDate || undefined}
                        onSelect={(date) => {
                          const updated = formData.secondaryGoals.map(g =>
                            g.id === goal.id ? { ...g, eventDate: date || null } : g
                          );
                          setFormData({ ...formData, secondaryGoals: updated });
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={goal.priority}
                    onValueChange={(value: 'B' | 'C') => {
                      const updated = formData.secondaryGoals.map(g =>
                        g.id === goal.id ? { ...g, priority: value } : g
                      );
                      setFormData({ ...formData, secondaryGoals: updated });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Priority B" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B">Priority B</SelectItem>
                      <SelectItem value="C">Priority C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Constraints */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Constraints (Optional)</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addConstraint}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Constraint
          </Button>
        </div>

        {formData.constraints.map((constraint, index) => (
          <Card key={constraint.id} className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeConstraint(constraint.id)}
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label>Reason (e.g., Travel, Injury recovery)</Label>
                <Input
                  value={constraint.reason}
                  onChange={(e) => {
                    const updated = formData.constraints.map(c =>
                      c.id === constraint.id ? { ...c, reason: e.target.value } : c
                    );
                    setFormData({ ...formData, constraints: updated });
                  }}
                  placeholder="Reason (e.g., Travel, Injury recovery)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                        {constraint.startDate ? format(constraint.startDate, "PPP") : "Start"}
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

                <div>
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
                        {constraint.endDate ? format(constraint.endDate, "PPP") : "End"}
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
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
