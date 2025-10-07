import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, X, Upload, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useGoals } from '@/hooks/useGoals';
import { useState } from 'react';

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
  { value: 'A', label: 'A - Top Priority', description: 'Key event' },
  { value: 'B', label: 'B - Medium Priority', description: 'Important event' },
  { value: 'C', label: 'C - Low Priority', description: 'Training race' }
];

export function GoalsStep({ formData, setFormData }: GoalsStepProps) {
  const { goals, loading } = useGoals();
  const [goalMode, setGoalMode] = useState<'select' | 'create'>('select');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const activeGoals = goals.filter(g => g.status === 'active');

  // Handle goal selection
  const handleGoalSelect = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setSelectedGoalId(goalId);
      setFormData({
        ...formData,
        primaryGoal: {
          ...formData.primaryGoal,
          eventName: goal.name,
          eventDate: new Date(goal.event_date),
          eventType: goal.event_type,
          location: goal.location || '',
          priority: goal.priority as 'A' | 'B' | 'C',
          targetPerformance: goal.target_performance || '',
          goalId: goalId
        }
      });
    }
  };

  const addSecondaryGoal = () => {
    setFormData({
      ...formData,
      secondaryGoals: [
        ...formData.secondaryGoals,
        {
          id: Date.now().toString(),
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
      secondaryGoals: formData.secondaryGoals.filter((g) => g.id !== id),
    });
  };

  const addConstraint = () => {
    setFormData({
      ...formData,
      constraints: [
        ...formData.constraints,
        {
          id: Date.now().toString(),
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
      constraints: formData.constraints.filter((c) => c.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Existing Goals Selection */}
      {activeGoals.length > 0 && goalMode === 'select' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Select from Existing Goals</h3>
          <div className="grid gap-3 mb-4">
            {activeGoals.map((goal) => (
              <div
                key={goal.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedGoalId === goal.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleGoalSelect(goal.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{goal.name}</h4>
                      <Badge variant={
                        goal.priority === 'A' ? 'default' :
                        goal.priority === 'B' ? 'secondary' :
                        'outline'
                      }>
                        Priority {goal.priority}
                      </Badge>
                      {selectedGoalId === goal.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>📅 {format(new Date(goal.event_date), 'MMMM d, yyyy')}</div>
                      <div>🏁 {goal.event_type}</div>
                      {goal.location && <div>📍 {goal.location}</div>}
                      {goal.target_performance && <div>🎯 {goal.target_performance}</div>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setGoalMode('create')}
            className="w-full"
          >
            Create New Goal Instead
          </Button>
        </div>
      )}

      {/* Primary Goal Form */}
      {(activeGoals.length === 0 || goalMode === 'create') && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Define Your Primary Goal</h3>
            {activeGoals.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGoalMode('select');
                  setSelectedGoalId(null);
                }}
              >
                ← Back to existing goals
              </Button>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={formData.primaryGoal.eventName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    primaryGoal: { ...formData.primaryGoal, eventName: e.target.value },
                  })
                }
                placeholder="e.g., Local Century Ride"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.primaryGoal.eventDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.primaryGoal.eventDate
                        ? format(formData.primaryGoal.eventDate, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.primaryGoal.eventDate || undefined}
                      onSelect={(date) =>
                        setFormData({
                          ...formData,
                          primaryGoal: { ...formData.primaryGoal, eventDate: date || null },
                        })
                      }
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryGoal: { ...formData.primaryGoal, location: e.target.value },
                    })
                  }
                  placeholder="Event location"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Type</Label>
                <Select
                  value={formData.primaryGoal.eventType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      primaryGoal: { ...formData.primaryGoal, eventType: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.primaryGoal.priority || 'A'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      primaryGoal: { ...formData.primaryGoal, priority: value as 'A' | 'B' | 'C' },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="targetPerformance">Target Performance (Optional)</Label>
              <Input
                id="targetPerformance"
                value={formData.primaryGoal.targetPerformance || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    primaryGoal: { ...formData.primaryGoal, targetPerformance: e.target.value },
                  })
                }
                placeholder="e.g., Sub 4 hours, 250W FTP, Top 10 finish"
              />
            </div>

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
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Secondary Goals (Optional)</h3>
          <Button onClick={addSecondaryGoal} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Secondary Goal
          </Button>
        </div>

        {formData.secondaryGoals.map((goal) => (
          <div key={goal.id} className="border rounded-lg p-4 mb-3 space-y-3">
            <div className="flex justify-between items-start">
              <Input
                value={goal.eventName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    secondaryGoals: formData.secondaryGoals.map((g) =>
                      g.id === goal.id ? { ...g, eventName: e.target.value } : g
                    ),
                  })
                }
                placeholder="Event name"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSecondaryGoal(goal.id)}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {goal.eventDate ? format(goal.eventDate, 'PP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={goal.eventDate || undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        secondaryGoals: formData.secondaryGoals.map((g) =>
                          g.id === goal.id ? { ...g, eventDate: date || null } : g
                        ),
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
              <Select
                value={goal.priority}
                onValueChange={(value: 'B' | 'C') =>
                  setFormData({
                    ...formData,
                    secondaryGoals: formData.secondaryGoals.map((g) =>
                      g.id === goal.id ? { ...g, priority: value } : g
                    ),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B">Priority B</SelectItem>
                  <SelectItem value="C">Priority C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {/* Constraints */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Constraints (Optional)</h3>
          <Button onClick={addConstraint} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Constraint
          </Button>
        </div>

        {formData.constraints.map((constraint) => (
          <div key={constraint.id} className="border rounded-lg p-4 mb-3 space-y-3">
            <div className="flex justify-between items-start">
              <Input
                value={constraint.reason}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    constraints: formData.constraints.map((c) =>
                      c.id === constraint.id ? { ...c, reason: e.target.value } : c
                    ),
                  })
                }
                placeholder="Reason (e.g., Travel, Injury recovery)"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeConstraint(constraint.id)}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {constraint.startDate ? format(constraint.startDate, 'PP') : 'Start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={constraint.startDate || undefined}
                      onSelect={(date) =>
                        setFormData({
                          ...formData,
                          constraints: formData.constraints.map((c) =>
                            c.id === constraint.id ? { ...c, startDate: date || null } : c
                          ),
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {constraint.endDate ? format(constraint.endDate, 'PP') : 'End'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={constraint.endDate || undefined}
                      onSelect={(date) =>
                        setFormData({
                          ...formData,
                          constraints: formData.constraints.map((c) =>
                            c.id === constraint.id ? { ...c, endDate: date || null } : c
                          ),
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
