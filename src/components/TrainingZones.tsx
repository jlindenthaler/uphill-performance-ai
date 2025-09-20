import { Card, CardContent } from "@/components/ui/card";

interface Zone {
  number: number;
  name: string;
  description: string;
  powerRange: string;
  hrRange: string;
  color: string;
}

export function TrainingZones() {
  const zones: Zone[] = [
    {
      number: 1,
      name: "Aerobic Base",
      description: "Below Aerobic Threshold (AeT)",
      powerRange: "< 200W",
      hrRange: "< 142 bpm",
      color: "bg-zone-1"
    },
    {
      number: 2,
      name: "Aerobic Threshold",
      description: "AeT to Glycolytic Threshold (GT)",
      powerRange: "200-250W",
      hrRange: "142-165 bpm",
      color: "bg-zone-2"
    },
    {
      number: 3,
      name: "VO2 Max",
      description: "GT to Maximal Aerobic Power (MAP)",
      powerRange: "250-320W",
      hrRange: "165-180 bpm",
      color: "bg-zone-3"
    },
    {
      number: 4,
      name: "Neuromuscular",
      description: "Above MAP",
      powerRange: "> 320W",
      hrRange: "> 180 bpm",
      color: "bg-zone-4"
    }
  ];

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
                  <span className="text-muted-foreground">Power:</span>
                  <span className="font-medium">{zone.powerRange}</span>
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