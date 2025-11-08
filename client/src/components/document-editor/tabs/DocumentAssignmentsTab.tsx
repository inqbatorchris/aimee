import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Users, CalendarDays, UserCheck, AlertCircle, Plus, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DocumentAssignmentsTabProps {
  documentId: number;
  canManageAssignments?: boolean;
}

export function DocumentAssignmentsTab({ documentId, canManageAssignments = false }: DocumentAssignmentsTabProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch document assignments
  const { data: assignments = [], isLoading: assignmentsLoading, refetch } = useQuery({
    queryKey: [`/api/knowledge-base/documents/${documentId}/assignments`],
    enabled: !!documentId
  });

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/core/users'],
    enabled: isAssignDialogOpen && canManageAssignments
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async ({ userId, dueDate }: { userId: number; dueDate?: Date }) => {
      const response = await apiRequest(`/api/knowledge-base/documents/${documentId}/assignments`, {
        method: 'POST',
        body: { userId, dueDate }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document assigned successfully',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/assignments`] });
      setIsAssignDialogOpen(false);
      setSelectedUserId('');
      setSelectedDueDate(undefined);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign document',
        variant: 'destructive',
      });
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await apiRequest(`/api/knowledge-base/documents/${documentId}/assignments/${assignmentId}`, {
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Assignment removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge-base/documents/${documentId}/assignments`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove assignment',
        variant: 'destructive',
      });
    },
  });

  const handleAssign = () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user to assign',
        variant: 'destructive',
      });
      return;
    }

    createAssignmentMutation.mutate({
      userId: parseInt(selectedUserId),
      dueDate: selectedDueDate,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <UserCheck className="h-3 w-3 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-3 w-3 text-blue-600" />;
      case 'assigned':
        return <AlertCircle className="h-3 w-3 text-yellow-600" />;
      default:
        return <AlertCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'assigned':
        return 'Assigned';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50';
      case 'assigned':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (assignmentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('DocumentAssignmentsTab render:', { assignments, assignmentsLoading, canManageAssignments });

  return (
    <div className="space-y-4">
      {canManageAssignments && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignments ({Array.isArray(assignments) ? assignments.length : 0})
          </h3>
          <Button
            size="sm"
            onClick={() => setIsAssignDialogOpen(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Assign Users
          </Button>
        </div>
      )}

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {!Array.isArray(assignments) || assignments.length === 0 ? (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground text-center">
                No users assigned to this document
              </p>
            </Card>
          ) : (
            assignments.map((assignment: any) => (
              <Card key={assignment.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{assignment.user?.fullName || 'Unknown User'}</p>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(assignment.status)}
                        <Badge variant="secondary" className={`text-xs px-1.5 py-0.5 ${getStatusColor(assignment.status)}`}>
                          {getStatusLabel(assignment.status)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{assignment.user?.email}</p>
                    {assignment.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <CalendarDays className="h-3 w-3" />
                        Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  {canManageAssignments && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('Deleting assignment with ID:', assignment.id);
                        console.log('Full assignment object:', assignment);
                        deleteAssignmentMutation.mutate(assignment.id);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Assign User Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] sm:max-w-[425px] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Assign Document to User</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 pb-2" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select User</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(users) && users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date (Optional)</label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDueDate}
                    onSelect={setSelectedDueDate}
                    className="rounded-md border"
                    disabled={(date) => date < new Date()}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end space-x-2 p-4 border-t bg-background">
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={createAssignmentMutation.isPending}>
              {createAssignmentMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}