import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send } from 'lucide-react';

interface TaskCommentsTabProps {
  taskId: number;
  canComment: boolean;
}

export function TaskCommentsTab({ taskId, canComment }: TaskCommentsTabProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['/api/strategy/tasks', taskId, 'comments'],
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/tasks/${taskId}/comments`);
      return await response.json();
    },
    enabled: !!taskId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/strategy/tasks/${taskId}/comments`, {
        method: 'POST',
        body: { content }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tasks', taskId, 'comments'] });
      setNewComment('');
      toast({
        title: 'Comment added',
        description: 'Your comment has been added successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add comment.',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-20 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4" />
        <h3 className="font-medium text-sm">Comments ({comments.length})</h3>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-xs">
                  {comment.user?.fullName || 'Unknown User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      {canComment && (
        <form onSubmit={handleSubmit} className="space-y-2 border-t pt-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[60px] text-xs"
            disabled={addCommentMutation.isPending}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="h-7 px-3 text-xs"
            >
              <Send className="h-3 w-3 mr-1" />
              {addCommentMutation.isPending ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}