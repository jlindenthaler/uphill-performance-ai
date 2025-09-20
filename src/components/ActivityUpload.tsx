import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useActivities } from '@/hooks/useActivities';
import { useSportMode } from '@/contexts/SportModeContext';

export function ActivityUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{ file: File; progress: number; status: 'uploading' | 'processing' | 'complete' | 'error' }[]>([]);
  const [activityName, setActivityName] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const { uploadActivity, loading } = useActivities();
  const { sportMode, setSportMode } = useSportMode();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return ['gpx', 'tcx', 'fit'].includes(extension || '');
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Please upload GPX, TCX, or FIT files only.",
        variant: "destructive"
      });
    }

    for (const file of validFiles) {
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
        
        updateProgress(60, 'processing');
        await uploadActivity(file, activityName || undefined);
        
        updateProgress(100, 'complete');
        
        toast({
          title: "Activity uploaded successfully",
          description: `${file.name} has been processed and added to your activities.`
        });

        // Clear completed uploads after 2 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(item => item.file !== file));
        }, 2000);

      } catch (error) {
        setUploadingFiles(prev => prev.map(item => 
          item.file === file ? { ...item, progress: 0, status: 'error' } : item
        ));
        
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive"
        });
      }
    }
  };

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(item => item.file !== file));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sport Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Select value={sportMode} onValueChange={setSportMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cycling">Cycling</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="swimming">Swimming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activityName">Activity Name (Optional)</Label>
              <Input
                id="activityName"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="e.g., Morning Ride"
              />
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
        </CardContent>
      </Card>
    </div>
  );
}