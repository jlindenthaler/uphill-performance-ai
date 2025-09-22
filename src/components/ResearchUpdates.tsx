import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, TrendingUp, Zap, RefreshCw, ExternalLink, Calendar, Bike, PersonStanding, Waves } from "lucide-react";
import { useAIAnalysis } from "@/hooks/useSupabase";
import { useSportMode } from "@/contexts/SportModeContext";

interface ResearchUpdate {
  id: string;
  title: string;
  summary: string;
  category: 'nutrition' | 'recovery' | 'training' | 'performance' | 'technology';
  source: string;
  date: string;
  url?: string;
  relevanceScore: number;
  sports: ('cycling' | 'running' | 'swimming' | 'general')[];
  keyFindings: string[];
  practicalApplications: string[];
}

export function ResearchUpdates() {
  const [updates, setUpdates] = useState<ResearchUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { fetchResearchUpdates } = useAIAnalysis();
  const { sportMode } = useSportMode();

  const mockUpdates: ResearchUpdate[] = [
    {
      id: '1',
      title: 'Heat Acclimation and Mitochondrial Adaptations in Endurance Athletes',
      summary: 'Recent research shows that heat acclimation protocols can enhance mitochondrial efficiency and plasma volume expansion beyond traditional altitude training.',
      category: 'training',
      source: 'Journal of Applied Physiology',
      date: '2024-09-15',
      url: 'https://journals.physiology.org/doi/full/10.1152/japplphysiol.00234.2024',
      relevanceScore: 9.2,
      sports: ['general', 'cycling', 'running'],
      keyFindings: [
        'Heat acclimation increases mitochondrial respiratory capacity by 15-20%',
        'Plasma volume expansion occurs within 5-7 days of heat exposure',
        'Combined heat/altitude training shows synergistic effects'
      ],
      practicalApplications: [
        'Incorporate sauna sessions 3-4x/week during base training',
        'Combine with altitude training for enhanced adaptations',
        'Monitor core temperature and hydration status'
      ]
    },
    {
      id: '2',
      title: 'Cold Water Immersion Timing: Pre vs Post Exercise Effects',
      summary: 'Meta-analysis reveals optimal timing for cold water immersion depends on training goals, with different protocols for recovery vs adaptation.',
      category: 'recovery',
      source: 'Sports Medicine Review',
      date: '2024-09-12',
      url: 'https://link.springer.com/article/10.1007/s40279-024-02057-2',
      relevanceScore: 8.7,
      sports: ['general', 'cycling', 'running', 'swimming'],
      keyFindings: [
        'Post-exercise CWI may blunt long-term adaptations if used consistently',
        'Pre-exercise CWI can enhance performance in hot conditions',
        'Timing matters more than temperature for training adaptations'
      ],
      practicalApplications: [
        'Use post-exercise CWI only for acute recovery needs',
        'Consider pre-cooling before hot weather training',
        'Allow adaptation phases without cold therapy'
      ]
    },
    {
      id: '3',
      title: 'Ketone Supplementation in Trained Cyclists: Performance and Recovery',
      summary: 'Double-blind study shows exogenous ketones improve time trial performance and reduce inflammatory markers post-exercise.',
      category: 'nutrition',
      source: 'International Journal of Sport Nutrition',
      date: '2024-09-10',
      url: 'https://journals.humankinetics.com/view/journals/ijsnem/34/4/article-p234.xml',
      relevanceScore: 8.1,
      sports: ['cycling', 'running'],
      keyFindings: [
        '3-5% improvement in 40km time trial performance',
        'Reduced IL-6 and CRP levels 24h post-exercise',
        'Enhanced glycogen resynthesis when combined with carbohydrates'
      ],
      practicalApplications: [
        'Consider ketone supplementation for key events',
        'Combine with carbohydrate feeding for optimal recovery',
        'Test individual tolerance during training'
      ]
    },
    {
      id: '4',
      title: 'Swimming Technique Analysis: Stroke Rate vs Distance Per Stroke Optimization',
      summary: 'New research reveals optimal stroke rate-distance per stroke combinations vary significantly across race distances and individual physiology.',
      category: 'performance',
      source: 'International Journal of Aquatic Sports',
      date: '2024-09-08',
      url: 'https://link.springer.com/article/10.1007/s00421-024-05287-4',
      relevanceScore: 9.5,
      sports: ['swimming'],
      keyFindings: [
        'Optimal stroke rate increases 8-12% from 1500m to 50m events',
        'DPS (Distance Per Stroke) correlates strongly with swimming economy',
        'Elite swimmers show 15% better DPS efficiency than sub-elite'
      ],
      practicalApplications: [
        'Focus on DPS development in base training phases',
        'Incorporate stroke rate progression in race-specific training',
        'Use underwater cameras for technique analysis'
      ]
    }
  ];

  useEffect(() => {
    // Initialize with mock data
    setUpdates(mockUpdates);
    setLastUpdated(new Date());
  }, []);

  const fetchLatestResearch = async () => {
    setLoading(true);
    try {
      // Use mock data for now - API integration to be implemented later
      setUpdates(mockUpdates);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching research updates:', error);
      setUpdates(mockUpdates);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nutrition':
        return { icon: Zap, color: 'text-green-500' };
      case 'recovery':
        return { icon: RefreshCw, color: 'text-blue-500' };
      case 'training':
        return { icon: TrendingUp, color: 'text-purple-500' };
      case 'performance':
        return { icon: Zap, color: 'text-red-500' };
      case 'technology':
        return { icon: BookOpen, color: 'text-orange-500' };
      default:
        return { icon: BookOpen, color: 'text-gray-500' };
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'nutrition':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'recovery':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'training':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'performance':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'technology':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Research Updates - {sportMode.charAt(0).toUpperCase() + sportMode.slice(1)}</h1>
          <p className="text-muted-foreground">
            Latest endurance performance research curated for {sportMode} training
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Updated: {lastUpdated.toLocaleDateString()}
            </div>
          )}
          <Button onClick={fetchLatestResearch} disabled={loading} className="primary-gradient">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Updating...' : 'Fetch Latest'}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[800px]">
        <div className="space-y-4">
          {updates.filter(update => 
            update.sports.includes(sportMode as 'cycling' | 'running' | 'swimming') || 
            update.sports.includes('general')
          ).map((update) => {
            const { icon: CategoryIcon, color } = getCategoryIcon(update.category);
            
            return (
              <Card key={update.id} className="card-gradient shadow-card">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <CategoryIcon className={`w-5 h-5 ${color}`} />
                      <div>
                        <CardTitle className="text-lg">{update.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getCategoryBadgeColor(update.category)}>
                            {update.category.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            Relevance: {update.relevanceScore}/10
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {update.url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={update.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <CardDescription className="text-sm text-muted-foreground">
                    {update.source} • {new Date(update.date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed">{update.summary}</p>
                  
                  <Separator />
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        Key Findings
                      </h4>
                      <ul className="space-y-1">
                        {update.keyFindings.map((finding, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            • {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        Practical Applications
                      </h4>
                      <ul className="space-y-1">
                        {update.practicalApplications.map((application, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            • {application}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}