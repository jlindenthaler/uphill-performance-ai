import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, RotateCcw, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RecoveryTool {
  id: string;
  tool_name: string;
  available: boolean;
}

interface RecoverySessionModalProps {
  recoveryTools: RecoveryTool[];
  onSessionSaved: () => void;
}

const MUSCLE_GROUPS = [
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors',
  'Core', 'Lower Back', 'Upper Back', 'Shoulders', 'Arms',
  'Chest', 'Neck', 'IT Band', 'Achilles', 'Plantar Fascia'
];

export function RecoverySessionModal({ recoveryTools, onSessionSaved }: RecoverySessionModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [duration, setDuration] = useState(30);
  const [preFatigue, setPreFatigue] = useState([5]);
  const [postFatigue, setPostFatigue] = useState([5]);
  
  // Auto-calculate effectiveness based on fatigue improvement
  const calculateEffectiveness = () => {
    const improvement = preFatigue[0] - postFatigue[0];
    if (improvement >= 3) return 5; // Excellent
    if (improvement >= 2) return 4; // Very Good
    if (improvement >= 1) return 3; // Good
    if (improvement >= 0) return 2; // Fair
    return 1; // Poor (fatigue increased)
  };
  
  const effectiveness = calculateEffectiveness();
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  const handleToolToggle = (toolName: string) => {
    setSelectedTools(prev => 
      prev.includes(toolName) 
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName]
    );
  };

  const handleMuscleToggle = (muscle: string) => {
    setSelectedMuscles(prev => 
      prev.includes(muscle) 
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('recovery_sessions')
        .insert({
          user_id: user.id,
          session_date: sessionDate,
          duration_minutes: duration,
          pre_fatigue_level: preFatigue[0],
          post_fatigue_level: postFatigue[0],
          effectiveness_rating: effectiveness,
          muscle_groups: selectedMuscles,
          recovery_tools_used: selectedTools,
          notes: notes || null,
          sport_mode: 'general'
        });

      if (error) throw error;

      toast({
        title: "Recovery session logged",
        description: "Your recovery session has been saved successfully.",
      });

      // Reset form
      setDuration(30);
      setPreFatigue([5]);
      setPostFatigue([5]);
      setSelectedTools([]);
      setSelectedMuscles([]);
      setNotes('');
      setSessionDate(new Date().toISOString().split('T')[0]);
      
      setOpen(false);
      onSessionSaved();
    } catch (error) {
      console.error('Error saving recovery session:', error);
      toast({
        title: "Error",
        description: "Failed to save recovery session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="primary-gradient">
          <Plus className="w-4 h-4 mr-2" />
          Log Recovery Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            Log Recovery Session
          </DialogTitle>
          <DialogDescription>
            Track your recovery session details, effectiveness, and tools used
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Session Date</Label>
              <Input
                id="date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                min="1"
                max="180"
              />
            </div>
          </div>

          {/* Fatigue Levels */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Pre-Session Fatigue</Label>
              <div className="px-2">
                <Slider
                  value={preFatigue}
                  onValueChange={setPreFatigue}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Fresh (1)</span>
                  <span className="font-medium">{preFatigue[0]}</span>
                  <span>Exhausted (10)</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Post-Session Fatigue</Label>
              <div className="px-2">
                <Slider
                  value={postFatigue}
                  onValueChange={setPostFatigue}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Fresh (1)</span>
                  <span className="font-medium">{postFatigue[0]}</span>
                  <span>Exhausted (10)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-calculated Effectiveness Rating */}
          <div className="space-y-3">
            <Label>Session Effectiveness (Auto-calculated)</Label>
            <div className="px-2">
              <div className="flex items-center justify-center py-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-2">
                    {effectiveness}/5
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < effectiveness ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {effectiveness === 5 && "Excellent recovery"}
                    {effectiveness === 4 && "Very good recovery"}
                    {effectiveness === 3 && "Good recovery"}
                    {effectiveness === 2 && "Fair recovery"}
                    {effectiveness === 1 && "Poor recovery"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on fatigue improvement ({preFatigue[0]} → {postFatigue[0]})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Tools */}
          <div className="space-y-3">
            <Label>Recovery Tools Used</Label>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {recoveryTools.filter(tool => tool.available).map((tool) => (
                    <div key={tool.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tool.id}
                        checked={selectedTools.includes(tool.tool_name)}
                        onCheckedChange={() => handleToolToggle(tool.tool_name)}
                      />
                      <Label 
                        htmlFor={tool.id} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {tool.tool_name}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedTools.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Selected tools:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTools.map((tool) => (
                        <Badge key={tool} variant="secondary" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Muscle Groups */}
          <div className="space-y-3">
            <Label>Muscle Groups Targeted</Label>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {MUSCLE_GROUPS.map((muscle) => (
                    <div key={muscle} className="flex items-center space-x-2">
                      <Checkbox
                        id={muscle}
                        checked={selectedMuscles.includes(muscle)}
                        onCheckedChange={() => handleMuscleToggle(muscle)}
                      />
                      <Label 
                        htmlFor={muscle} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {muscle}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedMuscles.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Targeted areas:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedMuscles.map((muscle) => (
                        <Badge key={muscle} variant="outline" className="text-xs">
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about your recovery session..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1 primary-gradient">
              {loading ? 'Saving...' : 'Save Recovery Session'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}