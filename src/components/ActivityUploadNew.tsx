import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle, FileText } from 'lucide-react';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useActivities } from '@/hooks/useActivities';
import { useSportMode } from '@/contexts/SportModeContext';
import { CP_PROTOCOLS } from '@/utils/cp-detection';

interface ActivityUploadNewProps {
  onUploadSuccess?: (activityId?: string) => void;
}

export function ActivityUploadNew({ onUploadSuccess }: ActivityUploadNewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ file: File; progress: number; status: 'uploading' | 'processing' | 'complete' | 'error' }[]>([]);
  const [activityName, setActivityName] = useState('');
  const [notes, setNotes] = useState('');
  
  // Auto-detection preview states
  const [detectedSport, setDetectedSport] = useState<string>('');
  const [suggestedName, setSuggestedName] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);
  
  // CP Test specific states
  const [isCPTest, setIsCPTest] = useState(false);
  const [cpProtocol, setCPProtocol] = useState('');
  const [cpTargetDuration, setCPTargetDuration] = useState('');
  
  const { toast } = useToast();
  const { uploadActivity, loading } = useActivities();
  const { sportMode, setSportMode } = useSportMode();
  const { timezone } = useUserTimezone();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return ['gpx', 'tcx', 'fit'].includes(extension || '');
    });

    if (validFiles.length !== files.length) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload GPX, TCX, or FIT files only.',
        variant: 'destructive'
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      // Auto-detect for the first file
      if (validFiles.length === 1) {
        await detectActivityInfo(validFiles[0]);
      }
    }
  };

  const detectActivityInfo = async (file: File) => {
    setIsDetecting(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      let detectedInfo: { sport_mode: string; name?: string; timestamp?: Date } | null = null;
      
      if (extension === 'fit') {
        const { parseFitFile } = await import('@/utils/fitParser');
        const parsed = await parseFitFile(file, timezone);
        detectedInfo = {
          sport_mode: parsed.sport_mode,
          name: parsed.name,
          timestamp: new Date(parsed.date)
        };
      } else if (extension === 'gpx') {
        const { parseGPXFile } = await import('@/utils/gpxParser');
        const { analyzeGPSTrack, inferActivityTypeFromGPS } = await import('@/utils/activityDetection');
        const parsed = await parseGPXFile(file);
        
        // Try GPS inference if no sport detected
        let sportMode = parsed.sport_mode;
        if (!sportMode || sportMode === 'cycling') {
          const analysis = analyzeGPSTrack(parsed.trackPoints);
          const inferred = inferActivityTypeFromGPS(analysis);
          if (inferred.confidence > 0.6) {
            sportMode = inferred.sport_mode;
          }
        }
        
        detectedInfo = {
          sport_mode: sportMode,
          name: parsed.name,
          timestamp: new Date(parsed.date)
        };
      } else if (extension === 'tcx') {
        const { parseTCXFile } = await import('@/utils/tcxParser');
        const parsed = await parseTCXFile(file);
        detectedInfo = {
          sport_mode: parsed.sport_mode,
          name: parsed.name,
          timestamp: new Date(parsed.date)
        };
      }
      
      if (detectedInfo) {
        const validSportMode = ['cycling', 'running', 'swimming'].includes(detectedInfo.sport_mode) 
          ? detectedInfo.sport_mode as 'cycling' | 'running' | 'swimming'
          : 'cycling';
          
        setDetectedSport(validSportMode);
        setSportMode(validSportMode); // Now properly typed
        
        // Generate name if not provided in file
        if (!detectedInfo.name && detectedInfo.timestamp) {
          const { generateActivityName } = await import('@/utils/activityNaming');
          const suggestedName = generateActivityName({
            sport_mode: validSportMode,
            timestamp: detectedInfo.timestamp
          });
          setSuggestedName(suggestedName);
          if (!activityName) { // Only set if user hasn't entered a name
            setActivityName(suggestedName);
          }
        } else if (detectedInfo.name) {
          setSuggestedName(detectedInfo.name);
          if (!activityName) {
            setActivityName(detectedInfo.name);
          }
        }
      }
    } catch (error) {
      console.warn('Auto-detection failed:', error);
      // Set default suggested name based on time
      const { generateActivityName } = await import('@/utils/activityNaming');
      const defaultName = generateActivityName({
        sport_mode: sportMode,
        timestamp: new Date()
      });
      setSuggestedName(defaultName);
      if (!activityName) {
        setActivityName(defaultName);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
    
    // Clear detection results if removing the file we detected
    if (selectedFiles.length === 1) {
      setDetectedSport('');
      setSuggestedName('');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to upload.',
        variant: 'destructive'
      });
      return;
    }

    for (const file of selectedFiles) {
      setUploadingFiles(prev => [...prev, { file, progress: 0, status: 'uploading' }]);
      
      try {
        // Simulate progress updates
        const updateProgress = (progress: number, status: 'uploading' | 'processing' | 'complete' | 'error') => {
          setUploadingFiles(prev => prev.map(item => 
            item.file === file ? { ...item, progress, status } : item
          ));
        };

        updateProgress(30, 'uploading');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateProgress(100, 'complete');
        
        console.log('Starting activity upload for:', file.name);
        
        // Prepare CP test metadata if enabled
        const cpTestData = isCPTest ? {
          activity_type: 'cp_test',
          cp_test_protocol: cpProtocol,
          cp_test_target_duration: cpTargetDuration ? parseInt(cpTargetDuration) : undefined
        } : undefined;
        
        const uploadedActivity = await uploadActivity(
          file, 
          activityName || undefined, 
          notes || undefined,
          cpTestData
        );
        console.log('Activity uploaded successfully:', uploadedActivity);
        
        toast({
          title: 'Activity uploaded successfully',
          description: `${file.name} has been processed and added to your activities.`
        });

        // Call success callback with activity ID immediately
        if (onUploadSuccess && uploadedActivity?.id) {
          console.log('Calling onUploadSuccess with activity ID:', uploadedActivity.id);
          onUploadSuccess(uploadedActivity.id);
        }

        // Clear completed uploads and trigger refresh after a short delay
        setTimeout(() => {
          console.log('Clearing upload files and triggering refresh event');
          setUploadingFiles(prev => prev.filter(item => item.file !== file));
          // Trigger a window event to refresh activities with a slight delay
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('activity-uploaded'));
          }, 500);
        }, 1500);

      } catch (error) {
        setUploadingFiles(prev => prev.map(item => 
          item.file === file ? { ...item, progress: 0, status: 'error' } : item
        ));
        
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: 'destructive'
        });
      }
    }

    // Clear selected files after upload attempt
    setSelectedFiles([]);
    setActivityName('');
    setNotes('');
    setDetectedSport('');
    setSuggestedName('');
    setIsCPTest(false);
    setCPProtocol('');
    setCPTargetDuration('');
  };

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(item => item.file !== file));
  };

  return (
    <div className="space-y-6">
      {/* Auto-Detection Status */}
      {(detectedSport || suggestedName || isDetecting) && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {isDetecting ? 'Analyzing file...' : 'Auto-detected'}
            </span>
          </div>
          {detectedSport && (
            <p className="text-sm text-muted-foreground">
              Sport: <span className="font-medium capitalize">{detectedSport}</span>
            </p>
          )}
          {suggestedName && (
            <p className="text-sm text-muted-foreground">
              Suggested name: <span className="font-medium">{suggestedName}</span>
            </p>
          )}
        </div>
      )}

      {/* Activity Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sport">Sport {detectedSport && <span className="text-xs text-muted-foreground">(auto-detected)</span>}</Label>
          <Select value={sportMode} onValueChange={setSportMode}>
            <SelectTrigger>
              <SelectValue placeholder="Select sport" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border z-50">
              <SelectItem value="cycling">Cycling</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="swimming">Swimming</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activityName">Activity Name {suggestedName && <span className="text-xs text-muted-foreground">(auto-generated)</span>}</Label>
          <Input
            id="activityName"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder={suggestedName || "e.g., Morning Ride"}
          />
        </div>
      </div>

      {/* CP Test Toggle */}
      <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
        <Switch
          id="cp-test"
          checked={isCPTest}
          onCheckedChange={setIsCPTest}
        />
        <Label htmlFor="cp-test" className="text-sm font-medium">
          Mark as Critical Power Test
        </Label>
      </div>

      {/* CP Test Configuration */}
      {isCPTest && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
          <div className="space-y-2">
            <Label htmlFor="cp-protocol">Test Protocol</Label>
            <Select value={cpProtocol} onValueChange={setCPProtocol}>
              <SelectTrigger>
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {Object.entries(CP_PROTOCOLS).map(([key, protocol]) => (
                  <SelectItem key={key} value={key}>
                    {protocol.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-duration">Target Duration (seconds, optional)</Label>
            <Input
              id="cp-duration"
              type="number"
              value={cpTargetDuration}
              onChange={(e) => setCPTargetDuration(e.target.value)}
              placeholder="Override duration for multi-effort protocols"
            />
            <p className="text-xs text-muted-foreground">
              Multi-effort tests can be completed on alternate days within 4 days maximum. 
              Each protocol requires specific durations to be completed for CP & W' calculation.
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about your activity..."
          rows={3}
        />
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div>
          <p className="text-lg font-medium mb-2">
            Drop your activity files here
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports GPX, TCX, and FIT files
          </p>
          <input
            type="file"
            multiple
            accept=".gpx,.tcx,.fit"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              Browse Files
            </label>
          </Button>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Selected Files</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button onClick={handleUpload} disabled={loading} className="w-full">
            {loading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Uploading Files</h4>
          {uploadingFiles.map((item, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <File className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Progress value={item.progress} className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {item.status === 'uploading' ? 'Uploading...' : 
                     item.status === 'processing' ? 'Processing...' : 
                     item.status === 'complete' ? 'Complete' : 'Error'}
                  </span>
                </div>
              </div>
              {item.status === 'complete' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : item.status === 'error' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadingFile(item.file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}