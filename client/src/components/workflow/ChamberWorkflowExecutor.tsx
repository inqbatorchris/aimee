import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  MapPin, 
  Camera, 
  CheckCircle2,
  Loader2,
  Navigation,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkflowStep {
  id: string;
  type: string;
  label: string;
  description?: string;
  order: number;
  required: boolean;
  config?: {
    fields?: Array<{
      id: string;
      name: string;
      label: string;
      type: string;
      required: boolean;
      options?: string[];
      placeholder?: string;
    }>;
    minPhotos?: number;
    maxPhotos?: number;
    category?: string;
    placeholder?: string;
    multiline?: boolean;
  };
}

interface ChamberWorkflowExecutorProps {
  workItemId: number;
  templateId: string;
  onComplete?: () => void;
}

export default function ChamberWorkflowExecutor({ 
  workItemId, 
  templateId,
  onComplete 
}: ChamberWorkflowExecutorProps) {
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [executionData, setExecutionData] = useState<Record<string, any>>({});
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Fetch workflow template
  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: [`/api/workflows/templates/${templateId}`],
  });

  // Assign workflow to work item
  const assignWorkflowMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/workflows/work-items/${workItemId}/assign`, {
        method: 'POST',
        body: { templateId }
      });
    }
  });

  // Complete workflow
  const completeWorkflowMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/workflows/work-items/${workItemId}/workflow/complete`, {
        method: 'POST',
        body: { executionData: data }
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/nodes'] });
      
      toast({
        title: 'Chamber Record Created',
        description: 'The new chamber record has been successfully added to the fiber network.',
      });
      
      onComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete workflow',
        variant: 'destructive',
      });
    }
  });

  useEffect(() => {
    if (template && !assignWorkflowMutation.data) {
      assignWorkflowMutation.mutate();
    }
  }, [template]);

  if (isLoadingTemplate || !template) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps: WorkflowStep[] = template.steps || [];
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex >= steps.length - 1;
  const completedSteps = Object.keys(executionData).filter(k => executionData[k].completed).length;

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const stepData = executionData[currentStep.id] || { data: {} };
          setExecutionData({
            ...executionData,
            [currentStep.id]: {
              ...stepData,
              data: {
                ...stepData.data,
                latitude: position.coords.latitude.toFixed(8),
                longitude: position.coords.longitude.toFixed(8)
              }
            }
          });
          setIsGettingLocation(false);
          toast({
            title: 'Location Captured',
            description: `Lat: ${position.coords.latitude.toFixed(6)}, Lon: ${position.coords.longitude.toFixed(6)}`,
          });
        },
        (error) => {
          setIsGettingLocation(false);
          toast({
            title: 'Location Error',
            description: error.message || 'Unable to get location. Please enter manually.',
            variant: 'destructive',
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setIsGettingLocation(false);
      toast({
        title: 'Not Supported',
        description: 'Geolocation is not supported by this device',
        variant: 'destructive',
      });
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const stepData = executionData[currentStep.id] || { photos: [] };
    const existingPhotos = stepData.photos || [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoData = {
          data: e.target?.result as string,
          fileName: file.name,
          fileSize: file.size,
          timestamp: new Date().toISOString(),
          category: currentStep.config?.category || 'general'
        };

        setExecutionData(prev => ({
          ...prev,
          [currentStep.id]: {
            ...prev[currentStep.id],
            photos: [...(prev[currentStep.id]?.photos || []), photoData]
          }
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    const stepData = executionData[currentStep.id] || { data: {} };
    setExecutionData({
      ...executionData,
      [currentStep.id]: {
        ...stepData,
        data: {
          ...stepData.data,
          [fieldId]: value
        }
      }
    });
  };

  const handleNext = () => {
    const stepData = executionData[currentStep.id] || {};
    
    // Validate required fields
    if (currentStep.required) {
      if (currentStep.type === 'photo') {
        const photos = stepData.photos || [];
        const minPhotos = currentStep.config?.minPhotos || 1;
        if (photos.length < minPhotos) {
          toast({
            title: 'Photos Required',
            description: `Please capture at least ${minPhotos} photo(s)`,
            variant: 'destructive',
          });
          return;
        }
      } else if (currentStep.type === 'geolocation') {
        if (!stepData.geolocation || !stepData.geolocation.latitude || !stepData.geolocation.longitude) {
          toast({
            title: 'Location Required',
            description: 'Please capture your GPS location',
            variant: 'destructive',
          });
          return;
        }
      } else if (currentStep.type === 'form') {
        const requiredFields = currentStep.config?.fields?.filter(f => f.required) || [];
        const missingFields = requiredFields.filter(f => !stepData.data?.[f.id]);
        if (missingFields.length > 0) {
          toast({
            title: 'Required Fields',
            description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // Mark step as completed
    const updatedData = {
      ...executionData,
      [currentStep.id]: {
        ...stepData,
        completed: true
      }
    };
    setExecutionData(updatedData);

    // Move to next step or complete
    if (isLastStep) {
      completeWorkflowMutation.mutate(updatedData);
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const renderStepContent = () => {
    const stepData = executionData[currentStep.id] || { data: {}, photos: [], geolocation: null };

    switch (currentStep.type) {
      case 'geolocation':
        return (
          <div className="space-y-4">
            {!stepData.geolocation ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-2">Capture GPS Coordinates</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Click below to record your current location
                </p>
                <Button
                  onClick={async () => {
                    if (!navigator.geolocation) {
                      toast({
                        title: 'Not Supported',
                        description: 'Geolocation is not supported by this device',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    setIsGettingLocation(true);
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const geolocation = {
                          latitude: position.coords.latitude,
                          longitude: position.coords.longitude,
                          timestamp: new Date().toISOString()
                        };
                        
                        setExecutionData(prev => ({
                          ...prev,
                          [currentStep.id]: {
                            ...prev[currentStep.id],
                            geolocation
                          }
                        }));
                        
                        setIsGettingLocation(false);
                        toast({
                          title: 'Location Captured',
                          description: `Coordinates: ${geolocation.latitude.toFixed(6)}, ${geolocation.longitude.toFixed(6)}`,
                        });
                      },
                      (error) => {
                        setIsGettingLocation(false);
                        toast({
                          title: 'Error',
                          description: `Failed to capture location: ${error.message}`,
                          variant: 'destructive',
                        });
                      },
                      {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                      }
                    );
                  }}
                  disabled={isGettingLocation}
                  data-testid="button-capture-location"
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4 mr-2" />
                      Capture My Location
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Location Captured</span>
                </div>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Latitude</div>
                      <div className="font-mono text-sm font-medium">
                        {stepData.geolocation.latitude.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Longitude</div>
                      <div className="font-mono text-sm font-medium">
                        {stepData.geolocation.longitude.toFixed(6)}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!navigator.geolocation) return;
                    
                    setIsGettingLocation(true);
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const geolocation = {
                          latitude: position.coords.latitude,
                          longitude: position.coords.longitude,
                          timestamp: new Date().toISOString()
                        };
                        
                        setExecutionData(prev => ({
                          ...prev,
                          [currentStep.id]: {
                            ...prev[currentStep.id],
                            geolocation
                          }
                        }));
                        
                        setIsGettingLocation(false);
                        toast({
                          title: 'Location Updated',
                          description: `New coordinates: ${geolocation.latitude.toFixed(6)}, ${geolocation.longitude.toFixed(6)}`,
                        });
                      },
                      (error) => {
                        setIsGettingLocation(false);
                        toast({
                          title: 'Error',
                          description: `Failed to update location: ${error.message}`,
                          variant: 'destructive',
                        });
                      }
                    );
                  }}
                  disabled={isGettingLocation}
                  className="w-full"
                  data-testid="button-recapture-location"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recapture Location
                </Button>
              </div>
            )}
          </div>
        );
      
      case 'form':
        return (
          <div className="space-y-4">
            {currentStep.config?.fields?.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                
                {field.type === 'select' ? (
                  <Select
                    value={stepData.data[field.id] || ''}
                    onValueChange={(value) => handleFieldChange(field.id, value)}
                  >
                    <SelectTrigger id={field.id} data-testid={`select-${field.id}`}>
                      <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.id}
                    data-testid={`input-${field.id}`}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={stepData.data[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    step={field.type === 'number' ? 'any' : undefined}
                  />
                )}
                
                {field.id === 'longitude' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGetCurrentLocation}
                    disabled={isGettingLocation}
                    className="w-full mt-2"
                    data-testid="button-get-location"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <Navigation className="h-4 w-4 mr-2" />
                        Get Current Location
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        );

      case 'photo':
        const photos = stepData.photos || [];
        const maxPhotos = currentStep.config?.maxPhotos || 5;
        
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                {photos.length} / {maxPhotos} photos captured
              </p>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="max-w-xs mx-auto"
                data-testid="input-photo"
                disabled={photos.length >= maxPhotos}
              />
            </div>
            
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo: any, index: number) => (
                  <div key={index} className="relative aspect-square">
                    <img 
                      src={photo.data} 
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'text_input':
        return (
          <div className="space-y-2">
            <Label htmlFor="notes">
              {currentStep.label}
              {currentStep.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {currentStep.config?.multiline ? (
              <Textarea
                id="notes"
                data-testid="textarea-notes"
                placeholder={currentStep.config?.placeholder}
                value={stepData.data?.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                rows={4}
              />
            ) : (
              <Input
                id="notes"
                data-testid="input-notes"
                placeholder={currentStep.config?.placeholder}
                value={stepData.data?.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
              />
            )}
          </div>
        );

      default:
        return (
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p>Unknown step type: {currentStep.type}</p>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary">
            Step {currentStepIndex + 1} of {steps.length}
          </Badge>
          <Badge variant="outline">
            {completedSteps} / {steps.length} completed
          </Badge>
        </div>
        <CardTitle className="flex items-center gap-2" data-testid="text-step-title">
          <MapPin className="h-5 w-5" />
          {currentStep.label}
        </CardTitle>
        {currentStep.description && (
          <CardDescription>{currentStep.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {renderStepContent()}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="flex-1"
              data-testid="button-previous"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={completeWorkflowMutation.isPending}
              className="flex-1"
              data-testid="button-next"
            >
              {completeWorkflowMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isLastStep ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete
                </>
              ) : (
                'Next'
              )}
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-1">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 h-2 rounded ${
                  executionData[step.id]?.completed
                    ? 'bg-primary'
                    : index === currentStepIndex
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
