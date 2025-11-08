import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Target, Edit2, TrendingUp, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import CreateObjectiveDialog from '@/components/okr/CreateObjectiveDialog';
import { MissionEditorPanel } from '@/components/strategy/MissionEditorPanel';

const kpiUpdateSchema = z.object({
  currentNumber: z.number().min(0, 'Current number must be positive'),
});

type KPIUpdateData = z.infer<typeof kpiUpdateSchema>;

interface MissionDisplayProps {
  mission: any;
  loading: boolean;
}

export function MissionDisplay({ mission, loading }: MissionDisplayProps) {
  const { currentUser } = useAuth();
  const [showKPIDialog, setShowKPIDialog] = useState(false);
  const [showMissionDialog, setShowMissionDialog] = useState(false);
  const [showCreateObjectiveDialog, setShowCreateObjectiveDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'super_admin';

  // Extract KPI data (assuming format like "Target: 1000 customers, Current: 750")
  const parseKPIData = (kpiString: string) => {
    const targetMatch = kpiString.match(/(\d+)/);
    const currentMatch = kpiString.match(/Current:\s*(\d+)/);
    
    const target = targetMatch ? parseInt(targetMatch[1]) : 1000;
    const current = currentMatch ? parseInt(currentMatch[1]) : 750;
    
    return { target, current };
  };

  // Sanitize HTML content (matching MissionEditorPanel approach)
  const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
    });
  };

  // Create combined content from vision and mission (matching MissionEditorPanel approach)
  const getCombinedContent = (mission: any): string => {
    if (!mission) return '';

    // Handle backward compatibility: prefer mission.mission, fall back to mission.description
    const missionText = mission.mission || mission.description || '';
    const visionText = mission.vision || '';

    // Sanitize inputs first
    const sanitizedVision = visionText ? sanitizeHtml(visionText) : '';
    const sanitizedMission = missionText ? sanitizeHtml(missionText) : '';

    // Combine content based on what's available
    if (sanitizedVision && sanitizedMission) {
      return `<h3>Vision</h3><p>${sanitizedVision}</p><h3>Mission</h3>${sanitizedMission}`;
    } else if (sanitizedVision) {
      return `<h3>Vision</h3><p>${sanitizedVision}</p>`;
    } else if (sanitizedMission) {
      return sanitizedMission;
    }

    return '';
  };

  const kpiData = mission?.kpi ? parseKPIData(mission.kpi) : { target: 1000, current: 750 };
  const percentage = Math.round((kpiData.current / kpiData.target) * 100);

  const kpiForm = useForm<KPIUpdateData>({
    resolver: zodResolver(kpiUpdateSchema),
    defaultValues: {
      currentNumber: kpiData.current,
    },
  });



  const updateKPIMutation = useMutation({
    mutationFn: (data: KPIUpdateData) =>
      apiRequest('/api/strategy/mission/kpi', {
        method: 'POST',
        body: {
          currentNumber: data.currentNumber,
          target: kpiData.target,
          updatedBy: currentUser?.id,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/mission-vision'] });
      toast({
        title: "Success",
        description: "KPI updated successfully"
      });
      setShowKPIDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update KPI",
        variant: "destructive"
      });
    }
  });

  const handleKPISubmit = (data: KPIUpdateData) => {
    updateKPIMutation.mutate(data);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted animate-pulse h-20 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!mission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No mission configured</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mission Statement Card - Compact */}
      <Card>
        <CardHeader className="pb-1 p-3">
          <CardTitle className="flex items-center justify-between">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowMissionDialog(true);
                }}
                className="text-xs h-6 px-2 ml-auto"
              >
                <Edit2 className="h-2.5 w-2.5 mr-1" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-2">
            <div>
              <h3 className="font-medium text-sm mb-2 leading-tight">{mission.title}</h3>
              <div 
                data-testid="text-mission-content"
                className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none
                  prose-headings:text-xs prose-headings:font-medium prose-headings:mb-1 prose-headings:mt-2
                  prose-p:text-xs prose-p:mb-2 prose-p:leading-relaxed
                  prose-ul:text-xs prose-ul:my-1 prose-ul:pl-4
                  prose-ol:text-xs prose-ol:my-1 prose-ol:pl-4
                  prose-li:text-xs prose-li:my-0.5
                  prose-strong:text-xs prose-strong:font-semibold
                  prose-em:text-xs
                  prose-img:rounded-md prose-img:my-2"
                dangerouslySetInnerHTML={{ __html: getCombinedContent(mission) }}
              />
            </div>
            {canEdit && (
              <div className="pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateObjectiveDialog(true)}
                  className="text-xs h-6 px-2"
                >
                  <Plus className="h-2.5 w-2.5 mr-1" />
                  Add Objective
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>



      {/* Edit Mission Panel */}
      <MissionEditorPanel
        mission={mission}
        open={showMissionDialog}
        onClose={() => setShowMissionDialog(false)}
      />

      {/* Create Objective Dialog */}
      <CreateObjectiveDialog
        open={showCreateObjectiveDialog}
        onOpenChange={setShowCreateObjectiveDialog}
      />
    </>
  );
}