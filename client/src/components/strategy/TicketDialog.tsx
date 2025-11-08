import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ThumbsUp, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User,
  Send,
  Edit,
  Vote,
  Tag
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const commentSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
  commentType: z.enum(['general', 'question', 'feedback']),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface TicketDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (updates: any) => void;
}

const priorityColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500'
};

export function TicketDialog({ ticket, open, onOpenChange, onUpdate }: TicketDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      comment: '',
      commentType: 'general',
    },
  });

  // Fetch comments for this ticket
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['/api/strategy/tickets', ticket?.id, 'comments'],
    enabled: !!ticket?.id,
  });

  // Fetch votes for this ticket
  const { data: votes = { count: 0, userVotes: [] }, isLoading: votesLoading } = useQuery({
    queryKey: ['/api/strategy/tickets', ticket?.id, 'votes'],
    enabled: !!ticket?.id,
  });

  // Ensure votes has the expected structure
  const safeVotes = votes || { count: 0, userVotes: [] };
  const userVotes = safeVotes.userVotes || [];

  const addCommentMutation = useMutation({
    mutationFn: (data: CommentFormData) =>
      apiRequest(`/api/strategy/tickets/${ticket.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          userId: user?.id,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tickets', ticket.id, 'comments'] });
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      });
    }
  });

  const toggleVoteMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/strategy/tickets/${ticket.id}/vote`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tickets', ticket.id, 'votes'] });
      toast({
        title: "Vote Updated",
        description: hasUserVoted ? "You removed your vote" : "You voted for this ticket",
        duration: 2000
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vote",
        variant: "destructive"
      });
    }
  });

  const handleSubmitComment = (data: CommentFormData) => {
    addCommentMutation.mutate(data);
  };

  const handleVote = () => {
    toggleVoteMutation.mutate();
  };

  const hasUserVoted = userVotes.includes(user?.id);

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{ticket.title}</span>
            <Badge
              variant="outline"
              className={`${priorityColors[ticket.priority as keyof typeof priorityColors]} text-white`}
            >
              {ticket.priority}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {ticket.description || 'No description provided'}
                    </p>
                  </CardContent>
                </Card>

                {ticket.tags && ticket.tags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {ticket.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant="outline">{ticket.status}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Priority</span>
                        <Badge
                          variant="outline"
                          className={`${priorityColors[ticket.priority as keyof typeof priorityColors]} text-white`}
                        >
                          {ticket.priority}
                        </Badge>
                      </div>
                      
                      {ticket.category && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Category</span>
                          <Badge variant="outline">{ticket.category}</Badge>
                        </div>
                      )}
                      
                      {ticket.department && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Department</span>
                          <Badge variant="outline">{ticket.department}</Badge>
                        </div>
                      )}
                      
                      {ticket.dueDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Due Date</span>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(ticket.dueDate), 'MMM d, yyyy')}
                          </div>
                        </div>
                      )}
                      
                      {ticket.estimatedHours && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Estimated</span>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {ticket.estimatedHours}h
                          </div>
                        </div>
                      )}
                      
                      {ticket.assignedTo && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Assigned</span>
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3" />
                            Assigned
                          </div>
                        </div>
                      )}
                      
                      {ticket.sprintId && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Sprint</span>
                          <Badge variant="secondary" className="text-xs">
                            Sprint #{ticket.sprintId}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <Button
                        variant={hasUserVoted ? "default" : "outline"}
                        size="sm"
                        onClick={handleVote}
                        disabled={toggleVoteMutation.isPending}
                        className={`gap-2 ${hasUserVoted ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      >
                        <ThumbsUp className={`h-4 w-4 ${hasUserVoted ? 'text-white' : ''}`} />
                        {toggleVoteMutation.isPending ? 'Loading...' : hasUserVoted ? 'Voted' : 'Vote'} ({votes.count})
                      </Button>
                      
                      {onUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement edit functionality
                            console.log('Edit ticket:', ticket.id);
                          }}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Comment</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmitComment)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comment</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add your comment..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <FormField
                        control={form.control}
                        name="commentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={field.value === 'general' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => field.onChange('general')}
                              >
                                General
                              </Button>
                              <Button
                                type="button"
                                variant={field.value === 'question' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => field.onChange('question')}
                              >
                                Question
                              </Button>
                              <Button
                                type="button"
                                variant={field.value === 'feedback' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => field.onChange('feedback')}
                              >
                                Feedback
                              </Button>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button type="submit" disabled={addCommentMutation.isPending}>
                        <Send className="h-4 w-4 mr-2" />
                        {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {commentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="bg-muted animate-pulse h-4 rounded mb-2"></div>
                        <div className="bg-muted animate-pulse h-16 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center text-muted-foreground">
                    No comments yet. Be the first to comment!
                  </CardContent>
                </Card>
              ) : (
                comments.map((comment: any) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium text-sm">User {comment.userId}</span>
                          <Badge variant="outline" className="text-xs">
                            {comment.commentType}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Ticket created</span>
                    <span className="text-muted-foreground">
                      {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  
                  {ticket.updatedAt !== ticket.createdAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Last updated</span>
                      <span className="text-muted-foreground">
                        {format(new Date(ticket.updatedAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}