import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Send, Loader2, Sparkles, AlertCircle, Settings, MessageSquarePlus, Edit2, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { ActionApprovalCard } from './ActionApprovalCard';
import { AIContextCard } from './AIContextCard';
import { useLocation, Link } from 'wouter';
import { useAIPageData } from '@/hooks/useAIPageData';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  functionCall?: any;
  proposedAction?: any;
  createdAt: string;
}

interface ChatSession {
  id: number;
  title: string;
  pageContext: string;
  createdAt: string;
}

export function AIAssistantPanel({ isOpen, onClose }: AIAssistantPanelProps) {
  const [location] = useLocation();
  const { pageContext, pageData } = useAIPageData();
  const [message, setMessage] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUpdatedPageDataRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check OpenAI integration status
  const { data: openaiIntegration } = useQuery({
    queryKey: ['/api/integrations/openai'],
    enabled: isOpen,
  });

  // Fetch AI Assistant configuration for model name
  const { data: aiConfig } = useQuery({
    queryKey: ['/api/ai-chat/config'],
    enabled: isOpen,
  });

  // Load existing sessions when panel opens
  const { data: sessions } = useQuery<ChatSession[]>({
    queryKey: ['/api/ai-chat/sessions'],
    enabled: isOpen && !!openaiIntegration,
  });

  // Load messages for current session
  const { data: sessionMessages } = useQuery<ChatMessage[]>({
    queryKey: [`/api/ai-chat/sessions/${currentSessionId}/messages`],
    enabled: !!currentSessionId,
  });

  // Set most recent session as active when panel opens
  useEffect(() => {
    if (isOpen && sessions && sessions.length > 0 && !currentSessionId) {
      const mostRecentSession = sessions[0];
      setCurrentSessionId(mostRecentSession.id);
    }
  }, [isOpen, sessions, currentSessionId]);

  // Reset ref when session changes to ensure each session gets updated
  useEffect(() => {
    lastUpdatedPageDataRef.current = '';
  }, [currentSessionId]);

  // Immediately clear backend pageData when location changes to prevent stale context
  useEffect(() => {
    const clearStalePageData = async () => {
      if (currentSessionId) {
        try {
          await apiRequest(`/api/ai-chat/sessions/${currentSessionId}`, {
            method: 'PATCH',
            body: {
              pageContext: 'Loading...',
              pageData: { loading: true, path: location },
            },
          });
          lastUpdatedPageDataRef.current = ''; // Reset to allow fresh update
        } catch (error) {
          console.error('Failed to clear stale page data:', error);
        }
      }
    };

    clearStalePageData();
  }, [location, currentSessionId]);

  // Update session with pageData once it's loaded (with per-session deduplication)
  useEffect(() => {
    const updateSessionPageData = async () => {
      // Only update if:
      // 1. We have a current session
      // 2. pageData has content (queries finished)
      // 3. pageData actually changed (prevent redundant PATCHes)
      if (!currentSessionId || !pageData || Object.keys(pageData).length === 0) {
        return;
      }

      const pageDataKey = JSON.stringify({ pageContext, pageData });
      if (lastUpdatedPageDataRef.current === pageDataKey) {
        return; // Already sent this exact data to THIS session
      }

      try {
        await apiRequest(`/api/ai-chat/sessions/${currentSessionId}`, {
          method: 'PATCH',
          body: {
            pageContext,
            pageData,
          },
        });
        lastUpdatedPageDataRef.current = pageDataKey;
      } catch (error) {
        console.error('Failed to update session with page data:', error);
      }
    };

    updateSessionPageData();
  }, [currentSessionId, pageContext, pageData]);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ai-chat/sessions', {
        method: 'POST',
        body: {
          title: 'New Chat',
          pageContext: pageContext,
          pageData: pageData,
        },
      });
      return response as any;
    },
    onSuccess: async (data) => {
      setCurrentSessionId(data.id);
      setMessages([]);
      await queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/sessions'] });
      // Force refetch to ensure the new session appears in the list
      await queryClient.refetchQueries({ queryKey: ['/api/ai-chat/sessions'] });
    },
  });

  const renameSessionMutation = useMutation({
    mutationFn: async ({ sessionId, title }: { sessionId: number; title: string }) => {
      const response = await apiRequest(`/api/ai-chat/sessions/${sessionId}`, {
        method: 'PATCH',
        body: { title },
      });
      return response as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/sessions'] });
      setRenameDialogOpen(false);
      setNewTitle('');
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest(`/api/ai-chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      return response as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/sessions'] });
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
      // If deleted current session, clear it
      if (sessionToDelete === currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    },
  });

  // Get current session for display
  const currentSession = sessions?.find(s => s.id === currentSessionId);

  const autoNameSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest(`/api/ai-chat/sessions/${sessionId}/auto-name`, {
        method: 'POST',
      });
      return response as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/sessions'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, sessionId }: { content: string; sessionId: number }) => {
      const response = await apiRequest(`/api/ai-chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: { content },
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Don't set proposedAction state here - it's already included in session messages
      // This prevents duplicate action cards from rendering
      
      // Invalidate the messages query to refetch from server
      queryClient.invalidateQueries({ 
        queryKey: [`/api/ai-chat/sessions/${variables.sessionId}/messages`] 
      });

      // Auto-name session after 3 messages if still titled "New Chat"
      const messageCount = messages.length + 1; // Current messages + the one just sent
      const session = sessions?.find(s => s.id === variables.sessionId);
      if (messageCount >= 3 && session?.title === 'New Chat') {
        autoNameSessionMutation.mutate(variables.sessionId);
      }
    },
    onError: (error: any) => {
      console.error('Error sending message:', error);
      // Remove the optimistic message on error
      setMessages(prev => prev.slice(0, -1));
    },
  });

  // Update messages when session messages load (but not while mutation is pending)
  useEffect(() => {
    if (sessionMessages && Array.isArray(sessionMessages) && !sendMessageMutation.isPending) {
      // Filter out any undefined/null messages
      setMessages(sessionMessages.filter(msg => msg && msg.role && msg.content !== undefined));
    }
  }, [sessionMessages, sendMessageMutation.isPending]);

  const handleStartChat = async () => {
    if (!currentSessionId) {
      const newSession = await createSessionMutation.mutateAsync();
      return newSession.id;
    }
    return currentSessionId;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;

    const messageContent = message.trim();
    
    // Clear input immediately
    setMessage('');

    // Ensure we have a session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await handleStartChat();
    }

    // Shouldn't happen, but guard against null
    if (!sessionId) {
      console.error('Failed to create or get session ID');
      return;
    }

    // Add optimistic user message to UI immediately
    const optimisticMessage: ChatMessage = {
      id: Date.now(), // Temporary ID
      role: 'user',
      content: messageContent,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Send to API
    sendMessageMutation.mutate({ content: messageContent, sessionId });
  };

  const handleActionApproved = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/ai-chat/sessions/${currentSessionId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/ai-chat/sessions/${currentSessionId}/messages`] });
  };

  const handleActionRejected = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/ai-chat/sessions/${currentSessionId}/messages`] });
  };

  const handleQuickAction = (prompt: string) => {
    setMessage(prompt);
    // Trigger send after a brief delay to allow message state to update
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300"
      data-testid="panel-ai-assistant"
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-background">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="hover:bg-muted justify-start px-2 h-auto py-1 min-w-0 flex-1"
                data-testid="button-session-dropdown"
                style={{ fontSize: 'var(--chat-header-font)' }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium truncate max-w-full" data-testid="text-current-session">
                    {currentSession?.title || 'AI Assistant'}
                  </span>
                </div>
                <ChevronDown className="ml-2 h-3 w-3 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]" style={{ fontSize: '10pt' }}>
              <DropdownMenuLabel style={{ fontSize: '10pt' }}>Recent Chats</DropdownMenuLabel>
              {sessions && sessions.length > 0 ? (
                sessions.slice(0, 10).map(session => (
                  <DropdownMenuItem 
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className={currentSessionId === session.id ? 'bg-accent' : ''}
                    data-testid={`session-item-${session.id}`}
                    style={{ fontSize: '10pt' }}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium truncate">{session.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled style={{ fontSize: '10pt' }}>No chat sessions yet</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={async () => {
                  const newSession = await createSessionMutation.mutateAsync();
                  setCurrentSessionId(newSession.id);
                  setMessages([]);
                }}
                disabled={createSessionMutation.isPending}
                data-testid="button-new-chat"
                style={{ fontSize: '10pt' }}
              >
                {createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Start New Chat
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          {currentSessionId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 hover:bg-muted"
                  data-testid="button-session-actions"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => {
                    const currentSession = sessions?.find(s => s.id === currentSessionId);
                    setNewTitle(currentSession?.title || '');
                    setRenameDialogOpen(true);
                  }}
                  data-testid="button-rename-chat"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename Chat
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setSessionToDelete(currentSessionId);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive"
                  data-testid="button-delete-chat"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 hover:bg-muted"
            data-testid="button-close-ai-assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!openaiIntegration ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                OpenAI API Key Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                To use Aimee, you need to configure your OpenAI API key in the settings.
              </p>
              <Link href="/ai-assistant/settings">
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                  data-testid="button-go-to-settings"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Go to Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : !currentSessionId ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Welcome! I'm Aimee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                I'm your AI assistant for aimee.works Strategy OS. I can help you with:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>Query customer account balances</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>Draft complete objectives with key results and tasks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>Analyze your strategy and provide insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>Help you manage your daily operations</span>
                </li>
              </ul>
              <Button 
                onClick={handleStartChat}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                disabled={createSessionMutation.isPending}
                data-testid="button-start-chat"
              >
                {createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start New Chat'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-3">
              {/* Context Card - shows user's current work */}
              <AIContextCard onQuickAction={handleQuickAction} />
              
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-6">
                  <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary opacity-40" />
                  <p style={{ fontSize: 'var(--chat-font-size)' }} className="mb-3">Ask me anything! I'm here to help.</p>
                  <div className="mt-3 space-y-1.5" style={{ fontSize: '9px' }}>
                    <p className="font-medium">Try asking:</p>
                    <p className="italic opacity-75">"What should I focus on today?"</p>
                    <p className="italic opacity-75">"Review my active objectives"</p>
                    <p className="italic opacity-75">"Draft an objective to reach 10,000 5-star reviews"</p>
                  </div>
                </div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${msg.role}-${msg.id}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-[var(--chat-bubble-radius)]'
                          : 'bg-card border rounded-[var(--chat-bubble-radius)]'
                      }`}
                      style={{ fontSize: 'var(--chat-font-size)' }}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.functionCall && (
                        <div className="mt-1.5 opacity-75" style={{ fontSize: '9px' }}>
                          ⚡ Proposing action: {msg.functionCall.name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Show ActionApprovalCard for messages that have a proposed action */}
                  {msg.proposedAction && (
                    <ActionApprovalCard
                      action={msg.proposedAction}
                      onApproved={handleActionApproved}
                      onRejected={handleActionRejected}
                    />
                  )}
                </div>
              ))}

              {sendMessageMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-[var(--chat-bubble-radius)] px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span style={{ fontSize: 'var(--chat-font-size)' }}>Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t px-3 py-2.5">
            {sendMessageMutation.isError && (
              <Alert variant="destructive" className="mb-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertDescription style={{ fontSize: 'var(--chat-font-size)' }}>
                  {(sendMessageMutation.error as any)?.response?.data?.details || 
                   (sendMessageMutation.error as any)?.message || 
                   'Failed to send message. Please try again.'}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={sendMessageMutation.isPending}
                className="flex-1 h-8"
                style={{ fontSize: 'var(--chat-input-font)' }}
                data-testid="input-ai-message"
              />
              <Button
                type="submit"
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="h-8 w-8 p-0"
                data-testid="button-send-message"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </form>

            <p className="text-muted-foreground mt-1.5 text-center" style={{ fontSize: '9px' }}>
              Using {(aiConfig as any)?.defaultModel || 'GPT-4o Mini'} • Context-aware • Page: {location}
            </p>
          </div>
        </>
      )}
      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent data-testid="dialog-rename-chat">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Give this conversation a meaningful name
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter chat name..."
            data-testid="input-new-title"
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRenameDialogOpen(false)}
              data-testid="button-cancel-rename"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (currentSessionId && newTitle.trim()) {
                  renameSessionMutation.mutate({ 
                    sessionId: currentSessionId, 
                    title: newTitle.trim() 
                  });
                }
              }}
              disabled={!newTitle.trim() || renameSessionMutation.isPending}
              data-testid="button-save-rename"
            >
              {renameSessionMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-chat">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sessionToDelete) {
                  deleteSessionMutation.mutate(sessionToDelete);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
