import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, Plus, X, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GoalsStepProps {
  formData: TrainingPlanFormData;
  setFormData: (data: TrainingPlanFormData) => void;
}

const EVENT_TYPES = [
  { value: 'road-race', label: 'Road Race' },
  { value: 'time-trial', label: 'Time Trial' },
  { value: 'gran-fondo', label: 'Gran Fondo' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'mtb', label: 'Mountain Bike' },
  { value: 'run', label: 'Running Race' },
  { value: 'custom', label: 'Custom' },
];

export function GoalsStep({ formData, setFormData }: GoalsStepProps) {
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
      <div>
        <h3 className="text-lg font-semibold mb-4">Define Your Primary Goal</h3>
        
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
          </div>

          <div>
            <Label>Target Objective</Label>
            <RadioGroup
              value={formData.primaryGoal.targetObjective}
              onValueChange={(value: any) =>
                setFormData({
                  ...formData,
                  primaryGoal: { ...formData.primaryGoal, targetObjective: value },
                })
              }
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completion" id="completion" />
                <Label htmlFor="completion">Completion</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="time" id="time" />
                <Label htmlFor="time">Time Goal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="performance" id="performance" />
                <Label htmlFor="performance">Performance</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.primaryGoal.targetObjective === 'time' && (
            <div>
              <Label htmlFor="targetTime">Target Time (HH:MM:SS)</Label>
              <Input
                id="targetTime"
                value={formData.primaryGoal.targetTime || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    primaryGoal: { ...formData.primaryGoal, targetTime: e.target.value },
                  })
                }
                placeholder="04:30:00"
              />
            </div>
          )}

          {formData.primaryGoal.targetObjective === 'performance' && (
            <div>
              <Label htmlFor="targetPerformance">Target Performance</Label>
              <Input
                id="targetPerformance"
                value={formData.primaryGoal.targetPerformance || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    primaryGoal: { ...formData.primaryGoal, targetPerformance: e.target.value },
                  })
                }
                placeholder="e.g., 250W average, Top 10 finish"
              />
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-3">
            <Label>Upload Course File (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Upload a .gpx, .fit, or .tcx file for course analysis
            </p>
            <Button variant="outline" className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Upload Course File
            </Button>
          </div>
        </div>
      </div>

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
