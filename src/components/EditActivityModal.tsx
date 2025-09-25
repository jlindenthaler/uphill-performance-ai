import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  name: string;
  sport_mode: string;
  notes?: string;
}

interface EditActivityModalProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const editActivitySchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: "Activity name is required" })
    .max(100, { message: "Activity name must be less than 100 characters" }),
  sport_mode: z.string().min(1, { message: "Sport type is required" }),
  notes: z.string()
    .max(1000, { message: "Notes must be less than 1000 characters" })
    .optional()
});

type EditActivityFormData = z.infer<typeof editActivitySchema>;

const SPORT_OPTIONS = [
  { value: 'cycling', label: 'Cycling' },
  { value: 'running', label: 'Running' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'walking', label: 'Walking' },
  { value: 'rowing', label: 'Rowing' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'generic', label: 'Generic' }
];

export function EditActivityModal({ activity, open, onOpenChange }: EditActivityModalProps) {
  const { updateActivity, loading } = useActivities();
  const { toast } = useToast();
  
  const form = useForm<EditActivityFormData>({
    resolver: zodResolver(editActivitySchema),
    defaultValues: {
      name: '',
      sport_mode: 'cycling',
      notes: ''
    }
  });

  // Reset form when activity changes
  React.useEffect(() => {
    if (activity && open) {
      form.reset({
        name: activity.name || '',
        sport_mode: activity.sport_mode || 'cycling',
        notes: activity.notes || ''
      });
    }
  }, [activity, open, form]);

  const onSubmit = async (data: EditActivityFormData) => {
    if (!activity) return;
    
    try {
      await updateActivity(activity.id, {
        name: data.name.trim(),
        sport_mode: data.sport_mode,
        notes: data.notes?.trim() || null
      });
      
      toast({
        title: "Activity Updated",
        description: "Activity has been updated successfully.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Error",
        description: "Failed to update activity. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Activity
          </DialogTitle>
          <DialogDescription>
            Update the activity name, sport type, or add notes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter activity name..." 
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sport_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sport type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border border-border">
                      {SPORT_OPTIONS.map((sport) => (
                        <SelectItem key={sport.value} value={sport.value}>
                          {sport.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add notes about this activity..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}