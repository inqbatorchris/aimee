import { useState } from 'react';
import { TrendingUp, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface KeyResultActionsProps {
  keyResult: KeyResult;
  objectiveId: number;
  onDelete: () => void;
  canEdit: boolean;
}

export default function KeyResultActions({ keyResult, objectiveId, onDelete, canEdit }: KeyResultActionsProps) {
  const [quickUpdateOpen, setQuickUpdateOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(keyResult.currentValue || '0');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update key result progress mutation
  const updateKeyResultMutation = useMutation({
    mutationFn: (data: { currentValue: string }) =>
      apiRequest(`/api/strategy/key-results/${keyResult.id}`, {
        method: 'PUT',
        body: {
          ...keyResult,
          currentValue: data.currentValue,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/strategy/objectives/${objectiveId}/key-results`] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/objectives'] });
      toast({
        title: "Success",
        description: "Key result progress updated successfully",
      });
      setQuickUpdateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update key result progress",
        variant: "destructive",
      });
    },
  });

  const handleQuickUpdate = () => {
    updateKeyResultMutation.mutate({ currentValue });
  };

  const handleOpenQuickUpdate = () => {
    setCurrentValue(keyResult.currentValue || '0');
    setQuickUpdateOpen(true);
  };

  if (!canEdit) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleOpenQuickUpdate}>
            <TrendingUp className="h-3 w-3 mr-2" />
            Update Progress
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="h-3 w-3 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Update Dialog */}
      <Dialog open={quickUpdateOpen} onOpenChange={setQuickUpdateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>
              Update the current progress for "{keyResult.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current" className="text-right">
                Current
              </Label>
              <Input
                id="current"
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="col-span-3"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm text-gray-600">
                Target
              </Label>
              <div className="col-span-3 text-sm font-medium">
                {keyResult.targetValue || '0'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickUpdateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleQuickUpdate}
              disabled={updateKeyResultMutation.isPending}
            >
              {updateKeyResultMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}