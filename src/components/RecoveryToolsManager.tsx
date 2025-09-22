import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Heart, Snowflake, Waves, Zap, Moon, Utensils, Dumbbell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSportMode } from '@/contexts/SportModeContext';

interface RecoveryTool {
  id: string;
  tool_name: string;
  available: boolean;
  frequency: string;
  notes: string;
  sport_mode: string;
}

const DEFAULT_RECOVERY_TOOLS = [
  { name: 'Massage Therapy', icon: Heart, category: 'Manual' },
  { name: 'Ice Bath', icon: Snowflake, category: 'Cold Therapy' },
  { name: 'Sauna', icon: Zap, category: 'Heat Therapy' },
  { name: 'Compression Garments', icon: Heart, category: 'Compression' },
  { name: 'Foam Rolling', icon: Dumbbell, category: 'Self-Massage' },
  { name: 'Stretching Session', icon: Dumbbell, category: 'Flexibility' },
  { name: 'Meditation', icon: Moon, category: 'Mental' },
  { name: 'Nutrition Optimization', icon: Utensils, category: 'Nutrition' },
  { name: 'Hydration Protocol', icon: Waves, category: 'Hydration' },
  { name: 'Sleep Optimization', icon: Moon, category: 'Sleep' },
];

export function RecoveryToolsManager() {
  const [recoveryTools, setRecoveryTools] = useState<RecoveryTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTool, setNewTool] = useState({
    name: '',
    frequency: 'as_needed',
    notes: '',
    available: true
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const { sportMode } = useSportMode();

  useEffect(() => {
    fetchRecoveryTools();
  }, [sportMode]);

  const fetchRecoveryTools = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('recovery_tools')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('sport_mode', sportMode);

      if (error) throw error;

      setRecoveryTools(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading recovery tools",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRecoveryTool = async (toolData: Partial<RecoveryTool>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      if (!toolData.tool_name) {
        toast({
          title: "Error",
          description: "Tool name is required",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('recovery_tools')
        .upsert({
          user_id: user.user.id,
          sport_mode: sportMode,
          tool_name: toolData.tool_name,
          available: toolData.available ?? true,
          frequency: toolData.frequency || 'as_needed',
          notes: toolData.notes || '',
          ...(toolData.id && { id: toolData.id })
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recovery tool saved successfully"
      });

      await fetchRecoveryTools();
    } catch (error: any) {
      toast({
        title: "Error saving recovery tool",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteRecoveryTool = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recovery_tools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recovery tool deleted successfully"
      });

      await fetchRecoveryTools();
    } catch (error: any) {
      toast({
        title: "Error deleting recovery tool",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addNewTool = async () => {
    if (!newTool.name.trim()) return;

    await saveRecoveryTool({
      tool_name: newTool.name,
      frequency: newTool.frequency,
      notes: newTool.notes,
      available: newTool.available
    });

    setNewTool({ name: '', frequency: 'as_needed', notes: '', available: true });
    setShowAddForm(false);
  };

  const toggleToolAvailability = async (tool: RecoveryTool) => {
    await saveRecoveryTool({
      ...tool,
      available: !tool.available
    });
  };

  const addDefaultTool = async (defaultTool: typeof DEFAULT_RECOVERY_TOOLS[0]) => {
    await saveRecoveryTool({
      tool_name: defaultTool.name,
      frequency: 'as_needed',
      notes: `${defaultTool.category} recovery method`,
      available: true
    });
  };

  if (loading) {
    return (
      <Card className="card-gradient">
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          Recovery Tools
        </CardTitle>
        <CardDescription>
          Manage your available recovery methods and protocols
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Recovery Tools */}
        <div className="space-y-3">
          {recoveryTools.length > 0 ? (
            recoveryTools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{tool.tool_name}</h4>
                    <Badge variant={tool.available ? 'default' : 'secondary'}>
                      {tool.available ? 'Available' : 'Unavailable'}
                    </Badge>
                    <Badge variant="outline">{tool.frequency.replace('_', ' ')}</Badge>
                  </div>
                  {tool.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{tool.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={tool.available}
                    onCheckedChange={() => toggleToolAvailability(tool)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRecoveryTool(tool.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No recovery tools configured yet. Add some below to get started.
            </div>
          )}
        </div>

        {/* Add New Tool Form */}
        {showAddForm && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/10 border">
            <div className="space-y-2">
              <Label htmlFor="tool_name">Recovery Tool Name</Label>
              <Input
                id="tool_name"
                value={newTool.name}
                onChange={(e) => setNewTool(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Ice Bath, Massage, Foam Rolling"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={newTool.frequency}
                onValueChange={(value) => setNewTool(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="as_needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={newTool.notes}
                onChange={(e) => setNewTool(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this recovery method..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addNewTool} className="flex-1">
                Add Tool
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Quick Add Buttons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Quick Add</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Custom Tool
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DEFAULT_RECOVERY_TOOLS
              .filter(tool => !recoveryTools.some(rt => rt.tool_name === tool.name))
              .slice(0, 6)
              .map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Button
                    key={tool.name}
                    variant="outline"
                    size="sm"
                    onClick={() => addDefaultTool(tool)}
                    className="justify-start"
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {tool.name}
                  </Button>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
