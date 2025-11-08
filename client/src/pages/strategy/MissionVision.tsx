import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Eye, 
  FileText,
  Save,
  Edit,
  ChevronLeft,
  CheckCircle,
  Info,
  Loader2,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModernDocumentEditor } from "@/components/DocumentEditor/ModernDocumentEditor";
import CreateObjectiveDialog from '@/components/okr/CreateObjectiveDialog';
import DOMPurify from 'dompurify';

export default function MissionVision() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editValues, setEditValues] = useState({
    mission: '',
    strategyStatementHtml: ''
  });
  const [showAddObjectiveDialog, setShowAddObjectiveDialog] = useState(false);

  // Fetch mission and vision data
  const { data: missionVisionData, isLoading } = useQuery({
    queryKey: ['/api/strategy/mission-vision'],
    queryFn: async () => {
      const response = await fetch('/api/strategy/mission-vision', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch mission and vision');
      return response.json();
    }
  });

  // Update strategy statement mutation
  const updateMutation = useMutation({
    mutationFn: (data: { mission?: string; strategyStatementHtml?: string }) =>
      apiRequest('/api/strategy/mission-vision', {
        method: 'PUT',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/mission-vision'] });
      toast({
        title: "Mission & Strategy Updated",
        description: "Your mission and strategy statement have been saved successfully.",
      });
      setIsEditing(false);
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update strategy statement",
        variant: "destructive",
      });
    },
  });

  // Update edit values when data is loaded
  useEffect(() => {
    if (missionVisionData) {
      setEditValues({
        mission: missionVisionData.mission || '',
        strategyStatementHtml: missionVisionData.strategyStatementHtml || ''
      });
    }
  }, [missionVisionData]);

  // Fetch objectives for linked objectives section
  const { data: objectives = [] } = useQuery({
    queryKey: ['/api/strategy/objectives'],
    queryFn: async () => {
      const response = await fetch('/api/strategy/objectives', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch objectives');
      return response.json();
    }
  });

  // Transform objectives for display - show all objectives
  const linkedObjectives = objectives.map((obj: any) => ({
    id: obj.id,
    title: obj.title,
    status: obj.status?.toLowerCase() === 'live' ? 'on-track' : 'at-risk'
  }));

  const handleEdit = () => {
    setIsEditing(true);
    setEditValues({
      mission: missionVisionData?.mission || '',
      strategyStatementHtml: missionVisionData?.strategyStatementHtml || ''
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setHasChanges(false);
    setEditValues({
      mission: missionVisionData?.mission || '',
      strategyStatementHtml: missionVisionData?.strategyStatementHtml || ''
    });
  };

  const handleSave = () => {
    updateMutation.mutate({
      mission: editValues.mission,
      strategyStatementHtml: editValues.strategyStatementHtml
    });
  };

  const handleMissionChange = (value: string) => {
    setEditValues({ ...editValues, mission: value });
    setHasChanges(true);
  };

  const handleStrategyChange = (value: string) => {
    setEditValues({ ...editValues, strategyStatementHtml: value });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Format the last updated date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get user name for display
  const getUserName = (userId: number | undefined) => {
    if (!userId) return 'System';
    if (userId === currentUser?.id) return currentUser?.fullName || 'You';
    return 'Team Member';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-gray-900 text-[18px] font-semibold mt-[0px] mb-[0px]">Mission & Strategy</h1>
          <p className="text-gray-600 text-[12px]">Define your organisation's mission and strategic direction</p>
        </div>
        {!isEditing ? (
          <Button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 text-[14px]">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="flex items-center gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Mission Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-[18px] mt-[0px] mb-[0px]">
            <FileText className="h-5 w-5 text-primary" />
            Mission Statement
          </CardTitle>
          <CardDescription className="text-muted-foreground text-[12px] mt-[0px] mb-[0px]">What your organization does and why it exists</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Label htmlFor="mission">Mission</Label>
              <Textarea
                id="mission"
                value={editValues.mission}
                onChange={(e) => handleMissionChange(e.target.value)}
                placeholder="Enter your organization's mission statement - what you do and who you serve..."
                className="min-h-[120px]"
                data-testid="input-mission"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {missionVisionData?.mission ? (
                <p className="text-gray-700 leading-relaxed text-[14px]" data-testid="text-mission">
                  {missionVisionData.mission}
                </p>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No mission statement defined yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategy Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-[18px] mt-[0px] mb-[0px]">
            <FileText className="h-5 w-5 text-primary" />
            Strategy Statement
          </CardTitle>
          <CardDescription className="text-muted-foreground text-[12px] mt-[0px] mb-[0px]">Define your organisation's vision, values, and strategic direction in a comprehensive document</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Label htmlFor="strategy">Strategy Document</Label>
              <ModernDocumentEditor
                content={editValues.strategyStatementHtml}
                onChange={handleStrategyChange}
                placeholder="Describe your vision - where you see your organization in the future. Include your values and strategic priorities..."
              />
            </div>
          ) : (
            <div className="space-y-4">
              {missionVisionData?.strategyStatementHtml ? (
                <div 
                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  data-testid="text-strategy"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(missionVisionData.strategyStatementHtml, {
                      ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote', 'a', 'img', 'br', 'code', 'pre', 'iframe'],
                      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel', 'frameborder', 'allowfullscreen']
                    })
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No strategy statement defined yet</p>
                  <p className="text-sm">Create a comprehensive strategy document that includes your vision, values, and strategic priorities.</p>
                </div>
              )}
              {missionVisionData?.strategyStatementHtml && (
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-6 pt-4 border-t">
                  <span>Last updated: {formatDate(missionVisionData?.updatedAt)}</span>
                  <span>By: {getUserName(missionVisionData?.updatedBy)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Linked Objectives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-[18px] mt-[0px] mb-[0px]">
                <Eye className="h-5 w-5 text-primary" />
                Linked Objectives
              </CardTitle>
              <CardDescription>
                All strategic objectives must align with your mission and vision
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowAddObjectiveDialog(true)}
              className="flex items-center gap-2"
              data-testid="button-add-objective"
            >
              <Plus className="h-4 w-4" />
              Add New Objective
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-[6.6px] pb-[6.6px] pl-[11.6px] pr-[11.6px] text-[12px]">
          <div className="space-y-3">
            {linkedObjectives.map((objective: any) => (
              <div 
                key={objective.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setLocation('/strategy/objectives')}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="font-medium">{objective.title}</span>
                </div>
                <Badge 
                  variant="outline"
                  className={
                    objective.status === "on-track" 
                      ? "text-green-600 border-green-200" 
                      : "text-yellow-600 border-yellow-200"
                  }
                >
                  {objective.status.replace("-", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Add New Objective Dialog */}
      <CreateObjectiveDialog 
        open={showAddObjectiveDialog}
        onOpenChange={setShowAddObjectiveDialog}
      />
    </div>
  );
}