import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  X,
  Users,
  ListTodo,
  Plus,
  Timer,
  Mic,
  MicOff,
  ChevronUp,
  ChevronDown,
  GripHorizontal
} from 'lucide-react';

// Format date in organization timezone
function formatInOrgTz(dateISO: string | Date, fmt: Intl.DateTimeFormatOptions = {}): string {
  try {
    const date = typeof dateISO === 'string' ? new Date(dateISO) : dateISO;
    if (!date || isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/London', // Default org timezone - should be from org settings
      ...fmt
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error, dateISO);
    return String(dateISO);
  }
}

// Custom media query hook
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

interface MeetingRunnerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: any;
  workItems?: any[];
  teamMembers?: any[];
  onMeetingUpdate?: () => void;
}

export function MeetingRunnerSheet({
  isOpen,
  onClose,
  meeting,
  workItems = [],
  teamMembers = [],
  onMeetingUpdate
}: MeetingRunnerSheetProps) {
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTab, setActiveTab] = useState('now');
  const [notes, setNotes] = useState(meeting?.notes || '');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [meetingStatus, setMeetingStatus] = useState(meeting?.status);
  const [attendees, setAttendees] = useState<Record<number, 'present' | 'absent' | null>>({});
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  const [newAgendaItem, setNewAgendaItem] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  
  const notesTimeoutRef = useRef<NodeJS.Timeout>();
  const timerIntervalRef = useRef<NodeJS.Timeout>();

  // Timer effect
  useEffect(() => {
    if (meetingStatus === 'In Progress' && meeting?.actualStartTime) {
      const startTime = new Date(meeting.actualStartTime).getTime();
      
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };
      
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [meetingStatus, meeting?.actualStartTime]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start meeting mutation
  const startMeetingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/strategy/check-in-meetings/${meeting.id}/start`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      setMeetingStatus('In Progress');
      toast({ description: 'Meeting started' });
      if (onMeetingUpdate) onMeetingUpdate();
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to start meeting' });
    },
  });

  // Complete meeting mutation
  const completeMeetingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/strategy/check-in-meetings/${meeting.id}/complete`, {
        method: 'POST',
        body: { notes },
      });
    },
    onSuccess: () => {
      setMeetingStatus('Completed');
      toast({ description: 'Meeting completed' });
      if (onMeetingUpdate) onMeetingUpdate();
      setTimeout(onClose, 1000);
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to complete meeting' });
    },
  });

  // Skip meeting mutation
  const skipMeetingMutation = useMutation({
    mutationFn: async (reason: string) => {
      return apiRequest(`/api/strategy/check-in-meetings/${meeting.id}/status`, {
        method: 'POST',
        body: { status: 'Skipped', reason },
      });
    },
    onSuccess: () => {
      setMeetingStatus('Skipped');
      toast({ description: 'Meeting skipped' });
      if (onMeetingUpdate) onMeetingUpdate();
      setTimeout(onClose, 1000);
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to skip meeting' });
    },
  });

  // Auto-save notes with debounce
  const saveNotes = useMutation({
    mutationFn: async (updatedNotes: string) => {
      return apiRequest(`/api/strategy/check-in-meetings/${meeting.id}/notes`, {
        method: 'PATCH',
        body: { notes: updatedNotes, attendees },
      });
    },
  });

  const handleNotesChange = (value: string) => {
    setNotes(value);
    
    // Clear existing timeout
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    notesTimeoutRef.current = setTimeout(() => {
      saveNotes.mutate(value);
    }, 2000); // Auto-save after 2 seconds of inactivity
  };

  const handleAddQuickNote = () => {
    if (quickNote.trim()) {
      const timestamp = format(new Date(), 'HH:mm');
      const newNote = `[${timestamp}] ${quickNote}\n`;
      handleNotesChange(notes + newNote);
      setQuickNote('');
    }
  };

  const handleAddAgendaItem = () => {
    if (newAgendaItem.trim()) {
      setAgendaItems([...agendaItems, { 
        id: Date.now(), 
        title: newAgendaItem, 
        completed: false 
      }]);
      setNewAgendaItem('');
    }
  };

  const handleSkipMeeting = () => {
    const reason = window.prompt('Please provide a reason for skipping this meeting:');
    if (reason) {
      skipMeetingMutation.mutate(reason);
    }
  };

  // Mobile-specific minimized view
  if (isMobile && isMinimized) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
        <div 
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="font-medium text-sm">{meeting.title}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {formatElapsedTime(elapsedTime)}
            </Badge>
          </div>
          <ChevronUp className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'h-[85vh] rounded-t-xl' : 'w-[640px] sm:max-w-[640px]'}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div className="flex justify-center pb-2">
            <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
          </div>
        )}

        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-lg">{meeting.title}</SheetTitle>
              <SheetDescription>
                {formatInOrgTz(meeting.scheduledDate, { 
                  month: 'long', 
                  day: 'numeric', 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </SheetDescription>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Status and Timer */}
          <div className="flex items-center gap-3 mt-3">
            <Badge 
              variant={meetingStatus === 'In Progress' ? 'default' : 'outline'}
              className="flex items-center gap-1"
            >
              {meetingStatus === 'In Progress' && (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
              {meetingStatus}
            </Badge>
            {meetingStatus === 'In Progress' && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Timer className="h-3 w-3" />
                {formatElapsedTime(elapsedTime)}
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Meeting Controls */}
        {meetingStatus === 'Planning' && (
          <div className="flex gap-2 pb-4">
            <Button 
              onClick={() => startMeetingMutation.mutate()}
              className="flex-1"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Meeting
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSkipMeeting}
              size="lg"
            >
              Skip
            </Button>
          </div>
        )}

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="now" className="text-xs sm:text-sm">
              <Clock className="h-3 w-3 mr-1 sm:mr-2" />
              Now
            </TabsTrigger>
            <TabsTrigger value="agenda" className="text-xs sm:text-sm">
              <ListTodo className="h-3 w-3 mr-1 sm:mr-2" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="attendees" className="text-xs sm:text-sm">
              <Users className="h-3 w-3 mr-1 sm:mr-2" />
              People
            </TabsTrigger>
          </TabsList>

          <ScrollArea className={isMobile ? "h-[calc(85vh-280px)]" : "h-[calc(100vh-320px)]"}>
            {/* Now Tab */}
            <TabsContent value="now" className="space-y-4 mt-4">
              {/* Quick Note Entry */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Note</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a quick note..."
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddQuickNote()}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddQuickNote}
                      disabled={!quickNote.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Meeting Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Meeting Notes</CardTitle>
                    {saveNotes.isPending && (
                      <span className="text-xs text-muted-foreground">Saving...</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Type your meeting notes here..."
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                </CardContent>
              </Card>

              {/* Work Items */}
              {workItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Work Items ({workItems.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{item.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Agenda Tab */}
            <TabsContent value="agenda" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Agenda Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add agenda item..."
                        value={newAgendaItem}
                        onChange={(e) => setNewAgendaItem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddAgendaItem()}
                      />
                      <Button 
                        size="sm" 
                        onClick={handleAddAgendaItem}
                        disabled={!newAgendaItem.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {agendaItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No agenda items yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {agendaItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={(checked) => {
                                setAgendaItems(agendaItems.map(a => 
                                  a.id === item.id ? { ...a, completed: checked } : a
                                ));
                              }}
                            />
                            <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {item.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendees Tab */}
            <TabsContent value="attendees" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No team members found
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {teamMembers.map((member) => (
                        <div key={member.userId} className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/50 rounded">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{member.fullName}</div>
                            <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                          </div>
                          <RadioGroup 
                            value={attendees[member.userId] || ''}
                            onValueChange={(value: 'present' | 'absent') => {
                              const newAttendees = { ...attendees, [member.userId]: value };
                              setAttendees(newAttendees);
                              // Auto-save attendance
                              apiRequest(`/api/strategy/check-in-meetings/${meeting.id}/notes`, {
                                method: 'PATCH',
                                body: { notes, attendees: newAttendees },
                              });
                            }}
                            className="flex gap-3"
                          >
                            <div className="flex items-center">
                              <RadioGroupItem value="present" id={`present-${member.userId}`} className="h-3 w-3" />
                              <label htmlFor={`present-${member.userId}`} className="text-xs ml-1 cursor-pointer">Present</label>
                            </div>
                            <div className="flex items-center">
                              <RadioGroupItem value="absent" id={`absent-${member.userId}`} className="h-3 w-3" />
                              <label htmlFor={`absent-${member.userId}`} className="text-xs ml-1 cursor-pointer">Absent</label>
                            </div>
                          </RadioGroup>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Fixed Bottom Actions */}
        {meetingStatus === 'In Progress' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            <div className="flex gap-2">
              <Button 
                size="lg" 
                className="flex-1"
                onClick={() => completeMeetingMutation.mutate()}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Meeting
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={handleSkipMeeting}
              >
                Skip
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}