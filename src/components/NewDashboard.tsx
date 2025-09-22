import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Beaker
} from 'lucide-react';
import { useTrainingHistory } from '@/hooks/useTrainingHistory';
import { useActivities } from '@/hooks/useActivities';
import { useMetabolicData } from '@/hooks/useMetabolicData';
import { useSportMode } from '@/contexts/SportModeContext';
import { usePMCPopulation } from '@/hooks/usePMCPopulation';

interface DashboardProps {
  onNavigate: (section: string) => void;
}

export function NewDashboard({ onNavigate }: DashboardProps) {
  const { trainingHistory } = useTrainingHistory();
  const { activities } = useActivities();
  const { metabolicMetrics } = useMetabolicData();
  const { sportMode } = useSportMode();
  const { isPopulating } = usePMCPopulation();

  // Calculate current week metrics
  const currentWeek = trainingHistory.slice(-7);
  const weeklyTSS = currentWeek.reduce((sum, day) => sum + (day.tss || 0), 0);
  const weeklyHours = currentWeek.reduce((sum, day) => sum + (day.tss / 100 || 0), 0);
  const completedSessions = currentWeek.filter(day => day.tss > 0).length;

  // Get recent activities (last 7)
  const recentActivities = activities.slice(0, 7);

  // Calculate CTL/ATL/TSB from recent data
  const latestMetrics = trainingHistory[trainingHistory.length - 1];
  const ctl = latestMetrics?.ctl || 0;
  const atl = latestMetrics?.atl || 0;
  const tsb = latestMetrics?.tsb || 0;

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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${tsbStatus.color} ${tsbStatus.bgColor} border-current`}>
            Form: {tsbStatus.status}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {sportMode} Mode
          </Badge>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zone-1 to-zone-2"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weekly TSS</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{Math.round(weeklyTSS)}</p>
                  <span className="text-sm text-muted-foreground">/ 400</span>
                </div>
                <Progress value={(weeklyTSS / 400) * 100} className="mt-2 h-2" />
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
                <p className="text-2xl font-bold">Marathon</p>
                <p className="text-sm text-muted-foreground mt-1">12 weeks remaining</p>
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
                  <span className="text-sm text-muted-foreground">/ 12 this week</span>
                </div>
                <Progress value={(completedSessions / 12) * 100} className="mt-2 h-2" />
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
                <p className="text-xs text-muted-foreground">Fitness (CTL)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zone-3">{Math.round(atl)}</p>
                <p className="text-xs text-muted-foreground">Fatigue (ATL)</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${tsbStatus.color}`}>{Math.round(tsb)}</p>
                <p className="text-xs text-muted-foreground">Form (TSB)</p>
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
              onClick={() => onNavigate('physiology')}
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
              onClick={() => onNavigate('recovery')}
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
              onClick={() => onNavigate('activities')}
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
            Recent Performance
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
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors group">
                  <div className="text-lg">{getSportIcon(activity.sport_mode)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate group-hover:text-primary transition-colors">{activity.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString()}
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
            <div className="space-y-4">
              {/* State Championships */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">State Championships</h3>
                  <Badge className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1">Priority B</Badge>
                  <Badge className="text-xs bg-blue-100 text-blue-700 px-2 py-1">criterium</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Mar 15, 2025</span>
                  <span className="text-blue-600">(-190 days, -28w)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Local circuit</span>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Training Progress</span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>

              {/* Local Criterium Series */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Local Criterium Series</h3>
                  <Badge className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1">Priority B</Badge>
                  <Badge className="text-xs bg-blue-100 text-blue-700 px-2 py-1">criterium</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Feb 15, 2025</span>
                  <span className="text-blue-600">(-218 days, -32w)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Local venue</span>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Training Progress</span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>

              {/* National Championships Road Race */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">National Championships Road Race</h3>
                  <Badge className="text-xs bg-red-100 text-red-700 px-2 py-1">Priority A</Badge>
                  <Badge className="text-xs bg-green-100 text-green-700 px-2 py-1">road race</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Jan 28, 2025</span>
                  <span className="text-blue-600">(-236 days, -34w)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Perth, Australia</span>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Training Progress</span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>
            </div>
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
    </div>
  );
}