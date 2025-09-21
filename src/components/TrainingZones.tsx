import { Card, CardContent } from "@/components/ui/card";
import { useSportMode } from "@/contexts/SportModeContext";

interface Zone {
  number: number;
  name: string;
  description: string;
  range: string;
  hrRange: string;
  color: string;
}

export function TrainingZones() {
  const { sportMode, isCycling, isRunning, isSwimming } = useSportMode();

  const getCyclingZones = (): Zone[] => [
    {
      number: 1,
      name: "Aerobic Base",
      description: "Below Aerobic Threshold (AeT)",
      range: "< 200W",
      hrRange: "< 142 bpm",
      color: "bg-zone-1"
    },
    {
      number: 2,
      name: "Aerobic Threshold",
      description: "AeT to Glycolytic Threshold (GT)",
      range: "200-250W",
      hrRange: "142-165 bpm",
      color: "bg-zone-2"
    },
    {
      number: 3,
      name: "VO2 Max",
      description: "GT to Maximal Aerobic Power (MAP)",
      range: "250-320W",
      hrRange: "165-180 bpm",
      color: "bg-zone-3"
    },
    {
      number: 4,
      name: "Neuromuscular",
      description: "Above MAP",
      range: "> 320W",
      hrRange: "> 180 bpm",
      color: "bg-zone-4"
    }
  ];

  const getRunningZones = (): Zone[] => [
    {
      number: 1,
      name: "Easy Run",
      description: "Aerobic Base Building",
      range: "> 5:30 /km",
      hrRange: "< 142 bpm",
      color: "bg-zone-1"
    },
    {
      number: 2,
      name: "Aerobic Threshold",
      description: "Marathon/Half Marathon Pace",
      range: "4:45-5:30 /km",
      hrRange: "142-165 bpm",
      color: "bg-zone-2"
    },
    {
      number: 3,
      name: "Lactate Threshold",
      description: "10K to Half Marathon Pace",
      range: "4:00-4:45 /km",
      hrRange: "165-180 bpm",
      color: "bg-zone-3"
    },
    {
      number: 4,
      name: "VO2 Max",
      description: "3K to 5K Pace",
      range: "< 4:00 /km",
      hrRange: "> 180 bpm",
      color: "bg-zone-4"
    }
  ];

  const getSwimmingZones = (): Zone[] => [
    {
      number: 1,
      name: "Endurance",
      description: "Aerobic Base Development",
      range: "> 1:45 /100m",
      hrRange: "< 142 bpm",
      color: "bg-zone-1"
    },
    {
      number: 2,
      name: "Aerobic Threshold",
      description: "CSS to Moderate Intensity",
      range: "1:30-1:45 /100m",
      hrRange: "142-165 bpm",
      color: "bg-zone-2"
    },
    {
      number: 3,
      name: "Lactate Threshold",
      description: "CSS Pace Training",
      range: "1:15-1:30 /100m",
      hrRange: "165-180 bpm",
      color: "bg-zone-3"
    },
    {
      number: 4,
      name: "Neuromuscular",
      description: "Sprint & Power Training",
      range: "< 1:15 /100m",
      hrRange: "> 180 bpm",
      color: "bg-zone-4"
    }
  ];

  const zones = isCycling ? getCyclingZones() : isRunning ? getRunningZones() : getSwimmingZones();
  const rangeLabel = isCycling ? "Power" : isRunning ? "Pace" : "Pace";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {zones.map((zone) => (
        <Card key={zone.number} className="border-none shadow-sm bg-secondary/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-4 h-4 rounded-full ${zone.color}`}></div>
              <div className="text-lg font-bold">Zone {zone.number}</div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">{zone.name}</h4>
              <p className="text-xs text-muted-foreground">{zone.description}</p>
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{rangeLabel}:</span>
                  <span className="font-medium">{zone.range}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HR:</span>
                  <span className="font-medium">{zone.hrRange}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}