import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityPowerComparison } from '@/components/ActivityPowerComparison';
import { useActivities } from '@/hooks/useActivities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TempVisualization() {
  const navigate = useNavigate();
  const { activities, loading } = useActivities();
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');

  const selectedActivity = activities.find(a => a.id === selectedActivityId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Activity className="w-8 h-8 text-primary" />
                Power Comparison Visualization
              </h1>
              <p className="text-muted-foreground">
                Temporary tab to visualize ActivityPowerComparison component
              </p>
            </div>
          </div>
        </div>

        {/* Activity Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an activity to visualize" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.name} - {new Date(activity.date).toLocaleDateString()} 
                      ({activity.sport_mode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* ActivityPowerComparison Component */}
        {selectedActivity ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ActivityPowerComparison Component Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityPowerComparison activity={selectedActivity} />
              </CardContent>
            </Card>
          </div>
        ) : (
          !loading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
                  Select an activity above to see the power comparison visualization
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}