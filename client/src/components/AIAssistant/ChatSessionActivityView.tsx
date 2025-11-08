import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Bot,
  User,
  Zap,
  Clock,
  Hash,
  Coins,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ChatSessionActivityView, ChatConversationTurn } from '@shared/schema';

interface ChatSessionActivityProps {
  sessions: ChatSessionActivityView[];
  loading?: boolean;
}

export function ChatSessionActivityView({ sessions, loading }: ChatSessionActivityProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  const toggleSession = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const formatDuration = (start: Date, end: Date) => {
    const minutes = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No chat sessions found</p>
        <p className="text-xs mt-1">Start a conversation with the AI Assistant to see activity here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const isExpanded = expandedSessions.has(session.sessionId);
        
        return (
          <Card key={session.sessionId} className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSession(session.sessionId)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <CardTitle className="text-sm font-medium">
                      {session.sessionTitle}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      Session #{session.sessionId}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {session.userName || 'Unknown User'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {session.messageCount} messages
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {session.totalTokensUsed.toLocaleString()} tokens
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {formatCost(session.estimatedCost)}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <Separator className="mb-4" />
                
                <div className="space-y-4">
                  {session.turns.map((turn, index) => (
                    <ConversationTurn 
                      key={`${session.sessionId}-${turn.turnIndex}`} 
                      turn={turn}
                      isLast={index === session.turns.length - 1}
                    />
                  ))}
                </div>

                {session.turns.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No messages in this session yet
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ConversationTurn({ turn, isLast }: { turn: ChatConversationTurn; isLast: boolean }) {
  const [showFullContent, setShowFullContent] = useState(false);
  
  const truncateContent = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const shouldTruncate = turn.userMessage.length > 200 || turn.assistantMessage.length > 200;
  const displayUserMessage = showFullContent ? turn.userMessage : truncateContent(turn.userMessage);
  const displayAssistantMessage = showFullContent ? turn.assistantMessage : truncateContent(turn.assistantMessage);

  return (
    <div className={`space-y-3 ${!isLast ? 'pb-3 border-b' : ''}`}>
      {/* User Message */}
      <div className="flex gap-2">
        <div className="flex-shrink-0 mt-1">
          <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">User</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(turn.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{displayUserMessage}</p>
        </div>
      </div>

      {/* Assistant Response */}
      <div className="flex gap-2">
        <div className="flex-shrink-0 mt-1">
          <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <Bot className="h-4 w-4 text-purple-600 dark:text-purple-300" />
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Assistant</span>
            {turn.modelUsed && (
              <Badge variant="outline" className="text-xs h-5">
                {turn.modelUsed}
              </Badge>
            )}
            {turn.tokensUsed && (
              <span className="text-xs text-muted-foreground">
                {turn.tokensUsed} tokens
              </span>
            )}
            {turn.executionTime && (
              <span className="text-xs text-muted-foreground">
                {(turn.executionTime / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{displayAssistantMessage}</p>
          
          {/* Function Calls */}
          {turn.functionsCalled && turn.functionsCalled.length > 0 && (
            <div className="mt-2 space-y-1">
              {turn.functionsCalled.map((func, idx) => (
                <div 
                  key={idx} 
                  className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs"
                >
                  <Zap className="h-3 w-3" />
                  <span className="font-medium">{func.name}</span>
                  {func.approved !== undefined && (
                    <Badge variant={func.approved ? "secondary" : "destructive"} className="text-xs h-4 px-1">
                      {func.approved ? "Approved" : "Rejected"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Show More/Less Button */}
      {shouldTruncate && (
        <div className="pl-9">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowFullContent(!showFullContent)}
          >
            {showFullContent ? 'Show Less' : 'Show More'}
          </Button>
        </div>
      )}
    </div>
  );
}