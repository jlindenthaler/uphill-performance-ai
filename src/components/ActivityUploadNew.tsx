import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Upload, X, CheckCircle, AlertCircle, FileText, MapPin, Clock, Shield } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useSportMode } from '@/contexts/SportModeContext';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { activityUploadSchema, fileUploadSchema, type ActivityUploadFormData } from '@/lib/validation';

interface ActivityUploadNewProps {
  onUploadSuccess?: (activityId?: string) => void;
}

export function ActivityUploadNew({ onUploadSuccess }: ActivityUploadNewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{file: File, progress: number, status: 'uploading' | 'processing' | 'complete' | 'error'}[]>([]);
  const [formData, setFormData] = useState<ActivityUploadFormData>({
    activityName: '',
    notes: '',
    cpTargetDuration: undefined
  });
  const [detectedSport, setDetectedSport] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCPTest, setIsCPTest] = useState(false);
  const [cpProtocol, setCpProtocol] = useState<string>('8min');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { sportMode } = useSportMode();
  const { uploadActivity } = useActivities();
  const { checkUploadRateLimit, logSecurityEvent, clearRateLimit, isBlocked } = useSecurityMonitoring();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  }, []);

  // Enhanced file validation with security checks
  const addFiles = useCallback((files: File[]) => {
    // Rate limit check
    if (!checkUploadRateLimit()) {
      return;
    }

    // Validate files using schema
    const fileValidation = fileUploadSchema.safeParse({ files: Array.from(files) });
    
    if (!fileValidation.success) {
      const errorMessage = fileValidation.error.errors[0]?.message || 'Invalid files';
      
      logSecurityEvent('file_validation_failed', { 
        fileCount: files.length,
        totalSize: Array.from(files).reduce((sum, f) => sum + f.size, 0),
        error: errorMessage
      });
      
      toast({
        title: 'Invalid files detected',
        description: errorMessage,
        variant: 'destructive'
      });
      return;
    }

    const validFiles = fileValidation.data.files;

    // Additional security checks
    const suspiciousFiles = validFiles.filter(file => {
      // Check for suspicious file names
      const hasNullBytes = file.name.includes('\0');
      const hasControlChars = /[\x00-\x1f\x7f-\x9f]/.test(file.name);
      const isExcessivelyLong = file.name.length > 255;
      
      return hasNullBytes || hasControlChars || isExcessivelyLong;
    });

    if (suspiciousFiles.length > 0) {
      logSecurityEvent('suspicious_files_detected', { 
        suspiciousFileNames: suspiciousFiles.map(f => f.name.substring(0, 50))
      });
      
      toast({
        title: 'Security Warning',
        description: 'Some files have suspicious names and were rejected.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    logSecurityEvent('files_accepted', { 
      fileCount: validFiles.length,
      totalSize: validFiles.reduce((sum, f) => sum + f.size, 0),
      fileTypes: validFiles.map(f => f.name.split('.').pop()?.toLowerCase())
    });
    
    // Auto-detect activity info for the first valid file
    if (validFiles.length > 0) {
      detectActivityInfo(validFiles[0]);
    }
  }, [checkUploadRateLimit, logSecurityEvent]);

  const detectActivityInfo = async (file: File) => {
    try {
      // Simplified detection - extract basic info from filename and file type
      const name = file.name.replace(/\.(gpx|tcx|fit)$/i, '');
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      // Basic sport mode detection based on file patterns
      let detectedSportMode = 'cycling'; // default
      
      if (name.toLowerCase().includes('run') || name.toLowerCase().includes('jog')) {
        detectedSportMode = 'running';
      } else if (name.toLowerCase().includes('swim') || name.toLowerCase().includes('pool')) {
        detectedSportMode = 'swimming';
      } else if (name.toLowerCase().includes('bike') || name.toLowerCase().includes('cycle')) {
        detectedSportMode = 'cycling';
      }
      
      // Generate suggested name from filename
      const suggestedActivityName = name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
      
      setDetectedSport(detectedSportMode);
      setSuggestedName(suggestedActivityName);
      
      // Auto-populate form if values are detected
      if (suggestedActivityName && !formData.activityName) {
        setFormData(prev => ({ ...prev, activityName: suggestedActivityName }));
      }
    } catch (error) {
      console.warn('Failed to detect activity info:', error);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== fileToRemove));
    
    // Clear detection results if this was the only file
    if (selectedFiles.length === 1) {
      setDetectedSport(null);
      setSuggestedName(null);
    }
  };

  // Form validation
  const validateForm = () => {
    const result = activityUploadSchema.safeParse({
      activityName: formData.activityName || undefined,
      notes: formData.notes || undefined,
      cpTargetDuration: formData.cpTargetDuration ? formData.cpTargetDuration.toString() : undefined
    });
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(error => {
        newErrors[error.path[0] as string] = error.message;
      });
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    // Rate limit check
    if (!checkUploadRateLimit()) {
      return;
    }
    
    // Form validation
    if (!validateForm()) {
      logSecurityEvent('upload_validation_failed', { 
        errors: Object.keys(errors),
        fileCount: selectedFiles.length
      });
      return;
    }
    
    setLoading(true);
    setUploadingFiles([]);

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
          cp_test_target_duration: formData.cpTargetDuration ? parseInt(formData.cpTargetDuration.toString()) : undefined
        } : undefined;
        
        const uploadedActivity = await uploadActivity(
          file, 
          formData.activityName || undefined, 
          formData.notes || undefined,
          cpTestData
        );
        console.log('Activity uploaded successfully:', uploadedActivity);
        
        logSecurityEvent('upload_success', { 
          fileName: file.name.substring(0, 50),
          fileSize: file.size,
          activityId: uploadedActivity?.id
        });
        
        // Clear rate limits on success
        clearRateLimit('upload');
        
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
            window.dispatchEvent(new CustomEvent('activityUploaded'));
          }, 100);
        }, 2000);
        
      } catch (error: any) {
        console.error('Error uploading activity:', error);
        
        logSecurityEvent('upload_failed', { 
          fileName: file.name.substring(0, 50),
          fileSize: file.size,
          error: error.message
        });
        
        setUploadingFiles(prev => prev.map(item => 
          item.file === file ? { ...item, status: 'error' } : item
        ));
        
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}: ${error.message || 'Unknown error'}`,
          variant: 'destructive'
        });
      }
    }

    // Clear form after upload attempt
    setSelectedFiles([]);
    setUploadingFiles([]);
    setFormData({ activityName: '', notes: '', cpTargetDuration: undefined });
    setDetectedSport(null);
    setSuggestedName(null);
    setIsCPTest(false);
    setCpProtocol('8min');
    setErrors({});
    setLoading(false);
  };

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(item => item.file !== file));
  };

  const handleInputChange = (field: keyof ActivityUploadFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Upload Training Files
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isBlocked && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Too many upload attempts. Please wait before trying again.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Auto-Detection Results */}
        {(detectedSport || suggestedName) && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Auto-detected information:</p>
                {detectedSport && (
                  <p className="text-sm">Sport: <span className="font-medium capitalize">{detectedSport}</span></p>
                )}
                {suggestedName && (
                  <p className="text-sm">Suggested name: <span className="font-medium">{suggestedName}</span></p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Sport Selection */}
        <div className="space-y-2">
          <Label>Current Sport Mode</Label>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <span className="text-sm font-medium capitalize">{sportMode}</span>
            {detectedSport && detectedSport !== sportMode && (
              <span className="text-xs text-muted-foreground">
                (detected: {detectedSport})
              </span>
            )}
          </div>
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
              Supports GPX, TCX, and FIT files (max 20MB each, 10 files total)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".gpx,.tcx,.fit"
              onChange={handleFileInput}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              Browse Files
            </Button>
          </div>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
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
          </div>
        )}

        {/* Activity Name */}
        <div className="space-y-2">
          <Label htmlFor="activity-name">Activity Name (optional)</Label>
          <Input
            id="activity-name"
            type="text"
            value={formData.activityName}
            onChange={(e) => handleInputChange('activityName', e.target.value)}
            placeholder={suggestedName || "Enter activity name..."}
            className={errors.activityName ? 'border-destructive' : ''}
          />
          {errors.activityName && (
            <p className="text-sm text-destructive">{errors.activityName}</p>
          )}
          {suggestedName && !errors.activityName && (
            <p className="text-sm text-muted-foreground">
              Suggested: {suggestedName}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Add any notes about this activity..."
            rows={3}
            className={errors.notes ? 'border-destructive' : ''}
          />
          {errors.notes && (
            <p className="text-sm text-destructive">{errors.notes}</p>
          )}
        </div>

        {/* CP Test Toggle */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isCPTest}
              onCheckedChange={setIsCPTest}
            />
            <Label className="text-sm font-medium">
              Mark as Critical Power Test
            </Label>
          </div>
          
          {isCPTest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Test Protocol</Label>
                <RadioGroup value={cpProtocol} onValueChange={setCpProtocol}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="8min" id="8min" />
                    <Label htmlFor="8min">8-minute test</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="20min" id="20min" />
                    <Label htmlFor="20min">20-minute test</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom">Custom duration</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {cpProtocol === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="cp-duration">Target Duration (seconds)</Label>
                  <Input
                    id="cp-duration"
                    type="number"
                    value={formData.cpTargetDuration || ''}
                    onChange={(e) => handleInputChange('cpTargetDuration', e.target.value)}
                    placeholder="e.g., 480 for 8 minutes"
                    min="1"
                    max="3600"
                    className={errors.cpTargetDuration ? 'border-destructive' : ''}
                  />
                  {errors.cpTargetDuration && (
                    <p className="text-sm text-destructive">{errors.cpTargetDuration}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Uploading Files Progress */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Upload Progress</h4>
            {uploadingFiles.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
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

        <Button 
          onClick={handleUpload} 
          disabled={selectedFiles.length === 0 || loading || isBlocked}
          className="w-full"
        >
          {loading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
        </Button>
      </CardContent>
    </Card>
  );
}