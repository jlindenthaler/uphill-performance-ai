import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, Calendar, Target, TrendingUp, Zap, Heart } from "lucide-react";
import { WorkoutBlock } from "./WorkoutBlock";
import { TrainingZones } from "./TrainingZones";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTrainingHistory } from "@/hooks/useTrainingHistory";
import { useSportMode } from "@/contexts/SportModeContext";

interface DashboardProps {
  onNavigate: (section: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { trainingHistory, loading: historyLoading } = useTrainingHistory();
  const { sportMode, isCycling, isRunning, isSwimming } = useSportMode();

  const currentCTL = trainingHistory[trainingHistory.length - 1]?.ctl || 42;
  const currentATL = trainingHistory[trainingHistory.length - 1]?.atl || 38;
  const currentTSB = trainingHistory[trainingHistory.length - 1]?.tsb || 4;

  const upcomingWorkout = {
    name: "Ronnestad 3x 13x30:15s VO2Max",
    duration: 75,
    intervals: [
      { zone: 1, duration: 600, power: 150 }, // 10min warmup
      { zone: 3, duration: 30, power: 350 },  // 30s VO2max
      { zone: 1, duration: 15, power: 120 },  // 15s recovery
      // ... more intervals would be here
      { zone: 1, duration: 600, power: 150 }, // 10min cooldown
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Dashboard</h1>
          <p className="text-muted-foreground">
            Science-based endurance training - {sportMode.charAt(0).toUpperCase() + sportMode.slice(1)} Mode
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onNavigate('calendar')} className="primary-gradient">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </Button>
          <Button variant="outline" onClick={() => onNavigate('physiology')}>
            <Heart className="w-4 h-4 mr-2" />
            Physiology
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gradient shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isCycling ? 'Current FTP' : isRunning ? 'Threshold Pace' : 'CSS Pace'}
            </CardTitle>
            <Zap className="h-4 w-4 text-zone-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isCycling ? '285W' : isRunning ? '4:15 /km' : '1:25 /100m'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isCycling ? '+5W from last test' : isRunning ? '+5s faster this month' : '+2s improvement'}
            </p>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VO2 Max</CardTitle>
            <Activity className="h-4 w-4 text-zone-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">58 ml/kg/min</div>
            <p className="text-xs text-muted-foreground">Laboratory tested</p>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Load</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">425</div>
            <p className="text-xs text-muted-foreground">7-day average</p>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Race Goal</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {isCycling ? 'Gran Fondo' : isRunning ? 'Marathon' : 'Open Water 10K'}
            </div>
            <p className="text-xs text-muted-foreground">12 weeks remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Training Zones */}
      <Card className="card-gradient shadow-card">
        <CardHeader>
          <CardTitle>Training Zones - {sportMode.charAt(0).toUpperCase() + sportMode.slice(1)}</CardTitle>
          <CardDescription>
            4-Zone Modified Seiler Model based on your physiological data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingZones />
        </CardContent>
      </Card>

      {/* PMC Chart */}
      <Card className="card-gradient shadow-card">
        <CardHeader>
          <CardTitle>Performance Management Chart</CardTitle>
          <CardDescription>Training load trends and fitness metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-secondary/20 rounded-lg">
              <div className="text-2xl font-bold text-zone-3">{Math.round(currentCTL)}</div>
              <p className="text-sm text-muted-foreground">CTL (Fitness)</p>
            </div>
            <div className="text-center p-4 bg-secondary/20 rounded-lg">
              <div className="text-2xl font-bold text-zone-4">{Math.round(currentATL)}</div>
              <p className="text-sm text-muted-foreground">ATL (Fatigue)</p>
            </div>
            <div className="text-center p-4 bg-secondary/20 rounded-lg">
              <div className={`text-2xl font-bold ${currentTSB > 10 ? 'text-green-500' : currentTSB < -10 ? 'text-red-500' : 'text-blue-500'}`}>
                {Math.round(currentTSB)}
              </div>
              <p className="text-sm text-muted-foreground">TSB (Form)</p>
            </div>
          </div>
          <div className="h-64">
            {historyLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => [Math.round(Number(value)), String(name).toUpperCase()]}
                  />
                  <Line type="monotone" dataKey="ctl" stroke="hsl(var(--zone-3))" strokeWidth={2} name="CTL" />
                  <Line type="monotone" dataKey="atl" stroke="hsl(var(--zone-4))" strokeWidth={2} name="ATL" />
                  <Line type="monotone" dataKey="tsb" stroke="hsl(var(--chart-5))" strokeWidth={2} name="TSB" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Workout */}
      <Card className="card-gradient shadow-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Today's Workout - {sportMode.charAt(0).toUpperCase() + sportMode.slice(1)}</CardTitle>
              <CardDescription>Science-based VO2Max intervals</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-zone-3 text-primary-foreground">
              Zone 3 Focus
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{upcomingWorkout.name}</h3>
              <span className="text-sm text-muted-foreground">{upcomingWorkout.duration} minutes</span>
            </div>
            
            <WorkoutBlock intervals={upcomingWorkout.intervals} />
            
            <div className="flex gap-2">
              <Button className="primary-gradient flex-1">
                Start Workout
              </Button>
              <Button variant="outline" onClick={() => onNavigate('workouts')}>
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Progress */}
      <Card className="card-gradient shadow-card">
        <CardHeader>
          <CardTitle>Weekly Progress</CardTitle>
          <CardDescription>Training stress and volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Training Stress Score</span>
                <span>285 / 400</span>
              </div>
              <Progress value={71} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Weekly Hours</span>
                <span>8.5 / 12</span>
              </div>
              <Progress value={71} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}