import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Target, Trophy, Calendar, MapPin, Crosshair, Edit, RotateCcw } from "lucide-react";
import { useGoals, Goal } from "@/hooks/useGoals";
import { toast } from "@/hooks/use-toast";

export const Goals: React.FC = () => {
  const { goals, loading, createGoal, updateGoal, deleteGoal } = useGoals();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [newGoal, setNewGoal] = useState({
    name: '',
    event_date: '',
    location: '',
    event_type: '',
    priority: 'A',
    status: 'active' as 'active' | 'completed' | 'deferred',
    target_performance: ''
  });

  const [editGoalData, setEditGoalData] = useState({
    name: '',
    event_date: '',
    location: '',
    event_type: '',
    priority: 'A',
    status: 'active' as 'active' | 'completed' | 'deferred',
    target_performance: ''
  });

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const handleSaveGoal = async () => {
    if (newGoal.name && newGoal.event_date && newGoal.event_type) {
      const result = await createGoal(newGoal);
      if (result) {
        toast({
          title: "Goal created successfully",
          description: "Your new goal has been added."
        });
        setNewGoal({
          name: '',
          event_date: '',
          location: '',
          event_type: '',
          priority: 'A',
          status: 'active',
          target_performance: ''
        });
        setIsDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to create goal. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditGoalData({
      name: goal.name,
      event_date: goal.event_date,
      location: goal.location || '',
      event_type: goal.event_type,
      priority: goal.priority,
      status: goal.status,
      target_performance: goal.target_performance || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditGoal = async () => {
    if (editingGoal && editGoalData.name && editGoalData.event_date && editGoalData.event_type) {
      const result = await updateGoal(editingGoal.id, editGoalData);
      if (result) {
        toast({
          title: "Goal updated successfully",
          description: "Your goal has been updated."
        });
        setIsEditDialogOpen(false);
        setEditingGoal(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to update goal. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleStatusChange = async (goalId: string, newStatus: 'active' | 'completed' | 'deferred') => {
    const result = await updateGoal(goalId, { status: newStatus });
    if (result) {
      toast({
        title: "Status updated",
        description: `Goal status changed to ${newStatus}.`
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'A': return 'bg-red-100 text-red-700 border-red-200';
      case 'B': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'C': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'criterium': return 'bg-blue-100 text-blue-700';
      case 'road race': return 'bg-green-100 text-green-700';
      case 'time trial': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Goal Management</h1>
          <p className="text-muted-foreground mt-1">Define your targets and track your journey</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Set New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Set New Goal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    placeholder="Enter event name"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Event Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newGoal.event_date}
                    onChange={(e) => setNewGoal({ ...newGoal, event_date: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Event Location</Label>
                  <Input
                    id="location"
                    value={newGoal.location}
                    onChange={(e) => setNewGoal({ ...newGoal, location: e.target.value })}
                    placeholder="Enter location"
                  />
                </div>
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={newGoal.event_type} onValueChange={(value) => setNewGoal({ ...newGoal, event_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road race">Road Race</SelectItem>
                      <SelectItem value="criterium">Criterium</SelectItem>
                      <SelectItem value="time trial">Time Trial</SelectItem>
                      <SelectItem value="stage race">Stage Race</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={newGoal.priority} onValueChange={(value) => setNewGoal({ ...newGoal, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A (Primary)</SelectItem>
                      <SelectItem value="B">B (Secondary)</SelectItem>
                      <SelectItem value="C">C (Tertiary)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newGoal.status} onValueChange={(value: 'active' | 'completed' | 'deferred') => setNewGoal({ ...newGoal, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="deferred">Deferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="target">Target Performance</Label>
                <Textarea
                  id="target"
                  value={newGoal.target_performance}
                  onChange={(e) => setNewGoal({ ...newGoal, target_performance: e.target.value })}
                  placeholder="e.g., Top 10 finish, Complete in under 4 hours, Achieve 300W FTP"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveGoal}>
                Save Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Goal Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Event Name</Label>
                  <Input
                    id="edit-name"
                    value={editGoalData.name}
                    onChange={(e) => setEditGoalData({ ...editGoalData, name: e.target.value })}
                    placeholder="Enter event name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-date">Event Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editGoalData.event_date}
                    onChange={(e) => setEditGoalData({ ...editGoalData, event_date: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-location">Event Location</Label>
                  <Input
                    id="edit-location"
                    value={editGoalData.location}
                    onChange={(e) => setEditGoalData({ ...editGoalData, location: e.target.value })}
                    placeholder="Enter location"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-eventType">Event Type</Label>
                  <Select value={editGoalData.event_type} onValueChange={(value) => setEditGoalData({ ...editGoalData, event_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road race">Road Race</SelectItem>
                      <SelectItem value="criterium">Criterium</SelectItem>
                      <SelectItem value="time trial">Time Trial</SelectItem>
                      <SelectItem value="stage race">Stage Race</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-priority">Priority Level</Label>
                  <Select value={editGoalData.priority} onValueChange={(value) => setEditGoalData({ ...editGoalData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A (Primary)</SelectItem>
                      <SelectItem value="B">B (Secondary)</SelectItem>
                      <SelectItem value="C">C (Tertiary)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editGoalData.status} onValueChange={(value: 'active' | 'completed' | 'deferred') => setEditGoalData({ ...editGoalData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="deferred">Deferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-target">Target Performance</Label>
                <Textarea
                  id="edit-target"
                  value={editGoalData.target_performance}
                  onChange={(e) => setEditGoalData({ ...editGoalData, target_performance: e.target.value })}
                  placeholder="e.g., Top 10 finish, Complete in under 4 hours, Achieve 300W FTP"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditGoal}>
                Update Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Goals</p>
                <p className="text-3xl font-bold">{activeGoals.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Chasing greatness</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Goals</p>
                <p className="text-3xl font-bold">{completedGoals.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Achievements unlocked</p>
              </div>
              <Trophy className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Goals</p>
                <p className="text-3xl font-bold">{goals.length}</p>
                <p className="text-sm text-muted-foreground mt-1">All time</p>
              </div>
              <Crosshair className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Goals */}
      <Card>
        <CardHeader>
          <CardTitle>All Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="border border-l-4 border-l-orange-400 rounded-lg p-4 bg-card">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{goal.name}</h3>
                    <Badge className={`text-xs px-2 py-1 ${getPriorityColor(`Priority ${goal.priority}`)}`}>
                      {goal.status}
                    </Badge>
                    <Badge className={`text-xs px-2 py-1 ${getEventTypeColor(goal.event_type)}`}>
                      {goal.event_type}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => handleEditGoal(goal)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <RotateCcw className="w-3 h-3" />
                        Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40 bg-popover border border-border">
                      <DropdownMenuItem 
                        onClick={() => handleStatusChange(goal.id, 'active')}
                        className="cursor-pointer"
                      >
                        Active
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleStatusChange(goal.id, 'completed')}
                        className="cursor-pointer"
                      >
                        Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleStatusChange(goal.id, 'deferred')}
                        className="cursor-pointer"
                      >
                        Deferred
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(goal.event_date)}</span>
                </div>
                {goal.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{goal.location}</span>
                  </div>
                )}
                {goal.target_performance && (
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4" />
                    <span>{goal.target_performance}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {goals.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No goals set yet. Create your first goal to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};