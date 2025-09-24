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
import { useLabResults, type LabResults } from "@/hooks/useLabResults";
import { useToast } from "@/hooks/use-toast";
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatDateInUserTimezone } from '@/utils/dateFormat';

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
  bodyWeight: string;
  restingHr: string;
  maxHr: string;
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
  bodyWeight: '',
  restingHr: '',
  maxHr: '',
  notes: ''
};

interface LabResultsProps {
  openAddDialog?: boolean;
  formOnly?: boolean;
  onFormSubmit?: () => void;
}

export function LabResults({ openAddDialog = false, formOnly = false, onFormSubmit }: LabResultsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(openAddDialog);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<LabResults | null>(null);
  const [formData, setFormData] = useState<LabResultFormData>(initialFormData);
  const { sportMode } = useSportMode();
  const { labResults, allLabResults, saveLabResults } = useLabResults();
  const { toast } = useToast();
  const { timezone } = useUserTimezone();

  // Open dialog when prop changes
  React.useEffect(() => {
    if (openAddDialog) {
      setIsAddDialogOpen(true);
    }
  }, [openAddDialog]);

  const handleInputChange = (field: keyof LabResultFormData, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (result: LabResults) => {
    setEditingResult(result);
    // Populate form with existing data
    setFormData({
      testDate: result.test_date ? new Date(result.test_date) : result.created_at ? new Date(result.created_at) : new Date(),
      testType: result.test_type || 'comprehensive',
      sport: sportMode,
      vo2max: result.vo2_max?.toString() || '',
      mapPower: result.map_value?.toString() || '',
      vt1Hr: result.vt1_hr?.toString() || '',
      vt1Power: result.vt1_power?.toString() || '',
      vt2Hr: result.vt2_hr?.toString() || '',
      vt2Power: result.vt2_power?.toString() || '',
      lt1Hr: result.lt1_hr?.toString() || '',
      lt1Power: result.lt1_power?.toString() || '',
      lt2Hr: result.lt2_hr?.toString() || '',
      lt2Power: result.lt2_power?.toString() || '',
      rmr: result.rmr?.toString() || '',
      fatOxRate: result.fat_oxidation_rate?.toString() || '',
      carbOxRate: result.carb_oxidation_rate?.toString() || '',
      fatMax: result.fat_max_intensity?.toString() || '',
      bodyWeight: result.body_weight?.toString() || '',
      restingHr: result.resting_hr?.toString() || '',
      maxHr: result.max_hr?.toString() || '',
      notes: result.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const labData = {
        vo2_max: parseFloat(formData.vo2max) || undefined,
        map_value: parseFloat(formData.mapPower) || undefined,
        vt1_hr: parseInt(formData.vt1Hr) || undefined,
        vt1_power: parseFloat(formData.vt1Power) || undefined,
        vt2_hr: parseInt(formData.vt2Hr) || undefined,
        vt2_power: parseFloat(formData.vt2Power) || undefined,
        lt1_hr: parseInt(formData.lt1Hr) || undefined,
        lt1_power: parseFloat(formData.lt1Power) || undefined,
        lt2_hr: parseInt(formData.lt2Hr) || undefined,
        lt2_power: parseFloat(formData.lt2Power) || undefined,
        rmr: parseFloat(formData.rmr) || undefined,
        fat_oxidation_rate: parseFloat(formData.fatOxRate) || undefined,
        carb_oxidation_rate: parseFloat(formData.carbOxRate) || undefined,
        fat_max_intensity: parseFloat(formData.fatMax) || undefined,
        body_weight: parseFloat(formData.bodyWeight) || undefined,
        resting_hr: parseInt(formData.restingHr) || undefined,
        max_hr: parseInt(formData.maxHr) || undefined,
        test_date: formData.testDate.toISOString(),
        test_type: formData.testType,
        notes: formData.notes || undefined,
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingResult) return;
    
    try {
      const labData = {
        vo2_max: parseFloat(formData.vo2max) || undefined,
        map_value: parseFloat(formData.mapPower) || undefined,
        vt1_hr: parseInt(formData.vt1Hr) || undefined,
        vt1_power: parseFloat(formData.vt1Power) || undefined,
        vt2_hr: parseInt(formData.vt2Hr) || undefined,
        vt2_power: parseFloat(formData.vt2Power) || undefined,
        lt1_hr: parseInt(formData.lt1Hr) || undefined,
        lt1_power: parseFloat(formData.lt1Power) || undefined,
        lt2_hr: parseInt(formData.lt2Hr) || undefined,
        lt2_power: parseFloat(formData.lt2Power) || undefined,
        rmr: parseFloat(formData.rmr) || undefined,
        fat_oxidation_rate: parseFloat(formData.fatOxRate) || undefined,
        carb_oxidation_rate: parseFloat(formData.carbOxRate) || undefined,
        fat_max_intensity: parseFloat(formData.fatMax) || undefined,
        body_weight: parseFloat(formData.bodyWeight) || undefined,
        resting_hr: parseInt(formData.restingHr) || undefined,
        max_hr: parseInt(formData.maxHr) || undefined,
        test_date: formData.testDate.toISOString(),
        test_type: formData.testType,
        notes: formData.notes || undefined,
      };

      await saveLabResults(labData);
      
      toast({
        title: "Lab Result Updated",
        description: "Your laboratory results have been updated successfully.",
      });
      
      setIsEditDialogOpen(false);
      setEditingResult(null);
      setFormData(initialFormData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lab results. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format data for display
  const formatValue = (value: number | undefined, unit?: string) => {
    if (!value) return 'N/A';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return formatDateInUserTimezone(new Date(dateString), timezone, "MMM d, yyyy");
  };

  // Calculate performance trends from historical data
  const calculateTrends = () => {
    if (allLabResults.length < 2) return [];
    
    const latest = allLabResults[0];
    const previous = allLabResults[1];
    
    const trends = [];
    
    if (latest?.vo2_max && previous?.vo2_max) {
      const change = ((latest.vo2_max - previous.vo2_max) / previous.vo2_max * 100);
      trends.push({
        metric: 'VO2max',
        value: latest.vo2_max.toString(),
        unit: 'ml/kg/min',
        change: Math.round(change),
        trend: change > 2 ? 'up' : change < -2 ? 'down' : 'stable'
      });
    }
    
    if (latest?.lt2_power && previous?.lt2_power) {
      const change = ((latest.lt2_power - previous.lt2_power) / previous.lt2_power * 100);
      trends.push({
        metric: 'LT2 Power',
        value: latest.lt2_power.toString(),
        unit: 'W',
        change: Math.round(change),
        trend: change > 2 ? 'up' : change < -2 ? 'down' : 'stable'
      });
    }
    
    if (latest?.map_value && previous?.map_value) {
      const change = ((latest.map_value - previous.map_value) / previous.map_value * 100);
      trends.push({
        metric: 'MAP',
        value: latest.map_value.toString(),
        unit: 'W',
        change: Math.round(change),
        trend: change > 2 ? 'up' : change < -2 ? 'down' : 'stable'
      });
    }
    
    if (latest?.rmr && previous?.rmr) {
      const change = ((latest.rmr - previous.rmr) / previous.rmr * 100);
      trends.push({
        metric: 'RMR',
        value: latest.rmr.toString(),
        unit: 'cal/day',
        change: Math.round(change),
        trend: change > 2 ? 'up' : change < -2 ? 'down' : 'stable'
      });
    }
    
    return trends;
  };

  const performanceTrends = calculateTrends();

  // Extract the form content into a variable for reuse
  const formContent = (isEdit = false) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleSubmit} className="space-y-6">
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
                {formData.testDate ? formatDateInUserTimezone(formData.testDate, timezone, "PPP") : <span>Pick a date</span>}
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

      {/* Additional Metrics */}
      <div className="space-y-4">
        <h3 className="font-semibold">Additional Metrics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Body Weight (kg)</Label>
            <Input
              placeholder="70"
              value={formData.bodyWeight}
              onChange={(e) => handleInputChange('bodyWeight', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Resting HR (bpm)</Label>
            <Input
              placeholder="45"
              value={formData.restingHr}
              onChange={(e) => handleInputChange('restingHr', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Max HR (bpm)</Label>
            <Input
              placeholder="190"
              value={formData.maxHr}
              onChange={(e) => handleInputChange('maxHr', e.target.value)}
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
        <Button type="button" variant="outline" onClick={() => {
          if (formOnly) {
            onFormSubmit?.();
          } else if (isEdit) {
            setIsEditDialogOpen(false);
            setEditingResult(null);
            setFormData(initialFormData);
          } else {
            setIsAddDialogOpen(false);
          }
        }}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? 'Update Lab Result' : 'Save Lab Result'}</Button>
      </div>
    </form>
  );

  // If formOnly is true, return just the form content
  if (formOnly) {
    return formContent(false);
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
            
            {formContent(false)}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Lab Result</DialogTitle>
              <DialogDescription>
                Update your laboratory test results
              </DialogDescription>
            </DialogHeader>
            
            {formContent(true)}
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
              <p className="text-2xl font-bold">
                {labResults?.vo2_max ? (
                  <>
                    {labResults.vo2_max} <span className="text-sm font-normal text-muted-foreground">ml/kg/min</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No data</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {labResults?.updated_at ? formatDate(labResults.updated_at) : 'No date'}
              </p>
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
              <p className="text-2xl font-bold">
                {labResults?.lt2_power ? (
                  <>
                    {labResults.lt2_power} <span className="text-sm font-normal text-muted-foreground">W</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No data</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {labResults?.updated_at ? formatDate(labResults.updated_at) : 'No date'}
              </p>
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
              <p className="text-2xl font-bold">
                {labResults?.rmr ? (
                  <>
                    {labResults.rmr} <span className="text-sm font-normal text-muted-foreground">cal/day</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No data</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {labResults?.updated_at ? formatDate(labResults.updated_at) : 'No date'}
              </p>
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
              <p className="text-2xl font-bold">{allLabResults.length}</p>
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
          
          {allLabResults.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No lab results recorded yet. Add your first test result to get started.</p>
              </CardContent>
            </Card>
          ) : (
            allLabResults.map((test, index) => (
              <Card key={test.id || index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(test.test_date || test.created_at)}</span>
                      <Edit 
                        className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary" 
                        onClick={() => handleEdit(test)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {test.test_type?.toUpperCase() || 'LAB TEST'}
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {sportMode.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Test Results Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {test.vo2_max && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-red-700">VO2max</p>
                        <p className="text-xl font-bold text-red-800">{test.vo2_max} <span className="text-sm font-normal">ml/kg/min</span></p>
                      </div>
                    )}
                    {test.lt2_power && (
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-orange-700">LT2 Power</p>
                        <p className="text-xl font-bold text-orange-800">{test.lt2_power} <span className="text-sm font-normal">W</span></p>
                      </div>
                    )}
                    {test.map_value && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-700">MAP</p>
                        <p className="text-xl font-bold text-blue-800">{test.map_value} <span className="text-sm font-normal">W</span></p>
                      </div>
                    )}
                    {test.rmr && (
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-purple-700">RMR</p>
                        <p className="text-xl font-bold text-purple-800">{test.rmr} <span className="text-sm font-normal">cal/day</span></p>
                      </div>
                    )}
                    {test.fat_oxidation_rate && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-green-700">Fat Oxidation</p>
                        <p className="text-xl font-bold text-green-800">{test.fat_oxidation_rate} <span className="text-sm font-normal">g/min</span></p>
                      </div>
                    )}
                    {test.vt2_hr && (
                      <div className="bg-pink-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-pink-700">VT2 HR</p>
                        <p className="text-xl font-bold text-pink-800">{test.vt2_hr} <span className="text-sm font-normal">bpm</span></p>
                      </div>
                    )}
                    {test.body_weight && (
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-indigo-700">Body Weight</p>
                        <p className="text-xl font-bold text-indigo-800">{test.body_weight} <span className="text-sm font-normal">kg</span></p>
                      </div>
                    )}
                  </div>
                  
                  {/* Notes */}
                  {test.notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{test.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}