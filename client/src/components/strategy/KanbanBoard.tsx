import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Plus, 
  MessageSquare, 
  ThumbsUp, 
  Clock, 
  User,
  Tag,
  Calendar
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DocumentIndicator } from '@/components/KnowledgeBase/DocumentIndicator';
import { TicketDialog } from './TicketDialog';
import { format } from 'date-fns';

interface KanbanBoardProps {
  onCreateTicket: () => void;
  selectedSprintId?: number | null;
  onTicketClick?: (ticket: any) => void;
}

const statusColumns = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'review', title: 'Review', color: 'bg-yellow-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' }
];

const priorityColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500'
};

export function KanbanBoard({ onCreateTicket, selectedSprintId, onTicketClick }: KanbanBoardProps) {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tickets = [], isLoading: loading } = useQuery({
    queryKey: ['/api/strategy/tickets'],
    queryFn: () => apiRequest('/api/strategy/tickets')
  });

  // Filter tickets by selected sprint
  const filteredTickets = selectedSprintId 
    ? tickets.filter((ticket: any) => ticket.sprintId === selectedSprintId)
    : tickets;

  const updateTicketMutation = useMutation({
    mutationFn: (data: { id: number; updates: any }) =>
      apiRequest('/api/strategy/tickets/' + data.id, {
        method: 'PUT',
        body: data.updates
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tickets'] });
      toast({
        title: "Success",
        description: "Ticket updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = (ticketId: number, newStatus: string) => {
    updateTicketMutation.mutate({
      id: ticketId,
      updates: { status: newStatus }
    });
  };

  const handleTicketClick = (ticket: any) => {
    if (onTicketClick) {
      onTicketClick(ticket);
    } else {
      setSelectedTicket(ticket);
      setShowTicketDialog(true);
    }
  };

  const getTicketsByStatus = (status: string) => {
    if (!filteredTickets || !Array.isArray(filteredTickets)) {
      return [];
    }
    return filteredTickets.filter((ticket: any) => ticket.status === status);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statusColumns.map((column) => (
          <Card key={column.id} className="min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${column.color}`}></div>
                {column.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-muted animate-pulse h-20 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statusColumns.map((column) => {
          const columnTickets = getTicketsByStatus(column.id);
          
          return (
            <Card key={column.id} className="min-h-[500px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${column.color}`}></div>
                    {column.title}
                    <Badge variant="secondary" className="ml-2">
                      {columnTickets.length}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCreateTicket}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTicketClick(ticket)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm leading-tight hover:underline">
                            {ticket.title}
                          </h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {statusColumns.map((status) => (
                                <DropdownMenuItem
                                  key={status.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(ticket.id, status.id);
                                  }}
                                >
                                  Move to {status.title}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {ticket.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-xs ${priorityColors[ticket.priority as keyof typeof priorityColors]} text-white`}
                          >
                            {ticket.priority}
                          </Badge>
                          
                          <DocumentIndicator 
                            entityType="workItem" 
                            entityId={ticket.id} 
                            entityTitle={ticket.title}
                            size="sm"
                            showZero={true}
                          />
                          
                          {ticket.category && (
                            <Badge variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {ticket.category}
                            </Badge>
                          )}
                          
                          {ticket.department && (
                            <Badge variant="outline" className="text-xs">
                              {ticket.department}
                            </Badge>
                          )}
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>0</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              <span>0</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {ticket.assigned_to && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>Assigned</span>
                              </div>
                            )}
                            
                            {ticket.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(ticket.due_date), 'MMM d')}</span>
                              </div>
                            )}
                            
                            {ticket.estimated_hours && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{ticket.estimated_hours}h</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {columnTickets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No tickets in {column.title.toLowerCase()}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCreateTicket}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Ticket
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ticket Detail Dialog */}
      <TicketDialog
        ticket={selectedTicket}
        open={showTicketDialog}
        onOpenChange={setShowTicketDialog}
        onUpdate={(updates) => {
          if (selectedTicket) {
            updateTicketMutation.mutate({
              id: selectedTicket.id,
              updates
            });
          }
        }}
      />
    </div>
  );
}