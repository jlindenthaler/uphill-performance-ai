import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecoveryToolsManager } from "@/components/RecoveryToolsManager";
import { RecoverySessionModal } from "@/components/RecoverySessionModal";
import { useRecoverySessions } from "@/hooks/useRecoverySessions";
import { useRecoveryTools } from "@/hooks/useRecoveryTools";
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatDateInUserTimezone } from '@/utils/dateFormat';
import { 
  Heart, 
  Plus, 
  Calendar, 
  Clock, 
  TrendingDown, 
  Edit,
  Target,
  Brain,
  CheckCircle,
  BarChart3,
  Zap
} from "lucide-react";
import { format } from "date-fns";

export function RecoveryDashboard() {
  const { sessions, loading, fetchSessions } = useRecoverySessions();
  const { tools } = useRecoveryTools();
  const { timezone } = useUserTimezone();

  // Calculate stats
  const totalSessions = sessions.length;
  const thisWeekSessions = sessions.filter(session => {
    const sessionDate = new Date(session.session_date);
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return sessionDate >= weekStart;
  }).length;

  const avgEffectiveness = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.effectiveness_rating, 0) / sessions.length)
    : 0;

  const totalHours = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;

  const recentSessions = sessions
    .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
    .slice(0, 3);

  const getToolBadgeColor = (tool: string) => {
    const colors: Record<string, string> = {
      'massage': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'stretching': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      'foam rolling': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      'ice bath': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
      'compression boots': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
      'sauna': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
    };
    return colors[tool.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getMuscleBadgeColor = (muscle: string) => {
    const colors: Record<string, string> = {
      'legs': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      'back': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      'core': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      'arms': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'shoulders': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
    };
    return colors[muscle.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Recovery Management</h1>
            <p className="text-muted-foreground">AI-guided recovery optimization for peak performance</p>
          </div>
          <RecoverySessionModal
            recoveryTools={tools}
            onSessionSaved={fetchSessions}
          />
        </div>

        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="tools">Tools & Services</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-gradient">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                    <p className="text-3xl font-bold">{totalSessions}</p>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                  <Heart className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Week</p>
                    <p className="text-3xl font-bold">{thisWeekSessions}</p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Effectiveness</p>
                    <p className="text-3xl font-bold">{avgEffectiveness}/10</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                    <p className="text-3xl font-bold">{Math.round(totalHours * 10) / 10}</p>
                    <p className="text-xs text-muted-foreground">Recovery time</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Recovery Sessions */}
            <div className="lg:col-span-2">
              <Card className="card-gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Recent Recovery Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <p className="text-muted-foreground">Loading sessions...</p>
                  ) : recentSessions.length === 0 ? (
                    <p className="text-muted-foreground">No recovery sessions logged yet.</p>
                  ) : (
                    recentSessions.map((session) => (
                      <div key={session.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-500" />
                            <span className="font-medium">Recovery Session</span>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDateInUserTimezone(session.session_date, timezone, 'MMM dd, yyyy')}
                          </div>
                          {session.duration_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.duration_minutes} minutes
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-green-600">
                            <TrendingDown className="w-4 h-4" />
                            -{session.pre_fatigue_level - session.post_fatigue_level} fatigue points
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Session Effectiveness</span>
                            <span className="text-sm font-bold">{session.effectiveness_rating}/10</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${(session.effectiveness_rating / 10) * 100}%` }}
                            />
                          </div>
                        </div>

                        {session.recovery_tools_used && session.recovery_tools_used.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-sm font-medium">Tools Used</span>
                            <div className="flex flex-wrap gap-1">
                              {session.recovery_tools_used.map((tool, index) => (
                                <Badge key={index} variant="secondary" className={getToolBadgeColor(tool)}>
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {session.muscle_groups && session.muscle_groups.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-sm font-medium">Areas Focused</span>
                            <div className="flex flex-wrap gap-1">
                              {session.muscle_groups.map((muscle, index) => (
                                <Badge key={index} variant="outline" className={getMuscleBadgeColor(muscle)}>
                                  {muscle}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Pre-Session</p>
                            <p className="text-xl font-bold text-red-600">{session.pre_fatigue_level}/10</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Post-Session</p>
                            <p className="text-xl font-bold text-green-600">{session.post_fatigue_level}/10</p>
                          </div>
                        </div>

                        {session.notes && (
                          <div className="p-3 bg-muted/20 rounded-lg">
                            <p className="text-sm">{session.notes}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Recovery Insights */}
            <div>
              <Card className="card-gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    AI Recovery Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800 dark:text-green-300">Effective Recovery Strategy</h4>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                          Your recovery sessions are highly effective ({avgEffectiveness}/10 average)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800 dark:text-blue-300">Recovery Frequency</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                          Consider increasing recovery sessions to 3-4 times per week for optimal adaptation
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start gap-2">
                      <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-purple-800 dark:text-purple-300">Most Effective Tool</h4>
                        <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                          Massage therapy shows best results (9/10 avg)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Recovery Recommendations</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                      <li>• Aim for 2-3 recovery sessions per week</li>
                      <li>• Focus on tools that show 7+ effectiveness</li>
                      <li>• Track fatigue levels consistently</li>
                      <li>• Vary recovery modalities for best results</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tools">
          <RecoveryToolsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}