import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useStrava } from "@/hooks/useStrava";
import { useToast } from "@/hooks/use-toast";
import { Link, Unlink, Activity, Calendar, MapPin, Zap } from "lucide-react";

export function StravaConnection() {
  const { 
    connectionStatus,
    initiateStravaConnection,
    syncStravaActivities,
    disconnectStrava,
    checkStravaConnection
  } = useStrava();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkStravaConnection();
  }, []);

  const handleConnect = async () => {
    await initiateStravaConnection();
  };

  const handleDisconnect = async () => {
    await disconnectStrava();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncStravaActivities();
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = () => {
    if (connectionStatus.loading) {
      return <Badge variant="secondary">Connecting...</Badge>;
    }
    if (connectionStatus.isConnected) {
      return <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">Connected</Badge>;
    }
    if (connectionStatus.error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    return <Badge variant="outline">Not Connected</Badge>;
  };

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Strava
        </CardTitle>
        <CardDescription>
          Connect your Strava account to automatically sync activities and segments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h4 className="font-medium">Connection Status</h4>
              <p className="text-sm text-muted-foreground">
                {connectionStatus.error && connectionStatus.error.includes('pending approval') 
                  ? 'Strava integration is pending approval'
                  : connectionStatus.isConnected 
                    ? 'Your Strava account is connected' 
                    : 'Connect to sync activities automatically'
                }
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <Separator />

        {connectionStatus.error && connectionStatus.error.includes('pending approval') ? (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-yellow-600" />
              <h5 className="font-medium text-yellow-800 dark:text-yellow-200">Pending Approval</h5>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Our Strava integration is currently under review by Strava. Once approved, you'll be able to connect your account and sync activities automatically.
            </p>
          </div>
        ) : !connectionStatus.isConnected ? (
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
                  GPS routes and segment data
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Power, heart rate, and performance metrics
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Kudos, achievements, and social features
                </li>
              </ul>
            </div>
            <Button 
              onClick={handleConnect} 
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={connectionStatus.loading}
            >
              <Link className="w-4 h-4 mr-2" />
              {connectionStatus.loading ? 'Connecting...' : 'Connect Strava Account'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/20">
                <h5 className="font-medium mb-1">Last Sync</h5>
                <p className="text-sm text-muted-foreground">
                  Recently synced activities
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/20">
                <h5 className="font-medium mb-1">Auto Sync</h5>
                <p className="text-sm text-muted-foreground">
                  Enabled - New activities sync automatically
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleSync} 
                disabled={syncing}
                variant="outline"
                className="flex-1"
              >
                <Activity className="w-4 h-4 mr-2" />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button 
                onClick={handleDisconnect} 
                variant="outline"
                className="flex-1"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
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