import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, BookOpen, Target, Clock, Zap } from "lucide-react";

interface WorkoutData {
  id: string;
  name: string;
  description: string;
  purpose: string;
  research: {
    title: string;
    authors: string;
    link: string;
    year: number;
  };
  structure: {
    warmup: string;
    mainSet: string;
    cooldown: string;
  };
  zones: number[];
  duration: number; // minutes
  tss: number; // Training Load Index
}

const workouts: WorkoutData[] = [
  {
    id: "ronnestad-vo2max",
    name: "Rønnestad 3x13x30:15s VO2Max",
    description: "High-intensity interval training with short work intervals",
    purpose: "Improves VO2max, neuromuscular power, and anaerobic capacity. The short intervals allow for sustained high power outputs at or above MAP while maintaining good form.",
    research: {
      title: "Effects of 12 weeks of block periodization on performance and performance indices in well-trained cyclists",
      authors: "Rønnestad et al.",
      link: "https://pubmed.ncbi.nlm.nih.gov/24382098/",
      year: 2014
    },
    structure: {
      warmup: "15min progressive build",
      mainSet: "3 sets of 13x (30s @ 120% MAP : 15s recovery), 5min between sets",
      cooldown: "10min easy spin"
    },
    zones: [4],
    duration: 90,
    tss: 95
  },
  {
    id: "laursen-4x8",
    name: "Laursen 4x8min @ LT2",
    description: "Sustained threshold intervals",
    purpose: "Improves lactate buffering capacity, glycolytic power, and time to exhaustion at threshold intensities. Excellent for FTP development.",
    research: {
      title: "The scientific basis for high-intensity interval training",
      authors: "Laursen & Jenkins",
      link: "https://pubmed.ncbi.nlm.nih.gov/12500988/",
      year: 2002
    },
    structure: {
      warmup: "20min with 3x3min builds",
      mainSet: "4x (8min @ LT2 : 4min recovery)",
      cooldown: "15min easy"
    },
    zones: [3],
    duration: 105,
    tss: 82
  },
  {
    id: "seiler-4x16",
    name: "Seiler 4x16min Threshold",
    description: "Long threshold intervals based on Seiler's research",
    purpose: "Maximizes time spent at threshold power, improving lactate steady state and sustainable power output over longer durations.",
    research: {
      title: "What is best practice for training intensity and duration distribution in endurance athletes?",
      authors: "Seiler",
      link: "https://pubmed.ncbi.nlm.nih.gov/20473222/",
      year: 2010
    },
    structure: {
      warmup: "20min progressive",
      mainSet: "4x (16min @ LT1-LT2 : 4min recovery)",
      cooldown: "10min easy"
    },
    zones: [2, 3],
    duration: 130,
    tss: 95
  }
];

export function PCMSection() {
  const getZoneColor = (zone: number) => {
    switch (zone) {
      case 1: return 'bg-zone-1 text-zone-1-foreground';
      case 2: return 'bg-zone-2 text-zone-2-foreground';
      case 3: return 'bg-zone-3 text-zone-3-foreground';
      case 4: return 'bg-zone-4 text-zone-4-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Coaching Manual</h1>
          <p className="text-muted-foreground">Science-based workouts with research foundations</p>
        </div>
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          Evidence-Based Training
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {workouts.map((workout) => (
          <Card key={workout.id} className="card-gradient shadow-card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    {workout.name}
                  </CardTitle>
                  <CardDescription>{workout.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {workout.zones.map((zone) => (
                    <Badge key={zone} className={getZoneColor(zone)}>
                      Zone {zone}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{workout.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">TLI: {workout.tss}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{workout.research.year}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold">Purpose & Benefits</h4>
                <p className="text-sm text-muted-foreground">{workout.purpose}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Workout Structure</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground">WARMUP</p>
                    <p className="text-sm">{workout.structure.warmup}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <p className="text-xs font-medium text-primary">MAIN SET</p>
                    <p className="text-sm">{workout.structure.mainSet}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground">COOLDOWN</p>
                    <p className="text-sm">{workout.structure.cooldown}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Research Foundation</h4>
                <div className="p-4 rounded-lg border bg-muted/10">
                  <p className="font-medium">{workout.research.title}</p>
                  <p className="text-sm text-muted-foreground">{workout.research.authors} ({workout.research.year})</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open(workout.research.link, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Research
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  Add to Calendar
                </Button>
                <Button size="sm" className="primary-gradient">
                  Create Workout
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}