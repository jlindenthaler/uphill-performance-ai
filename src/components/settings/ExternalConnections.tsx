import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useExternalConnections } from "@/hooks/useSettings";
import { 
  Link, 
  Activity, 
  BarChart3, 
  Watch, 
  Monitor, 
  Gamepad2,
  Wind,
  CheckCircle,
  XCircle,
  Calendar,
  Upload,
  Download,
  Settings
} from "lucide-react";

const providerConfigs = {
  trainingpeaks: {
    name: 'TrainingPeaks',
    icon: BarChart3,
    color: 'text-blue-500',
    description: 'Professional training analysis and planning platform',
    features: ['Workout Planning', 'Performance Analytics', 'Coach Tools'],
    type: 'data' as const
  },
  garmin: {
    name: 'Garmin Connect',
    icon: Watch,
    color: 'text-blue-600',
    description: 'Sync with Garmin devices and ecosystem',
    features: ['Device Sync', 'Health Data', 'Activity Import'],
    type: 'data' as const
  },
  zwift: {
    name: 'Zwift',
    icon: Monitor,
    color: 'text-orange-600',
    description: 'Virtual cycling and running platform',
    features: ['Workout Export', 'Virtual Training', 'Structured Workouts'],
    type: 'virtual' as const
  },
  trainerroad: {
    name: 'TrainerRoad',
    icon: Gamepad2,
    color: 'text-red-500',
    description: 'Structured training for cyclists',
    features: ['Workout Export', 'Training Plans', 'Power Analysis'],
    type: 'virtual' as const
  },
  mywhoosh: {
    name: 'MyWhoosh',
    icon: Wind,
    color: 'text-green-500',
    description: 'Virtual cycling platform with structured training',
    features: ['Workout Export', 'Virtual Racing', 'Training Programs'],
    type: 'virtual' as const
  }
};

export function ExternalConnections() {
  const { connections, loading, connectProvider, disconnectProvider } = useExternalConnections();

  const isConnected = (provider: string) => {
    return connections.some(conn => conn.provider === provider && conn.is_active);
  };

  const getConnection = (provider: string) => {
    return connections.find(conn => conn.provider === provider);
  };

  const dataProviders = Object.entries(providerConfigs).filter(([_, config]) => config.type === 'data');
  const virtualProviders = Object.entries(providerConfigs).filter(([_, config]) => config.type === 'virtual');

  return (
    <div className="space-y-6">
      {/* Data Import Connections */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            Data Import Connections
          </CardTitle>
          <CardDescription>
            Connect with platforms to import your training data and activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataProviders.map(([provider, config]) => {
            const connected = isConnected(provider);
            const connection = getConnection(provider);
            const Icon = config.icon;

            return (
              <div key={provider} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {config.name}
                        {connected ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Connected
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <Button
                    variant={connected ? "destructive" : "default"}
                    onClick={() => connected ? disconnectProvider(provider) : connectProvider(provider as any)}
                    disabled={loading}
                  >
                    {connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {config.features.map(feature => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>

                {connected && connection?.last_sync && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Last sync: {new Date(connection.last_sync).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Virtual Training Platforms */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-500" />
            Virtual Training Platforms
          </CardTitle>
          <CardDescription>
            Export workouts to virtual training apps for structured indoor training
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {virtualProviders.map(([provider, config]) => {
            const connected = isConnected(provider);
            const connection = getConnection(provider);
            const Icon = config.icon;

            return (
              <div key={provider} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {config.name}
                        {connected ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Connected
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <Button
                    variant={connected ? "destructive" : "default"}
                    onClick={() => connected ? disconnectProvider(provider) : connectProvider(provider as any)}
                    disabled={loading}
                  >
                    {connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {config.features.map(feature => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>

                {connected && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Auto-export workouts</Label>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Export format</Label>
                      <Badge variant="outline">.zwo files</Badge>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Export Settings
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Integration Help */}
      <Card className="card-gradient border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Link className="w-5 h-5" />
            Integration Help
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-orange-600 dark:text-orange-400">
          <p>• <strong>Data Import:</strong> Automatically sync activities, heart rate, and power data</p>
          <p>• <strong>Workout Export:</strong> Send structured workouts to virtual training platforms</p>
          <p>• <strong>Two-way Sync:</strong> Keep data consistent across all your training tools</p>
          <p>• <strong>Privacy:</strong> You control what data is shared and when</p>
        </CardContent>
      </Card>
    </div>
  );
}