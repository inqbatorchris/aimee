import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  Video,
  CheckSquare,
  FileText,
  HelpCircle,
  Wrench,
  ChevronDown,
  ChevronUp,
  X,
  GraduationCap,
  Award,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { TrainingModuleStep, TrainingQuizQuestion, KnowledgeDocument } from '@shared/schema';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type StepType = 'video' | 'checklist' | 'resource' | 'quiz' | 'practical_task';
type CompletionRequirement = 'all_steps' | 'quiz' | 'both';

interface StepConfig {
  url?: string;
  embedType?: 'youtube' | 'vimeo';
  items?: Array<{ id: string; label: string; required: boolean }>;
  passingScore?: number;
  maxAttempts?: number;
  pointsPerQuestion?: number[];
  requiresSupervisorSignoff?: boolean;
  instructions?: string;
  linkedDocumentId?: number;
  linkedDocumentTitle?: string;
}

const STEP_TYPE_INFO: Record<StepType, { icon: typeof Video; label: string; color: string }> = {
  video: { icon: Video, label: 'Video', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  checklist: { icon: CheckSquare, label: 'Checklist', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resource: { icon: FileText, label: 'Resource', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  quiz: { icon: HelpCircle, label: 'Quiz', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  practical_task: { icon: Wrench, label: 'Practical Task', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

interface SortableStepCardProps {
  step: TrainingModuleStep;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (stepId: number, updates: Partial<TrainingModuleStep>) => void;
  onDelete: (stepId: number) => void;
  questions: TrainingQuizQuestion[];
  onAddQuestion: (stepId: number) => void;
  onUpdateQuestion: (questionId: number, updates: Partial<TrainingQuizQuestion>) => void;
  onDeleteQuestion: (questionId: number) => void;
  availableDocuments?: KnowledgeDocument[];
}

function SortableStepCard({
  step,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  availableDocuments = [],
}: SortableStepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stepInfo = STEP_TYPE_INFO[step.stepType as StepType] || STEP_TYPE_INFO.resource;
  const Icon = stepInfo.icon;
  const config = (step.config || {}) as StepConfig;

  return (
    <Card ref={setNodeRef} style={style} className="mb-4" data-testid={`step-card-${step.id}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <Badge className={stepInfo.color}>
            <Icon className="h-3 w-3 mr-1" />
            {stepInfo.label}
          </Badge>
          <span className="text-sm text-muted-foreground">Step {step.stepOrder}</span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            data-testid={`button-toggle-step-${step.id}`}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(step.id)}
            data-testid={`button-delete-step-${step.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {!isExpanded && (
          <div className="mt-2 text-sm font-medium">{step.title || 'Untitled Step'}</div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-4">
          <div>
            <Label htmlFor={`step-title-${step.id}`}>Title</Label>
            <Input
              id={`step-title-${step.id}`}
              value={step.title}
              onChange={(e) => onUpdate(step.id, { title: e.target.value })}
              placeholder="Enter step title..."
              data-testid={`input-step-title-${step.id}`}
            />
          </div>

          <div>
            <Label htmlFor={`step-description-${step.id}`}>Description</Label>
            <Textarea
              id={`step-description-${step.id}`}
              value={step.description || ''}
              onChange={(e) => onUpdate(step.id, { description: e.target.value })}
              placeholder="Enter step description..."
              className="min-h-[60px]"
              data-testid={`textarea-step-description-${step.id}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`step-time-${step.id}`}>Estimated Time (minutes)</Label>
              <Input
                id={`step-time-${step.id}`}
                type="number"
                min={1}
                value={step.estimatedMinutes || 5}
                onChange={(e) => onUpdate(step.id, { estimatedMinutes: parseInt(e.target.value) || 5 })}
                data-testid={`input-step-time-${step.id}`}
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`step-required-${step.id}`}
                  checked={step.required !== false}
                  onCheckedChange={(checked) => onUpdate(step.id, { required: checked as boolean })}
                  data-testid={`checkbox-step-required-${step.id}`}
                />
                <Label htmlFor={`step-required-${step.id}`}>Required step</Label>
              </div>
            </div>
          </div>

          {step.stepType === 'video' && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor={`step-video-url-${step.id}`}>Video URL</Label>
                <Input
                  id={`step-video-url-${step.id}`}
                  value={config.url || ''}
                  onChange={(e) => onUpdate(step.id, { config: { ...config, url: e.target.value } })}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  data-testid={`input-video-url-${step.id}`}
                />
              </div>
              <div>
                <Label>Embed Type</Label>
                <Select
                  value={config.embedType || 'youtube'}
                  onValueChange={(value) => onUpdate(step.id, { config: { ...config, embedType: value as 'youtube' | 'vimeo' } })}
                >
                  <SelectTrigger data-testid={`select-embed-type-${step.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step.stepType === 'checklist' && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <Label>Checklist Items</Label>
              <div className="space-y-2">
                {(config.items || []).map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={item.label}
                      onChange={(e) => {
                        const newItems = [...(config.items || [])];
                        newItems[idx] = { ...item, label: e.target.value };
                        onUpdate(step.id, { config: { ...config, items: newItems } });
                      }}
                      className="flex-1"
                      data-testid={`input-checklist-item-${step.id}-${idx}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        const newItems = (config.items || []).filter((_, i) => i !== idx);
                        onUpdate(step.id, { config: { ...config, items: newItems } });
                      }}
                      data-testid={`button-delete-checklist-item-${step.id}-${idx}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newItems = [...(config.items || []), { id: Date.now().toString(), label: '', required: true }];
                  onUpdate(step.id, { config: { ...config, items: newItems } });
                }}
                data-testid={`button-add-checklist-item-${step.id}`}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          )}

          {step.stepType === 'resource' && (
            <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor={`step-content-${step.id}`}>Resource Content</Label>
                <Textarea
                  id={`step-content-${step.id}`}
                  value={step.content || ''}
                  onChange={(e) => onUpdate(step.id, { content: e.target.value })}
                  placeholder="Enter the resource content, instructions, or reference material..."
                  className="min-h-[120px]"
                  data-testid={`textarea-step-content-${step.id}`}
                />
              </div>
              
              <div className="border-t pt-4">
                <Label className="text-sm text-muted-foreground">Link to Existing Document (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Optionally link to an existing Knowledge Base document for reference
                </p>
                
                {availableDocuments.filter(doc => doc.documentType !== 'training_module').length > 0 ? (
                  <Select
                    value={config.linkedDocumentId?.toString() || 'none'}
                    onValueChange={(value) => {
                      if (!value || value === 'none') {
                        const newConfig: StepConfig = { 
                          ...config, 
                          linkedDocumentId: undefined,
                          linkedDocumentTitle: undefined
                        };
                        onUpdate(step.id, { config: newConfig as any });
                        return;
                      }
                      const docId = parseInt(value);
                      if (isNaN(docId)) return;
                      const doc = availableDocuments.find(d => d.id === docId);
                      const newConfig: StepConfig = { 
                        ...config, 
                        linkedDocumentId: docId,
                        linkedDocumentTitle: doc?.title || ''
                      };
                      onUpdate(step.id, { config: newConfig as any });
                    }}
                  >
                    <SelectTrigger data-testid={`select-linked-document-${step.id}`}>
                      <SelectValue placeholder="Select a document to link..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableDocuments
                        .filter(doc => doc.documentType !== 'training_module')
                        .map((doc) => (
                          <SelectItem key={doc.id} value={doc.id.toString()}>
                            {doc.title}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No other documents available to link.
                  </p>
                )}
                
                {config.linkedDocumentId && (
                  <div className="flex items-center gap-2 p-2 mt-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Linked: {config.linkedDocumentTitle || 'Document #' + config.linkedDocumentId}
                    </span>
                    <a 
                      href={`/kb/documents/${config.linkedDocumentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-green-600 hover:underline"
                      data-testid={`link-view-document-${step.id}`}
                    >
                      View Document →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {step.stepType === 'quiz' && (
            <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`quiz-passing-score-${step.id}`}>Passing Score (%)</Label>
                  <Input
                    id={`quiz-passing-score-${step.id}`}
                    type="number"
                    min={0}
                    max={100}
                    value={config.passingScore || 80}
                    onChange={(e) => onUpdate(step.id, { config: { ...config, passingScore: parseInt(e.target.value) || 80 } })}
                    data-testid={`input-passing-score-${step.id}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`quiz-max-attempts-${step.id}`}>Max Attempts</Label>
                  <Input
                    id={`quiz-max-attempts-${step.id}`}
                    type="number"
                    min={1}
                    value={config.maxAttempts || 3}
                    onChange={(e) => onUpdate(step.id, { config: { ...config, maxAttempts: parseInt(e.target.value) || 3 } })}
                    data-testid={`input-max-attempts-${step.id}`}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Questions</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddQuestion(step.id)}
                    data-testid={`button-add-question-${step.id}`}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Question
                  </Button>
                </div>

                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <Card key={q.id} className="p-3" data-testid={`question-card-${q.id}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Q{idx + 1}:</span>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={q.questionText}
                            onChange={(e) => onUpdateQuestion(q.id, { questionText: e.target.value })}
                            placeholder="Enter question..."
                            data-testid={`input-question-text-${q.id}`}
                          />
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              value={q.points || 1}
                              onChange={(e) => onUpdateQuestion(q.id, { points: parseInt(e.target.value) || 1 })}
                              className="w-20"
                              data-testid={`input-question-points-${q.id}`}
                            />
                            <span className="text-sm text-muted-foreground">pts</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => onDeleteQuestion(q.id)}
                          data-testid={`button-delete-question-${q.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {questions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No questions yet. Add your first question above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step.stepType === 'practical_task' && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor={`step-instructions-${step.id}`}>Task Instructions</Label>
                <Textarea
                  id={`step-instructions-${step.id}`}
                  value={config.instructions || ''}
                  onChange={(e) => onUpdate(step.id, { config: { ...config, instructions: e.target.value } })}
                  placeholder="Describe the practical task..."
                  className="min-h-[100px]"
                  data-testid={`textarea-task-instructions-${step.id}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`step-supervisor-signoff-${step.id}`}
                  checked={config.requiresSupervisorSignoff !== false}
                  onCheckedChange={(checked) => onUpdate(step.id, { config: { ...config, requiresSupervisorSignoff: checked as boolean } })}
                  data-testid={`checkbox-supervisor-signoff-${step.id}`}
                />
                <Label htmlFor={`step-supervisor-signoff-${step.id}`}>Requires supervisor sign-off</Label>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function TrainingModuleEditor() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEditing = !!id;
  const documentId = id ? parseInt(id) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsValue, setPointsValue] = useState(50);
  const [completionRequirement, setCompletionRequirement] = useState<CompletionRequirement>('both');
  const [issueCertificate, setIssueCertificate] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [showAddStepDialog, setShowAddStepDialog] = useState(false);
  const [localSteps, setLocalSteps] = useState<TrainingModuleStep[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: document, isLoading: docLoading } = useQuery<KnowledgeDocument>({
    queryKey: [`/api/knowledge-base/documents/${documentId}`],
    enabled: isEditing && !!documentId,
  });

  const { data: steps = [], isLoading: stepsLoading } = useQuery<TrainingModuleStep[]>({
    queryKey: [`/api/knowledge-base/documents/${documentId}/training-steps`],
    enabled: isEditing && !!documentId,
  });

  const { data: allQuestions = {}, isLoading: questionsLoading } = useQuery<Record<number, TrainingQuizQuestion[]>>({
    queryKey: [`/api/knowledge-base/documents/${documentId}/all-questions`, steps.map(s => s.id).join(',')],
    queryFn: async () => {
      if (!documentId) return {};
      const quizSteps = steps.filter(s => s.stepType === 'quiz');
      if (quizSteps.length === 0) return {};
      
      const results = await Promise.all(
        quizSteps.map(async (step) => {
          try {
            const response = await apiRequest(`/api/knowledge-base/training-steps/${step.id}/questions`);
            if (response.ok) {
              const questions = await response.json();
              return { stepId: step.id, questions };
            }
          } catch (e) {
            console.error('Error fetching questions for step', step.id, e);
          }
          return { stepId: step.id, questions: [] };
        })
      );
      
      const questionsMap: Record<number, TrainingQuizQuestion[]> = {};
      for (const result of results) {
        questionsMap[result.stepId] = result.questions;
      }
      return questionsMap;
    },
    enabled: isEditing && !!documentId && steps.length > 0,
  });

  const { data: availableDocuments = [] } = useQuery<KnowledgeDocument[]>({
    queryKey: ['/api/knowledge-base/documents'],
  });

  useEffect(() => {
    if (document) {
      setTitle(document.title || '');
      setDescription(document.content || '');
      const metadata = (document.metadata || {}) as Record<string, any>;
      setPointsValue(metadata.pointsValue ?? 50);
      setCompletionRequirement(metadata.completionRequirement ?? 'both');
      setIssueCertificate(metadata.issueCertificate !== false);
    }
  }, [document]);

  useEffect(() => {
    setLocalSteps(steps);
  }, [steps]);

  const saveDocumentMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; metadata: Record<string, any> }) => {
      const url = isEditing
        ? `/api/knowledge-base/documents/${documentId}`
        : '/api/knowledge-base/documents';
      const response = await apiRequest(url, {
        method: isEditing ? 'PUT' : 'POST',
        body: {
          ...data,
          documentType: 'training_module',
          status: 'draft',
          categories: ['Training'],
          tags: [],
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save training module');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: 'Training module saved' });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
      if (!isEditing && data?.id) {
        navigate(`/knowledge-hub/training/modules/${data.id}/edit`);
      }
    },
    onError: (error: any) => {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    },
  });

  const createStepMutation = useMutation({
    mutationFn: async (stepType: StepType) => {
      if (!documentId) {
        throw new Error('Document must be saved first');
      }
      const response = await apiRequest(`/api/knowledge-base/documents/${documentId}/training-steps`, {
        method: 'POST',
        body: {
          title: `New ${STEP_TYPE_INFO[stepType].label} Step`,
          stepType,
          config: stepType === 'checklist' ? { items: [] } : {},
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add step');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/training-steps`] });
      setShowAddStepDialog(false);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add step', description: error.message, variant: 'destructive' });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, updates }: { stepId: number; updates: Partial<TrainingModuleStep> }) => {
      const response = await apiRequest(`/api/knowledge-base/training-steps/${stepId}`, {
        method: 'PUT',
        body: updates,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update step');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/training-steps`] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update step', description: error.message, variant: 'destructive' });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      const response = await apiRequest(`/api/knowledge-base/training-steps/${stepId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete step');
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/training-steps`] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete step', description: error.message, variant: 'destructive' });
    },
  });

  const reorderStepsMutation = useMutation({
    mutationFn: async (stepIds: number[]) => {
      const response = await apiRequest(`/api/knowledge-base/documents/${documentId}/training-steps/reorder`, {
        method: 'PUT',
        body: { stepIds },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reorder steps');
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/training-steps`] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to reorder steps', description: error.message, variant: 'destructive' });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (stepId: number) => {
      const response = await apiRequest(`/api/knowledge-base/training-steps/${stepId}/questions`, {
        method: 'POST',
        body: {
          questionText: 'New question',
          questionType: 'multiple_choice',
          options: [],
          points: 5,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add question');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/all-questions`] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add question', description: error.message, variant: 'destructive' });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ questionId, updates }: { questionId: number; updates: Partial<TrainingQuizQuestion> }) => {
      const response = await apiRequest(`/api/knowledge-base/quiz-questions/${questionId}`, {
        method: 'PUT',
        body: updates,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update question');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/all-questions`] });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      const response = await apiRequest(`/api/knowledge-base/quiz-questions/${questionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete question');
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/all-questions`] });
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }
    saveDocumentMutation.mutate({
      title,
      content: description,
      metadata: {
        pointsValue,
        completionRequirement,
        issueCertificate,
      },
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localSteps.findIndex((s) => s.id.toString() === active.id);
      const newIndex = localSteps.findIndex((s) => s.id.toString() === over.id);
      const newSteps = arrayMove(localSteps, oldIndex, newIndex);
      setLocalSteps(newSteps);
      reorderStepsMutation.mutate(newSteps.map((s) => s.id));
    }
  };

  const toggleStepExpanded = (stepId: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const debouncedUpdateStep = useCallback(
    (stepId: number, updates: Partial<TrainingModuleStep>) => {
      setLocalSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
      );
      updateStepMutation.mutate({ stepId, updates });
    },
    [updateStepMutation]
  );

  const totalEstimatedTime = localSteps.reduce((sum, s) => sum + (s.estimatedMinutes || 5), 0);

  if (docLoading || stepsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/strategy/knowledge-base')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Knowledge Hub
            </Button>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-semibold">Training Module Editor</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="button-preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveDocumentMutation.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveDocumentMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Module Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter module title..."
                data-testid="input-module-title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter module description..."
                className="min-h-[80px]"
                data-testid="textarea-module-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="points">Points Value (awarded on completion)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="points"
                    type="number"
                    min={0}
                    value={pointsValue}
                    onChange={(e) => setPointsValue(parseInt(e.target.value) || 0)}
                    className="w-24"
                    data-testid="input-points-value"
                  />
                  <span className="text-sm text-muted-foreground">pts</span>
                </div>
              </div>
              <div>
                <Label>Estimated Time</Label>
                <div className="flex items-center gap-2 h-10">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {Math.floor(totalEstimatedTime / 60)}h {totalEstimatedTime % 60}m
                  </span>
                  <span className="text-xs text-muted-foreground">(auto-calculated)</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Completion Requirements</Label>
              <RadioGroup
                value={completionRequirement}
                onValueChange={(v) => setCompletionRequirement(v as CompletionRequirement)}
                className="mt-2 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all_steps" id="req-all-steps" data-testid="radio-all-steps" />
                  <Label htmlFor="req-all-steps" className="font-normal">Complete all steps</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="quiz" id="req-quiz" data-testid="radio-quiz" />
                  <Label htmlFor="req-quiz" className="font-normal">Pass quiz</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="both" id="req-both" data-testid="radio-both" />
                  <Label htmlFor="req-both" className="font-normal">Both (all steps + pass quiz)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="issue-certificate"
                checked={issueCertificate}
                onCheckedChange={(c) => setIssueCertificate(c as boolean)}
                data-testid="checkbox-issue-certificate"
              />
              <Label htmlFor="issue-certificate">Issue certificate on completion</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Steps</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isEditing || !documentId || docLoading}
                  data-testid="button-ai-suggest-steps"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  AI Suggest Steps
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddStepDialog(true)}
                  disabled={!isEditing || !documentId || docLoading}
                  data-testid="button-add-step"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Save the module first to start adding steps.
              </p>
            ) : docLoading || stepsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading steps...</span>
              </div>
            ) : localSteps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No steps yet. Click "Add Step" to create your first step.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localSteps.map((s) => s.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  {localSteps.map((step) => (
                    <SortableStepCard
                      key={step.id}
                      step={step}
                      isExpanded={expandedSteps.has(step.id)}
                      onToggleExpand={() => toggleStepExpanded(step.id)}
                      onUpdate={debouncedUpdateStep}
                      onDelete={(stepId) => deleteStepMutation.mutate(stepId)}
                      questions={allQuestions[step.id] || []}
                      onAddQuestion={(stepId) => createQuestionMutation.mutate(stepId)}
                      onUpdateQuestion={(questionId, updates) =>
                        updateQuestionMutation.mutate({ questionId, updates })
                      }
                      onDeleteQuestion={(questionId) =>
                        deleteQuestionMutation.mutate(questionId)
                      }
                      availableDocuments={availableDocuments}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddStepDialog} onOpenChange={setShowAddStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Step</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {(Object.entries(STEP_TYPE_INFO) as [StepType, typeof STEP_TYPE_INFO[StepType]][]).map(
              ([type, info]) => {
                const Icon = info.icon;
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => createStepMutation.mutate(type)}
                    disabled={createStepMutation.isPending}
                    data-testid={`button-add-step-${type}`}
                  >
                    <div className={`p-2 rounded-full ${info.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span>{info.label}</span>
                  </Button>
                );
              }
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
