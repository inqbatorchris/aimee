import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit3, Save, X, Calendar, User, Target, TrendingUp, UserCheck, Link, Repeat, CheckSquare, Bug, ArrowUp, Paperclip, Upload, Trash2, Clock } from 'lucide-react';
import { UpdateProgressDialog } from '../UpdateProgressDialog';

interface TaskDetailsTabProps {
  task: any;
  canEdit: boolean;
  isCreating?: boolean;
  onClose?: () => void;
  onViewKeyResult?: (keyResultId: number) => void;
}

export function TaskDetailsTab({ task, canEdit, isCreating = false, onClose, onViewKeyResult }: TaskDetailsTabProps) {
  const [isEditing, setIsEditing] = useState(isCreating);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    taskType: task.taskType || 'project',
    lifecycleStage: task.lifecycleStage,
    assignedTo: task.assignedTo || null,
    kpiLabel: task.kpiLabel || '',
    kpiCurrentValue: task.kpiCurrentValue || 0,
    kpiTargetValue: task.kpiTargetValue || 0,
    kpiUnit: task.kpiUnit || '',
    frequency: task.frequency || 'one-time',
    frequencyTarget: task.frequencyTarget || 1,
    department: task.department || '',
    estimatedHours: task.estimatedHours || '',
    startDate: task.startDate || '',
    targetCompletion: task.targetCompletion || ''
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('/api/users');
      return await response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        labels: [], // Default empty labels
        createdBy: task.createdBy,
        keyResultId: task.keyResultId || null, // Include keyResultId if present
      };
      
      // Use appropriate endpoint based on whether this is for a key result
      const endpoint = task.keyResultId 
        ? `/api/strategy/key-results/${task.keyResultId}/tasks`
        : '/api/strategy/tasks';
        
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: payload
      });
      
      const createdTask = await response.json();
      
      // Upload files if any were selected
      if (selectedFiles.length > 0 && createdTask.id) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          
          await fetch(`/api/strategy/tasks/${createdTask.id}/attachments`, {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
        }
      }
      
      return createdTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work/stats'] });
      // If created from a key result, invalidate that key result's tasks
      if (task.keyResultId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/strategy/key-results', task.keyResultId, 'tasks'] 
        });
      }
      toast({
        title: 'Work item created',
        description: selectedFiles.length > 0 
          ? `Work item created with ${selectedFiles.length} attachment${selectedFiles.length > 1 ? 's' : ''}.`
          : 'The work item has been created successfully.'
      });
      onClose?.();
    },
    onError: () => {
      toast({
        title: 'Creation failed',
        description: 'Failed to create work item.',
        variant: 'destructive'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest(`/api/strategy/tasks/${task.id}`, {
        method: 'PUT',
        body: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/work/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tasks', task.id] });
      setIsEditing(false);
      toast({
        title: 'Task updated',
        description: 'The task has been updated successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'Failed to update task.',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    const saveData = {
      ...editForm,
      estimatedHours: editForm.estimatedHours === '' ? null : parseFloat(editForm.estimatedHours),
      startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : null,
      targetCompletion: editForm.targetCompletion ? new Date(editForm.targetCompletion).toISOString() : null,
    };
    
    if (isCreating) {
      createMutation.mutate(saveData);
    } else {
      updateMutation.mutate(saveData);
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      onClose?.();
    } else {
      setEditForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        taskType: task.taskType || 'project',
        lifecycleStage: task.lifecycleStage,
        assignedTo: task.assignedTo || null,
        kpiLabel: task.kpiLabel || '',
        kpiCurrentValue: task.kpiCurrentValue || 0,
        kpiTargetValue: task.kpiTargetValue || 0,
        kpiUnit: task.kpiUnit || '',
        frequency: task.frequency || 'one-time',
        frequencyTarget: task.frequencyTarget || 1,
        department: task.department || '',
        estimatedHours: task.estimatedHours || '',
        startDate: task.startDate || '',
        targetCompletion: task.targetCompletion || ''
      });
      setIsEditing(false);
    }
  };

  const getProgressPercentage = () => {
    if (!task.kpiTargetValue || task.kpiTargetValue === 0) return 0;
    return Math.min(100, Math.max(0, (task.kpiCurrentValue / task.kpiTargetValue) * 100));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  return (
    <div className="space-y-4">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-sm">
          {isCreating ? 'New Work Item' : 'Task Details'}
        </h3>
        {canEdit && !isEditing && !isCreating && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="h-7 px-2 text-xs"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
        {(isEditing || isCreating) && (
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="h-7 px-2 text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              {isCreating ? 'Create' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Title</label>
          {isEditing ? (
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="text-xs"
            />
          ) : (
            <p className="text-xs text-gray-900">{task.title}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
          {isEditing ? (
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="text-xs min-h-[60px]"
              placeholder="Add task description..."
            />
          ) : (
            <p className="text-xs text-gray-600 whitespace-pre-wrap">
              {task.description || 'No description provided'}
            </p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
          {isEditing ? (
            <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className={`${getStatusColor(task.status)} text-xs`}>
              {task.status.replace('_', ' ')}
            </Badge>
          )}
        </div>

        {/* Lifecycle Stage */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Lifecycle Stage</label>
          {isEditing ? (
            <Select value={editForm.lifecycleStage} onValueChange={(value) => setEditForm({ ...editForm, lifecycleStage: value })}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="text-xs">
              {task.lifecycleStage}
            </Badge>
          )}
        </div>

        {/* Task Type */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Task Type</label>
          {isEditing || isCreating ? (
            <Select value={editForm.taskType} onValueChange={(value) => setEditForm({ ...editForm, taskType: value })}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="habit">Habit</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              {task.taskType === 'habit' ? (
                <>
                  <Repeat className="h-3 w-3 text-blue-600" />
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                    Habit
                  </Badge>
                </>
              ) : task.taskType === 'feature' ? (
                <>
                  <TrendingUp className="h-3 w-3 text-purple-600" />
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                    Feature
                  </Badge>
                </>
              ) : task.taskType === 'bug' ? (
                <>
                  <Bug className="h-3 w-3 text-red-600" />
                  <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                    Bug
                  </Badge>
                </>
              ) : (
                <>
                  <CheckSquare className="h-3 w-3 text-green-600" />
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    Project
                  </Badge>
                </>
              )}
              {task.taskType === 'habit' && task.frequency && (
                <span className="text-xs text-muted-foreground">
                  ({task.frequency}, {task.frequencyTarget}x)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Frequency (for habits) */}
        {(editForm.taskType === 'habit' && (isEditing || isCreating)) && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Frequency</label>
              <Select value={editForm.frequency} onValueChange={(value) => setEditForm({ ...editForm, frequency: value })}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Target</label>
              <Input
                type="number"
                value={editForm.frequencyTarget}
                onChange={(e) => setEditForm({ ...editForm, frequencyTarget: parseInt(e.target.value) || 1 })}
                className="text-xs"
                min={1}
              />
            </div>
          </>
        )}

        {/* Department */}
        {(isEditing || isCreating) && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Department</label>
            <Select 
              value={editForm.department || "none"} 
              onValueChange={(value) => setEditForm({ 
                ...editForm, 
                department: value === "none" ? null : value 
              })}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Department</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Support">Support</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Estimated Hours */}
        {(isEditing || isCreating) && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Estimated Hours</label>
            <Input
              type="text"
              value={editForm.estimatedHours}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string, or valid number
                if (value === '' || !isNaN(Number(value))) {
                  setEditForm({ ...editForm, estimatedHours: value });
                }
              }}
              className="text-xs"
              placeholder="0"
            />
          </div>
        )}

        {/* Start Date */}
        {(isEditing || isCreating) && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Start Date</label>
            <Input
              type="date"
              value={editForm.startDate ? new Date(editForm.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
              className="text-xs"
            />
          </div>
        )}

        {/* Target Completion */}
        {(isEditing || isCreating) && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Target Completion</label>
            <Input
              type="date"
              value={editForm.targetCompletion ? new Date(editForm.targetCompletion).toISOString().split('T')[0] : ''}
              onChange={(e) => setEditForm({ ...editForm, targetCompletion: e.target.value })}
              className="text-xs"
            />
          </div>
        )}

        {/* Assigned User (in edit/create mode) */}
        {(isEditing || isCreating) && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Assigned To</label>
            <Select 
              value={editForm.assignedTo?.toString() || "unassigned"} 
              onValueChange={(value) => setEditForm({ 
                ...editForm, 
                assignedTo: value === "unassigned" ? null : parseInt(value) 
              })}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Key Result */}
        {task.keyResultId && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Key Result</label>
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-8 px-3 text-xs font-normal touch-manipulation"
              style={{ touchAction: 'manipulation' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('View Key Result clicked:', {
                  onViewKeyResult: !!onViewKeyResult,
                  keyResultId: task.keyResultId,
                  keyResultIdType: typeof task.keyResultId
                });
                
                if (onViewKeyResult && task.keyResultId) {
                  const keyResultIdNum = typeof task.keyResultId === 'string' 
                    ? parseInt(task.keyResultId) 
                    : task.keyResultId;
                  
                  console.log('Calling onViewKeyResult with:', keyResultIdNum);
                  
                  // Close the current panel first
                  if (onClose) {
                    onClose();
                  }
                  
                  // Open the key result detail panel with a small delay to ensure proper cleanup
                  setTimeout(() => {
                    onViewKeyResult(keyResultIdNum);
                  }, 150);
                }
              }}
            >
              <Link className="h-3 w-3 mr-1" />
              View Key Result
            </Button>
          </div>
        )}

        {/* Assigned Owner (view mode) */}
        {!isEditing && !isCreating && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Assigned Owner
            </label>
            <div className="flex items-center gap-2">
              {task.assignedUser ? (
                <Badge variant="secondary" className="text-xs">
                  {task.assignedUser.fullName}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI Progress Tracking */}
      {(task.kpiLabel || isEditing) && (
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium text-sm">Progress Tracking</span>
            </div>
            {!isEditing && task.kpiLabel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowProgressDialog(true)}
                className="h-7 px-2 text-xs"
              >
                <ArrowUp className="h-3 w-3 mr-1" />
                Update Progress
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">KPI Label</label>
              {isEditing ? (
                <Input
                  value={editForm.kpiLabel}
                  onChange={(e) => setEditForm({ ...editForm, kpiLabel: e.target.value })}
                  className="text-xs"
                  placeholder="e.g., Customer satisfaction, Sales targets"
                />
              ) : (
                <p className="text-xs text-gray-900">{task.kpiLabel}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Current</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editForm.kpiCurrentValue}
                    onChange={(e) => setEditForm({ ...editForm, kpiCurrentValue: parseFloat(e.target.value) || 0 })}
                    className="text-xs h-8"
                  />
                ) : (
                  <p className="text-xs text-gray-900">{task.kpiCurrentValue}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Target</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editForm.kpiTargetValue}
                    onChange={(e) => setEditForm({ ...editForm, kpiTargetValue: parseFloat(e.target.value) || 0 })}
                    className="text-xs h-8"
                  />
                ) : (
                  <p className="text-xs text-gray-900">{task.kpiTargetValue}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Unit</label>
                {isEditing ? (
                  <Input
                    value={editForm.kpiUnit}
                    onChange={(e) => setEditForm({ ...editForm, kpiUnit: e.target.value })}
                    className="text-xs h-8"
                    placeholder="%"
                  />
                ) : (
                  <p className="text-xs text-gray-900">{task.kpiUnit}</p>
                )}
              </div>
            </div>

            {!isEditing && task.kpiTargetValue > 0 && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-700">Progress</span>
                  <span className="text-xs text-gray-900">
                    {getProgressPercentage().toFixed(1)}%
                  </span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Attachments (for creation only) */}
      {isCreating && (
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Paperclip className="h-4 w-4" />
            <span className="font-medium text-sm">Attachments</span>
          </div>
          
          <div className="space-y-2">
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setSelectedFiles(files);
              }}
              className="text-xs"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
            />
            
            {selectedFiles.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected:
                </p>
                <div className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded">
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t pt-3 text-xs text-gray-500 space-y-1">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
        </div>
        {task.startDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>Start Date: {new Date(task.startDate).toLocaleDateString()}</span>
          </div>
        )}
        {task.targetCompletion && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>Target Date: {new Date(task.targetCompletion).toLocaleDateString()}</span>
          </div>
        )}
        {task.estimatedHours && (
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Estimated: {task.estimatedHours} hours</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <User className="h-3 w-3" />
          <span>Assigned: {task.assignedUser?.fullName || 'Unassigned'}</span>
        </div>
        {task.keyResultId && (
          <div className="flex items-center gap-2">
            <Target className="h-3 w-3" />
            <span>Key Result ID: {task.keyResultId}</span>
          </div>
        )}
      </div>

      {/* Update Progress Dialog */}
      <UpdateProgressDialog
        task={task}
        open={showProgressDialog}
        onClose={() => setShowProgressDialog(false)}
      />
    </div>
  );
}