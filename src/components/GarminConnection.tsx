import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGarmin } from "@/hooks/useGarmin";
import { useToast } from "@/hooks/use-toast";
import { Link, Unlink, Activity, Calendar, MapPin } from "lucide-react";

export function GarminConnection() {
  const { 
    connectionStatus,
    initiateGarminConnection,
    syncGarminActivities,
    disconnectGarmin,
    checkGarminConnection
  } = useGarmin();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

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
    await disconnectGarmin();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncGarminActivities();
    } finally {
      setSyncing(false);
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
            <div className="p-4 rounded-lg bg-muted/20">
              <h5 className="font-medium mb-2">What you'll get:</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Automatic activity sync from your Garmin devices
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
              onClick={handleConnect} 
              className="w-full"
              disabled={connectionStatus.loading}
            >
              <Link className="w-4 h-4 mr-2" />
              {connectionStatus.loading ? 'Connecting...' : 'Connect Garmin Account'}
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
            By connecting your Garmin account, you agree to share your activity data with this application. 
            We only access the data necessary for training analysis and never share it with third parties.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}