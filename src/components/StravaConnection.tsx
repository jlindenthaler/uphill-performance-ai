import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Loader2, Activity, Clock, Unlink } from "lucide-react";
import { useStrava } from "@/hooks/useStrava";
import { useStravaJobs } from "@/hooks/useStravaJobs";
import { toast } from "sonner";
import { StravaHistoryImport } from "@/components/StravaHistoryImport";

export function StravaConnection() {
  const { connection, isLoading, connect, disconnect, isConnecting, isDisconnecting } = useStrava();
  const { activeJob, latestCompletedJob, calculateProgress } = useStravaJobs();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-500" />
          Strava
          {connection?.connected && (
            <Badge variant="secondary" className="ml-2">
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automatically sync your activities and training data from Strava
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection?.connected ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              {connection.athlete_id && (
                <p>Athlete ID: {connection.athlete_id}</p>
              )}
              {connection.expires_at && (
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Token expires: {new Date(connection.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {activeJob && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {activeJob.status === 'pending' ? 'Queued' : 'Syncing history...'}
                  </span>
                  <span className="text-muted-foreground">
                    {activeJob.activities_synced} synced
                  </span>
                </div>
                <Progress value={calculateProgress(activeJob)} className="h-2" />
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect Strava
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Strava account to automatically import activities and sync training data.
            </p>
            <Button 
              onClick={() => connect()} 
              disabled={isConnecting}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect to Strava'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}