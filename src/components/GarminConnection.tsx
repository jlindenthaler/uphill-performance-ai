import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useGarmin } from "@/hooks/useGarmin";
import { useGarminJobs } from "@/hooks/useGarminJobs";
import { useToast } from "@/hooks/use-toast";
import { Link, Unlink, Activity, Calendar, MapPin, Loader2 } from "lucide-react";
import { GarminHistoryImport } from "@/components/GarminHistoryImport";

export function GarminConnection() {
  const { 
    connectionStatus,
    initiateGarminConnection,
    syncGarminActivities,
    disconnectGarmin,
    checkGarminConnection
  } = useGarmin();
  const { activeJob, latestCompletedJob, calculateProgress, loading: jobsLoading } = useGarminJobs();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    checkGarminConnection();
  }, []);

  const handleConnect = async () => {
    console.log('Connect button clicked');
    try {
      await initiateGarminConnection();
    } catch (err) {
      console.error('Error in handleConnect:', err);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectGarmin();
    } finally {
      setDisconnecting(false);
    }
  };


  const getStatusBadge = () => {
    if (connectionStatus.loading) {
      return <Badge variant="secondary">Connecting...</Badge>;
    }
    if (connectionStatus.isConnected) {
      return <Badge variant="default" className="bg-green-500">Connected</Badge>;
    }
    if (connectionStatus.error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    return <Badge variant="outline">Not Connected</Badge>;
  };

  // Show loading state while checking connection
  if (connectionStatus.loading && !connectionStatus.isConnected) {
    return (
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Garmin Connect
          </CardTitle>
          <CardDescription>
            Connect your Garmin device to automatically sync activities and training data
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Garmin Connect
        </CardTitle>
        <CardDescription>
          Connect your Garmin device to automatically sync activities and training data
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
                {connectionStatus.isConnected ? 'Your Garmin account is connected' : 'Connect to sync activities automatically'}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <Separator />

        {!connectionStatus.isConnected ? (
          <div className="space-y-4">
            <Button
              onClick={handleConnect} 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={connectionStatus.loading}
            >
              {connectionStatus.loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Connect Garmin Account
                </>
              )}
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

            <GarminHistoryImport />

            <Separator />

            <Button 
              onClick={handleDisconnect} 
              variant="outline"
              className="w-full"
              disabled={disconnecting}
            >
              {disconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect Garmin
                </>
              )}
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>
            By connecting your Garmin account, you agree to share your activity data with this application. 
            We only access the data necessary for training analysis and never share it with third parties.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}