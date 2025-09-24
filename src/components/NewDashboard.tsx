import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Target, 
  Activity, 
  Heart, 
  Zap, 
  TrendingUp, 
  Plus, 
  ChevronRight,
  Award,
  Clock,
  MapPin,
  Brain,
  Users,
  Beaker,
  Upload
} from 'lucide-react';
import { useTrainingHistory } from '@/hooks/useTrainingHistory';
import { useActivities } from '@/hooks/useActivities';
import { useGoals } from '@/hooks/useGoals';
import { useWeeklyTargets } from '@/hooks/useWeeklyTargets';
import { useMetabolicData } from '@/hooks/useMetabolicData';
import { useSportMode } from '@/contexts/SportModeContext';
import { usePMCPopulation } from '@/hooks/usePMCPopulation';
import { ActivityUploadNew } from './ActivityUploadNew';
import { RecoverySessionModal } from './RecoverySessionModal';
import { LabResults } from './LabResults';
import { useRecoveryTools } from '@/hooks/useRecoveryTools';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatActivityDate } from '@/utils/dateFormat';

interface DashboardProps {
  onNavigate: (section: string, openDialog?: boolean) => void;
}

export function NewDashboard({ onNavigate }: DashboardProps) {
  const { trainingHistory } = useTrainingHistory();
  const { activities, loading: activitiesLoading } = useActivities();
  const { goals, createGoal } = useGoals();
  const { weeklyTarget } = useWeeklyTargets();
  const { metabolicMetrics } = useMetabolicData();
  const { tools: recoveryTools } = useRecoveryTools();
  const { timezone } = useUserTimezone();

  // Get the closest dated Priority A goal
  const activeGoal = useMemo(() => {
    const priorityAGoals = goals.filter(goal => 
      goal.priority === 'A' && 
      goal.status === 'active' && 
      new Date(goal.event_date) >= new Date()
    );
    
    if (priorityAGoals.length === 0) return null;
    
    return priorityAGoals.reduce((closest, goal) => {
      const goalDate = new Date(goal.event_date);
      const closestDate = new Date(closest.event_date);
      return goalDate < closestDate ? goal : closest;
    });
  }, [goals]);
  const { sportMode } = useSportMode();
  const { isPopulating } = usePMCPopulation();
  const [combinedSports, setCombinedSports] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [labResultsModalOpen, setLabResultsModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    name: '',
    event_date: '',
    event_type: '',
    priority: 'B' as 'A' | 'B' | 'C',
    status: 'active' as 'active' | 'completed' | 'deferred',
    location: '',
    target_performance: ''
  });

  const handleUploadSuccess = (activityId?: string) => {
    console.log('handleUploadSuccess called with activityId:', activityId);
    // Close the modal immediately
    setUploadModalOpen(false);
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGoal(goalForm);
      setGoalModalOpen(false);
      setGoalForm({
        name: '',
        event_date: '',
        event_type: '',
        priority: 'B' as 'A' | 'B' | 'C',
        status: 'active' as 'active' | 'completed' | 'deferred',
        location: '',
        target_performance: ''
      });
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  // Calculate current week metrics
  const currentWeekData = useMemo(() => {
    if (combinedSports) {
      // For combined sports, we need to aggregate across all sports
      const allActivities = activities.filter(activity => {
        const activityDate = new Date(activity.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return activityDate >= sevenDaysAgo;
      });
      
      const weeklyTSS = allActivities.reduce((sum, activity) => sum + (activity.tss || 0), 0);
      const weeklyHours = allActivities.reduce((sum, activity) => sum + ((activity.duration_seconds || 0) / 3600), 0);
      const completedSessions = allActivities.length;
      
      return { weeklyTSS, weeklyHours, completedSessions };
    } else {
      // Original calculation for current sport mode only
      const currentWeek = trainingHistory.slice(-7);
      const weeklyTSS = currentWeek.reduce((sum, day) => sum + (day.tss || 0), 0);
      const weeklyHours = currentWeek.reduce((sum, day) => sum + (day.tss / 100 || 0), 0);
      const completedSessions = currentWeek.filter(day => day.tss > 0).length;
      
      return { weeklyTSS, weeklyHours, completedSessions };
    }
  }, [combinedSports, activities, trainingHistory]);
  
  const weeklyTSS = currentWeekData.weeklyTSS;
  const weeklyHours = currentWeekData.weeklyHours;
  const completedSessions = currentWeekData.completedSessions;

  // Get recent activities (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentActivities = activities.filter(activity => 
    new Date(activity.date) >= sevenDaysAgo
  ).slice(0, 7);

  // Calculate CTL/ATL/TSB from recent data
  const pmcMetrics = useMemo(() => {
    if (combinedSports) {
      // For combined sports, we need to aggregate PMC values across all sports
      // This would require fetching training history from all sports and combining them
      // For now, we'll use a simplified approach of summing the latest metrics
      // In a production app, you'd want to recalculate CTL/ATL/TSB from combined TSS history
      
      // Calculate basic combined metrics from activities
      const last42Days = activities.filter(activity => {
        const activityDate = new Date(activity.date);
        const fortyTwoDaysAgo = new Date();
        fortyTwoDaysAgo.setDate(fortyTwoDaysAgo.getDate() - 42);
        return activityDate >= fortyTwoDaysAgo;
      });
      
      const last7Days = activities.filter(activity => {
        const activityDate = new Date(activity.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return activityDate >= sevenDaysAgo;
      });
      
      // Calculate approximate CTL (42-day exponentially weighted moving average)
      const totalTSS42 = last42Days.reduce((sum, activity) => sum + (activity.tss || 0), 0);
      const approximateCTL = totalTSS42 / 42; // Simplified approximation
      
      // Calculate approximate ATL (7-day exponentially weighted moving average)
      const totalTSS7 = last7Days.reduce((sum, activity) => sum + (activity.tss || 0), 0);
      const approximateATL = totalTSS7 / 7; // Simplified approximation
      
      // Calculate TSB (Training Stress Balance)
      const approximateTSB = approximateCTL - approximateATL;
      
      return {
        ctl: approximateCTL,
        atl: approximateATL,
        tsb: approximateTSB
      };
    } else {
      // Original sport-specific calculation
      const latestMetrics = trainingHistory[trainingHistory.length - 1];
      return {
        ctl: latestMetrics?.ctl || 0,
        atl: latestMetrics?.atl || 0,
        tsb: latestMetrics?.tsb || 0
      };
    }
  }, [combinedSports, activities, trainingHistory]);
  
  const ctl = pmcMetrics.ctl;
  const atl = pmcMetrics.atl;
  const tsb = pmcMetrics.tsb;

  // Get TSB status
  const getTSBStatus = (tsb: number) => {
    if (tsb > 15) return { status: 'Fresh', color: 'text-green-400', bgColor: 'bg-green-400/20' };
    if (tsb > 5) return { status: 'Rested', color: 'text-blue-400', bgColor: 'bg-blue-400/20' };
    if (tsb > -10) return { status: 'Neutral', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' };
    if (tsb > -20) return { status: 'Tired', color: 'text-orange-400', bgColor: 'bg-orange-400/20' };
    return { status: 'Very Tired', color: 'text-red-400', bgColor: 'bg-red-400/20' };
  };

  const tsbStatus = getTSBStatus(tsb);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return 'N/A';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
  };

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'cycling': return '🚴';
      case 'running': return '🏃';
      case 'swimming': return '🏊';
      default: return '🏃';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your progress and optimize your training
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="combined-sports"
              checked={combinedSports}
              onCheckedChange={setCombinedSports}
            />
            <Label htmlFor="combined-sports" className="text-sm">
              Combined Sports
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${tsbStatus.color} ${tsbStatus.bgColor} border-current`}>
              Form: {tsbStatus.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {sportMode} Mode
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zone-1 to-zone-2"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weekly TLI</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{Math.round(weeklyTSS)}</p>
                  <span className="text-sm text-muted-foreground">/ {weeklyTarget?.weekly_tli_target || 400}</span>
                </div>
                <Progress value={(weeklyTSS / (weeklyTarget?.weekly_tli_target || 400)) * 100} className="mt-2 h-2" />
              </div>
              <Target className="h-8 w-8 text-zone-2 group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zone-2 to-zone-3"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Goals</p>
                {activeGoal ? (
                  <>
                    <p className="text-2xl font-bold">{activeGoal.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.ceil((new Date(activeGoal.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks remaining
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">No Active Goal</p>
                    <p className="text-sm text-muted-foreground mt-1">Set a Priority A goal</p>
                  </>
                )}
              </div>
              <Award className="h-8 w-8 text-zone-3 group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zone-3 to-zone-4"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sessions Complete</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{completedSessions}</p>
                  <span className="text-sm text-muted-foreground">/ {weeklyTarget?.weekly_sessions_target || 12} this week</span>
                </div>
                <Progress value={(completedSessions / (weeklyTarget?.weekly_sessions_target || 12)) * 100} className="mt-2 h-2" />
              </div>
              <Activity className="h-8 w-8 text-zone-4 group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/70"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">VO2max</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {typeof metabolicMetrics?.vo2max === 'object' 
                      ? metabolicMetrics.vo2max.value || 58 
                      : metabolicMetrics?.vo2max || 58}
                  </p>
                  <span className="text-sm text-muted-foreground">ml/kg/min</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span className="text-xs text-green-400">+2.3%</span>
                </div>
              </div>
              <Heart className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Training & Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Today's Training
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold mb-2">AI Coach Recommendation</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Based on your current form and training load, today is perfect for a Zone 2 endurance session.
                Your TSB indicates you're well-recovered.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onNavigate('workouts')}>
                  <Plus className="w-4 h-4 mr-1" />
                  Plan Session
                </Button>
                <Button variant="outline" size="sm">
                  View Alternatives
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-zone-1">{Math.round(ctl)}</p>
                <p className="text-xs text-muted-foreground">Fitness (LTL)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zone-3">{Math.round(atl)}</p>
                <p className="text-xs text-muted-foreground">Fatigue (STL)</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${tsbStatus.color}`}>{Math.round(tsb)}</p>
                <p className="text-xs text-muted-foreground">Form (FI)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between" 
              onClick={() => setLabResultsModalOpen(true)}
            >
              <div className="flex items-center gap-2">
                <Beaker className="w-4 h-4" />
                Add Lab Results
              </div>
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => setRecoveryModalOpen(true)}
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Log Recovery Session
              </div>
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => setGoalModalOpen(true)}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Set New Goal
              </div>
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => setUploadModalOpen(true)}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Upload Activity
              </div>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Performance Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('activities')}>
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No activities yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first activity to start tracking performance
              </p>
              <Button onClick={() => onNavigate('activities')}>
                Upload Activity
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {recentActivities.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors group cursor-pointer"
                  onClick={() => onNavigate('activities')}
                >
                  <div className="text-lg">{getSportIcon(activity.sport_mode)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate group-hover:text-primary transition-colors">{activity.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatActivityDate(activity.date, timezone)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span>{formatDuration(activity.duration_seconds)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span>{formatDistance(activity.distance_meters)}</span>
                    </div>
                    {activity.tss && (
                      <Badge variant="secondary" className="text-xs">
                        TSS {Math.round(activity.tss)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Goals */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Upcoming Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No goals set</h3>
                <p className="text-muted-foreground mb-4">
                  Set your first goal to start tracking progress
                </p>
                <Button onClick={() => onNavigate('goals')}>
                  Set Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {goals
                  .filter(goal => goal.status === 'active')
                  .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
                  .slice(0, 3)
                  .map((goal) => {
                    const goalDate = new Date(goal.event_date);
                    const today = new Date();
                    const daysUntil = Math.ceil((goalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const weeksUntil = Math.ceil(daysUntil / 7);
                    
                    const getPriorityColor = (priority: string) => {
                      switch (priority) {
                        case 'A': return 'bg-red-100 text-red-700';
                        case 'B': return 'bg-yellow-100 text-yellow-700';
                        case 'C': return 'bg-blue-100 text-blue-700';
                        default: return 'bg-gray-100 text-gray-700';
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

                    return (
                      <div key={goal.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{goal.name}</h3>
                          <Badge className={`text-xs px-2 py-1 ${getPriorityColor(goal.priority)}`}>
                            Priority {goal.priority}
                          </Badge>
                          <Badge className={`text-xs px-2 py-1 ${getEventTypeColor(goal.event_type)}`}>
                            {goal.event_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{formatActivityDate(goalDate, timezone)}</span>
                          <span className="text-blue-600">
                            ({daysUntil > 0 ? `-${daysUntil} days, -${weeksUntil}w` : 'Past due'})
                          </span>
                        </div>
                        {goal.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{goal.location}</span>
                          </div>
                        )}
                        {goal.target_performance && (
                          <p className="text-sm text-muted-foreground">
                            Target: {goal.target_performance}
                          </p>
                        )}
                      </div>
                    );
                  })}
                {goals.filter(goal => goal.status === 'active').length > 3 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => onNavigate('goals')}
                  >
                    View All Goals
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              AI Coach Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-zone-1/10 rounded-lg border border-zone-1/20">
              <h4 className="font-medium text-zone-1 mb-1">Recovery Focus</h4>
              <p className="text-sm text-muted-foreground">
                Your HRV trends suggest prioritizing recovery this week. Consider additional Zone 1 work.
              </p>
            </div>
            
            <div className="p-3 bg-zone-2/10 rounded-lg border border-zone-2/20">
              <h4 className="font-medium text-zone-2 mb-1">Nutrition Timing</h4>
              <p className="text-sm text-muted-foreground">
                Your longest sessions show better performance with pre-workout fueling. Maintain this pattern.
              </p>
            </div>
            
            <div className="p-3 bg-zone-3/10 rounded-lg border border-zone-3/20">
              <h4 className="font-medium text-zone-3 mb-1">Power Development</h4>
              <p className="text-sm text-muted-foreground">
                Recent tests show improvement in your 5-min power. Time to test your FTP threshold.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Activity
            </DialogTitle>
            <DialogDescription>
              Upload your training activity files (GPX, TCX, or FIT) to analyze and track your performance.
            </DialogDescription>
          </DialogHeader>
          <ActivityUploadNew onUploadSuccess={handleUploadSuccess} />
        </DialogContent>
      </Dialog>

      {/* Set Goal Modal */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Set New Goal
            </DialogTitle>
            <DialogDescription>
              Create a new training goal to track your progress.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGoalSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Goal Name</Label>
              <Input
                id="goal-name"
                value={goalForm.name}
                onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                placeholder="e.g., Local Criterium Championship"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-date">Event Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={goalForm.event_date}
                  onChange={(e) => setGoalForm({ ...goalForm, event_date: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={goalForm.priority} onValueChange={(value: 'A' | 'B' | 'C') => setGoalForm({ ...goalForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Highest Priority</SelectItem>
                    <SelectItem value="B">B - Medium Priority</SelectItem>
                    <SelectItem value="C">C - Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={goalForm.event_type} onValueChange={(value) => setGoalForm({ ...goalForm, event_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="criterium">Criterium</SelectItem>
                  <SelectItem value="road race">Road Race</SelectItem>
                  <SelectItem value="time trial">Time Trial</SelectItem>
                  <SelectItem value="gran fondo">Gran Fondo</SelectItem>
                  <SelectItem value="stage race">Stage Race</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={goalForm.location}
                onChange={(e) => setGoalForm({ ...goalForm, location: e.target.value })}
                placeholder="e.g., Central Park, NYC"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-performance">Target Performance (Optional)</Label>
              <Textarea
                id="target-performance"
                value={goalForm.target_performance}
                onChange={(e) => setGoalForm({ ...goalForm, target_performance: e.target.value })}
                placeholder="e.g., Top 10 finish, Sub 2:30:00"
                rows={2}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Create Goal
              </Button>
              <Button type="button" variant="outline" onClick={() => setGoalModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recovery Session Modal */}
      <RecoverySessionModal 
        recoveryTools={recoveryTools}
        onSessionSaved={() => setRecoveryModalOpen(false)}
        open={recoveryModalOpen}
        onOpenChange={setRecoveryModalOpen}
      />

      {/* Lab Results Modal */}
      <Dialog open={labResultsModalOpen} onOpenChange={setLabResultsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="w-5 h-5" />
              Add Lab Results
            </DialogTitle>
            <DialogDescription>
              Enter your laboratory test results to track physiological improvements
            </DialogDescription>
          </DialogHeader>
          <LabResults 
            formOnly={true}
            onFormSubmit={() => setLabResultsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}