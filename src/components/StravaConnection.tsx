import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Download, Clock } from "lucide-react";
import { useStrava } from "@/hooks/useStrava";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function StravaConnection() {
  const { connection, isLoading, connect, disconnect, isConnecting, isDisconnecting } = useStrava();

  const syncActivities = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('strava-sync', {
        body: {}
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully synced ${data.activitiesSynced} activities from Strava!`);
    },
    onError: (error: any) => {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync activities from Strava');
    }
  });

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
            
            <div className="space-y-2">
              <Button 
                onClick={() => syncActivities.mutate()} 
                disabled={syncActivities.isPending}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {syncActivities.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing Activities...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Sync Activities
                  </>
                )}
              </Button>
              
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
                  'Disconnect Strava'
                )}
              </Button>
            </div>
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