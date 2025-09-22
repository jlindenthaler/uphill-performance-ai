import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, FlaskConical, TrendingUp, Activity, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSportMode } from "@/contexts/SportModeContext";
import { useLabResults } from "@/hooks/useLabResults";
import { useToast } from "@/hooks/use-toast";

interface LabResultFormData {
  testDate: Date;
  testType: string;
  sport: string;
  vo2max: string;
  mapPower: string;
  vt1Hr: string;
  vt1Power: string;
  vt2Hr: string;
  vt2Power: string;
  lt1Hr: string;
  lt1Power: string;
  lt2Hr: string;
  lt2Power: string;
  rmr: string;
  fatOxRate: string;
  carbOxRate: string;
  fatMax: string;
  notes: string;
}

const initialFormData: LabResultFormData = {
  testDate: new Date(),
  testType: 'comprehensive',
  sport: 'cycling',
  vo2max: '',
  mapPower: '',
  vt1Hr: '',
  vt1Power: '',
  vt2Hr: '',
  vt2Power: '',
  lt1Hr: '',
  lt1Power: '',
  lt2Hr: '',
  lt2Power: '',
  rmr: '',
  fatOxRate: '',
  carbOxRate: '',
  fatMax: '',
  notes: ''
};

interface LabResultsProps {
  openAddDialog?: boolean;
  formOnly?: boolean;
  onFormSubmit?: () => void;
}

