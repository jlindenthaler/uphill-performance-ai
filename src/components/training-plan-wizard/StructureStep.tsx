import { TrainingPlanFormData } from '../AITrainingPlanWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StructureStepProps {
  formData: TrainingPlanFormData;
  setFormData: (data: TrainingPlanFormData) => void;
}

export function StructureStep({ formData, setFormData }: StructureStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Plan Structure & Intent</h3>
        <p className="text-sm text-muted-foreground">
          Define how your training plan should be structured.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Periodization Style</Label>
          <Select
            value={formData.periodizationStyle}
            onValueChange={(value: any) =>
              setFormData({ ...formData, periodizationStyle: value })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (AI chooses best)</SelectItem>
              <SelectItem value="polarized">Polarized</SelectItem>
              <SelectItem value="pyramidal">Pyramidal</SelectItem>
              <SelectItem value="threshold">Threshold-focused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Block Length (weeks)</Label>
          <Input
            type="number"
            value={formData.blockLength}
            onChange={(e) =>
              setFormData({ ...formData, blockLength: parseInt(e.target.value) || 3 })
            }
            min={2}
            max={6}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This is the training load duration (recovery week is added automatically)
          </p>
        </div>

        <div>
          <Label>Target Sessions per Week</Label>
          <Input
            type="number"
            value={formData.sessionsPerWeek || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                sessionsPerWeek: e.target.value ? parseInt(e.target.value) : 0,
              })
            }
            placeholder="Auto"
            min={3}
            max={14}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave blank for AI to determine optimal session count
          </p>
        </div>

        <div>
          <Label>Target Weekly TLI (Optional)</Label>
          <Input
            type="number"
            value={formData.weeklyTLI || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                weeklyTLI: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="Auto"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave blank for AI to determine optimal load
          </p>
        </div>
      </div>

      <div>
        <Label>Plan Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal mt-2',
                !formData.startWeek && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.startWeek
                ? format(formData.startWeek, 'PPP')
                : 'Pick start date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.startWeek || undefined}
              onSelect={(date) =>
                setFormData({ ...formData, startWeek: date || null })
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Card className="p-4 bg-muted/50">
        <h4 className="font-semibold mb-3">Estimated Training Blocks</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Based on your goal date and current fitness, the AI will create blocks with these intents:
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-16 h-8 bg-blue-500/20 rounded flex items-center justify-center text-xs font-medium">
              Base
            </div>
            <p className="text-sm text-muted-foreground">
              Zone 2 aerobic development + strength focus
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-8 bg-amber-500/20 rounded flex items-center justify-center text-xs font-medium">
              Build
            </div>
            <p className="text-sm text-muted-foreground">
              LT2 tolerance + VO₂max intervals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-8 bg-purple-500/20 rounded flex items-center justify-center text-xs font-medium">
              Prep
            </div>
            <p className="text-sm text-muted-foreground">
              Race specificity + fatigue resistance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-8 bg-green-500/20 rounded flex items-center justify-center text-xs font-medium">
              Taper
            </div>
            <p className="text-sm text-muted-foreground">
              Freshen up + maintain sharpness
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
