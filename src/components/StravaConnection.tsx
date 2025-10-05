import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Loader2, Activity, Link, Unlink, MapPin, Calendar, XCircle } from "lucide-react";
import { useStrava } from "@/hooks/useStrava";
import { useStravaJobs } from "@/hooks/useStravaJobs";
import { StravaHistoryImport } from "@/components/StravaHistoryImport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function StravaConnection() {
  const { connection, isLoading, connect, disconnect, isConnecting, isDisconnecting } = useStrava();
  const { activeJob, latestCompletedJob, calculateProgress, refreshJobs } = useStravaJobs();

  const handleCancelJob = async () => {
    if (!activeJob) return;
    
    try {
      const { error } = await supabase
        .from('strava_backfill_jobs')
        .update({ 
          status: 'error' as const,
          last_error: 'Cancelled by user',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeJob.id);

      if (error) throw error;

      toast.success("Import job cancelled");
      await refreshJobs();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error("Failed to cancel job");
    }
  };

  const getStatusBadge = () => {
    if (isConnecting) {
      return <Badge variant="secondary">Connecting...</Badge>;
    }
    if (connection?.connected) {
      return <Badge variant="default" className="bg-green-500">Connected</Badge>;
    }
    return <Badge variant="outline">Not Connected</Badge>;
  };

  if (isLoading) {
    return (
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Strava
          </CardTitle>
          <CardDescription>Sync activities from Strava</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Strava
        </CardTitle>
        <CardDescription>
          Connect your Strava account to automatically sync activities and training data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Connection Status</h4>
              <p className="text-sm text-muted-foreground">
                {connection?.connected ? 'Your Strava account is connected' : 'Connect to sync activities automatically'}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <Separator />

        {!connection?.connected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/20">
              <h5 className="font-medium mb-2">What you'll get:</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Automatic activity sync from Strava
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  GPS routes and elevation data
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Training metrics and performance data
                </li>
              </ul>
            </div>
            <Button 
              onClick={() => connect()} 
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={isConnecting}
            >
              <Link className="w-4 h-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Strava Account'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Job Status */}
            {activeJob && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <h5 className="font-medium">Syncing History</h5>
                  <Badge variant="secondary" className="ml-auto">
                    {activeJob.status === 'pending' ? 'Queued' : 'In Progress'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelJob}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  We're syncing your full training history in the background. This may take a few minutes.
                </p>
                {activeJob.status === 'running' && (
                  <>
                    <Progress value={calculateProgress(activeJob)} className="mb-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{activeJob.activities_synced} activities synced</span>
                      <span>{Math.round(calculateProgress(activeJob))}% complete</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/20">
                <h5 className="font-medium mb-1">Total Synced</h5>
                <p className="text-sm text-muted-foreground">
                  {latestCompletedJob ? 
                    `${latestCompletedJob.activities_synced} activities` : 
                    'No sync history yet'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/20">
                <h5 className="font-medium mb-1">Auto Sync</h5>
                <p className="text-sm text-muted-foreground">
                  New activities sync automatically
                </p>
              </div>
            </div>

            <Separator />

            <StravaHistoryImport />

            <Separator />
              
            <Button 
              onClick={() => disconnect()} 
              disabled={isDisconnecting}
              variant="outline"
              className="w-full"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect Strava
                </>
              )}
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>
            By connecting your Strava account, you agree to share your activity data with this application. 
            We only access the data necessary for training analysis and never share it with third parties.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}