export function LabResults({ openAddDialog = false, formOnly = false, onFormSubmit }: LabResultsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(openAddDialog);
  const [formData, setFormData] = useState<LabResultFormData>(initialFormData);
  const { sportMode } = useSportMode();
  const { labResults, saveLabResults } = useLabResults();
  const { toast } = useToast();

  // Open dialog when prop changes
  React.useEffect(() => {
    if (openAddDialog) {
      setIsAddDialogOpen(true);
    }
  }, [openAddDialog]);

  const handleInputChange = (field: keyof LabResultFormData, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const labData = {
        vo2_max: parseFloat(formData.vo2max) || undefined,
        vla_max: parseFloat(formData.mapPower) || undefined,
        fat_max: parseFloat(formData.fatOxRate) || undefined,
        crossover_point: parseFloat(formData.lt1Power) || undefined,
        fat_max_intensity: parseFloat(formData.fatMax) || undefined,
      };

      await saveLabResults(labData);
      
      toast({
        title: "Lab Result Added",
        description: "Your laboratory results have been saved successfully.",
      });
      
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
      
      // Call the external callback if provided
      if (onFormSubmit) {
        onFormSubmit();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save lab results. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Mock recent lab results for demonstration
  const recentTests = [
    {
      date: 'Dec 1, 2024',
      type: 'COMPREHENSIVE',
      sport: 'CYCLING',
      results: {
        vo2max: '58.5',
        lt2Power: '280',
        map: '315',
        rmr: '1850',
        fatOx: '0.42',
        vt2Hr: '168'
      },
      notes: 'Peak fitness testing before training block'
    },
    {
      date: 'Oct 15, 2024',
      type: 'VO2MAX',
      sport: 'CYCLING',
      results: {
        vo2max: '56.2',
        map: '305'
      },
      notes: 'Mid-season assessment'
    },
    {
      date: 'Aug 20, 2024',
      type: 'METABOLIC EFFICIENCY',
      sport: 'CYCLING',
      results: {
        rmr: '1820',
        fatOx: '0.38'
      },
      notes: 'Metabolic efficiency focus during base training'
    }
  ];

  const performanceTrends = [
    { metric: 'VO2max', value: '58.5', unit: 'ml/kg/min', change: 4, trend: 'up' },
    { metric: 'LT2 Power', value: '280', unit: 'W', change: 0, trend: 'stable' },
    { metric: 'MAP', value: '315', unit: 'W', change: 3, trend: 'up' },
    { metric: 'RMR', value: '1850', unit: 'cal/day', change: -2, trend: 'down' }
  ];

  // Extract the form content into a variable for reuse
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Test Details */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Test Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.testDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.testDate ? format(formData.testDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.testDate}
                onSelect={(date) => date && handleInputChange('testDate', date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Test Type</Label>
          <Select value={formData.testType} onValueChange={(value) => handleInputChange('testType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comprehensive">Comprehensive</SelectItem>
              <SelectItem value="vo2max">VO2max</SelectItem>
              <SelectItem value="metabolic">Metabolic Efficiency</SelectItem>
              <SelectItem value="threshold">Threshold Testing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Sport</Label>
          <Select value={formData.sport} onValueChange={(value) => handleInputChange('sport', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cycling">Cycling</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="swimming">Swimming</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Aerobic Capacity */}
      <div className="space-y-4">
        <h3 className="font-semibold">Aerobic Capacity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>VO2max (ml/kg/min)</Label>
            <Input
              placeholder="60.5"
              value={formData.vo2max}
              onChange={(e) => handleInputChange('vo2max', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>MAP - Maximal Aerobic Power (W)</Label>
            <Input
              placeholder="300"
              value={formData.mapPower}
              onChange={(e) => handleInputChange('mapPower', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Ventilatory Thresholds */}
      <div className="space-y-4">
        <h3 className="font-semibold">Ventilatory Thresholds</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>VT1 HR (bpm)</Label>
            <Input
              placeholder="140"
              value={formData.vt1Hr}
              onChange={(e) => handleInputChange('vt1Hr', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>VT1 Power (W)</Label>
            <Input
              placeholder="200"
              value={formData.vt1Power}
              onChange={(e) => handleInputChange('vt1Power', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>VT2 HR (bpm)</Label>
            <Input
              placeholder="165"
              value={formData.vt2Hr}
              onChange={(e) => handleInputChange('vt2Hr', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>VT2 Power (W)</Label>
            <Input
              placeholder="280"
              value={formData.vt2Power}
              onChange={(e) => handleInputChange('vt2Power', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Lactate Thresholds */}
      <div className="space-y-4">
        <h3 className="font-semibold">Lactate Thresholds</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>LT1 HR (bpm)</Label>
            <Input
              placeholder="135"
              value={formData.lt1Hr}
              onChange={(e) => handleInputChange('lt1Hr', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>LT1 Power (W)</Label>
            <Input
              placeholder="190"
              value={formData.lt1Power}
              onChange={(e) => handleInputChange('lt1Power', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>LT2 HR (bpm)</Label>
            <Input
              placeholder="160"
              value={formData.lt2Hr}
              onChange={(e) => handleInputChange('lt2Hr', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>LT2 Power (W)</Label>
            <Input
              placeholder="270"
              value={formData.lt2Power}
              onChange={(e) => handleInputChange('lt2Power', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Metabolic Efficiency */}
      <div className="space-y-4">
        <h3 className="font-semibold">Metabolic Efficiency</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>RMR (cal/day)</Label>
            <Input
              placeholder="1800"
              value={formData.rmr}
              onChange={(e) => handleInputChange('rmr', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fat Ox Rate (g/min)</Label>
            <Input
              placeholder="0.45"
              value={formData.fatOxRate}
              onChange={(e) => handleInputChange('fatOxRate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Carb Ox Rate (g/min)</Label>
            <Input
              placeholder="2.5"
              value={formData.carbOxRate}
              onChange={(e) => handleInputChange('carbOxRate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>FatMax (%VO2max)</Label>
            <Input
              placeholder="65"
              value={formData.fatMax}
              onChange={(e) => handleInputChange('fatMax', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Additional notes about the test..."
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => formOnly ? onFormSubmit?.() : setIsAddDialogOpen(false)}>
          Cancel
        </Button>
        <Button type="submit">Save Lab Result</Button>
      </div>
    </form>
  );

  // If formOnly is true, return just the form content
  if (formOnly) {
    return formContent;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Laboratory Results</h1>
          <p className="text-muted-foreground">Track your physiological testing data</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Lab Result
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Lab Result</DialogTitle>
              <DialogDescription>
                Enter your laboratory test results to track physiological improvements
              </DialogDescription>
            </DialogHeader>
            
            {formContent}
          </DialogContent>
        </Dialog>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Latest VO2max</p>
                <FlaskConical className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">58.5 <span className="text-sm font-normal text-muted-foreground">ml/kg/min</span></p>
              <p className="text-xs text-muted-foreground">Dec 1, 2024</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">LT2 Power</p>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">280 <span className="text-sm font-normal text-muted-foreground">W</span></p>
              <p className="text-xs text-muted-foreground">Dec 1, 2024</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">RMR</p>
                <Activity className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold">1850 <span className="text-sm font-normal text-muted-foreground">cal/day</span></p>
              <p className="text-xs text-muted-foreground">Dec 1, 2024</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <Badge variant="outline" className="text-orange-500 border-orange-500">📊</Badge>
              </div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Trends - First on mobile */}
        <div className="space-y-4 lg:order-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Trends
          </h2>
          
          <div className="space-y-3">
            {performanceTrends.map((trend, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{trend.metric}</p>
                      <div className="flex items-center gap-1">
                        {trend.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {trend.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
                        {trend.trend === 'stable' && <div className="w-4 h-0.5 bg-gray-400"></div>}
                        <span className={`text-sm ${
                          trend.trend === 'up' ? 'text-green-500' : 
                          trend.trend === 'down' ? 'text-red-500' : 
                          'text-gray-500'
                        }`}>
                          {trend.change > 0 ? '+' : ''}{trend.change}%
                        </span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{trend.value} <span className="text-sm font-normal text-muted-foreground">{trend.unit}</span></p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Lab Test History - Second on mobile */}
        <div className="lg:col-span-2 space-y-4 lg:order-1">
          <h2 className="text-xl font-semibold">Laboratory Test History</h2>
          
          {recentTests.map((test, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{test.date}</span>
                    <Edit className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary" />
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {test.type}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {test.sport}
                    </Badge>
                  </div>
                </div>
                
                {/* Test Results Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {test.results.vo2max && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-red-700">VO2max</p>
                      <p className="text-xl font-bold text-red-800">{test.results.vo2max} <span className="text-sm font-normal">ml/kg/min</span></p>
                    </div>
                  )}
                  {test.results.lt2Power && (
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-orange-700">LT2 Power</p>
                      <p className="text-xl font-bold text-orange-800">{test.results.lt2Power} <span className="text-sm font-normal">W</span></p>
                    </div>
                  )}
                  {test.results.map && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-700">MAP</p>
                      <p className="text-xl font-bold text-blue-800">{test.results.map} <span className="text-sm font-normal">W</span></p>
                    </div>
                  )}
                  {test.results.rmr && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-purple-700">RMR</p>
                      <p className="text-xl font-bold text-purple-800">{test.results.rmr} <span className="text-sm font-normal">cal/day</span></p>
                    </div>
                  )}
                  {test.results.fatOx && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-green-700">Fat Oxidation</p>
                      <p className="text-xl font-bold text-green-800">{test.results.fatOx} <span className="text-sm font-normal">g/min</span></p>
                    </div>
                  )}
                  {test.results.vt2Hr && (
                    <div className="bg-pink-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-pink-700">VT2 HR</p>
                      <p className="text-xl font-bold text-pink-800">{test.results.vt2Hr} <span className="text-sm font-normal">bpm</span></p>
                    </div>
                  )}
                </div>
                
                {/* Notes */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{test.notes}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}