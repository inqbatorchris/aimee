import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Flame,
  CheckCircle2,
  Circle,
  TrendingUp,
  MessageSquare,
  ChevronDown
} from 'lucide-react';

interface HabitCompletion {
  id: number;
  taskId: number;
  userId: number;
  completionDate: string;
  notes?: string;
  effortRating?: number;
}

interface HabitStreak {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  totalCompletions: number;
}

interface HabitTrackerProps {
  taskId: number;
  taskTitle: string;
  frequency: string;
  kpiLabel?: string;
  kpiTargetValue?: number;
  kpiCurrentValue?: number;
  kpiUnit?: string;
}

export function HabitTracker({ taskId, taskTitle, frequency, kpiLabel, kpiTargetValue, kpiCurrentValue, kpiUnit }: HabitTrackerProps) {
  const { currentUser: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [completionNotes, setCompletionNotes] = useState('');
  const [showNotesDropdown, setShowNotesDropdown] = useState(false);

  // Get habit completions for the last 30 days
  const { data: completions = [] } = useQuery({
    queryKey: ['/api/strategy/tasks', taskId, 'completions', user?.id],
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/tasks/${taskId}/completions?userId=${user?.id}&days=30`);
      return await response.json();
    },
    enabled: !!user?.id
  });

  // Get habit streak information
  const { data: streak } = useQuery({
    queryKey: ['/api/strategy/tasks', taskId, 'streak', user?.id],
    queryFn: async () => {
      const response = await apiRequest(`/api/strategy/tasks/${taskId}/streak/${user?.id}`);
      return await response.json();
    },
    enabled: !!user?.id
  });

  const logCompletionMutation = useMutation({
    mutationFn: (data: { completionDate: string; notes?: string }) =>
      apiRequest(`/api/strategy/tasks/${taskId}/complete`, {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tasks', taskId, 'completions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/tasks', taskId, 'streak'] });
      toast({
        title: 'Success',
        description: 'Habit completion logged successfully'
      });
      setCompletionNotes('');
      setShowNotesDropdown(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to log completion',
        variant: 'destructive'
      });
    }
  });

  const handleLogCompletion = (notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    logCompletionMutation.mutate({
      completionDate: today,
      notes: notes || completionNotes || undefined
    });
  };

  // Check if today is already completed
  const today = new Date().toISOString().split('T')[0];
  const todayCompleted = Array.isArray(completions) && completions.some(
    (completion: HabitCompletion) => completion.completionDate === today
  );
  


  const getFrequencyEmoji = (freq: string) => {
    switch (freq) {
      case 'daily': return '🌅';
      case 'weekly': return '📅';
      case 'monthly': return '🗓️';
      default: return '⚡';
    }
  };

  return (
    <div className="w-full mt-2">
      {/* Streaks and Update Button Row */}
      <div className="flex items-center justify-between mb-2">
        {streak && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              <span className="font-semibold">{streak.currentStreak}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <span className="font-semibold">{Math.round(streak.completionRate)}%</span>
            </div>
          </div>
        )}
        
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={() => handleLogCompletion()}
          disabled={logCompletionMutation.isPending || todayCompleted}
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">Update Progress</span>
          <span className="sm:hidden">Done</span>
        </Button>
      </div>

      {/* Progress Section with Weekly Tracker Side-by-Side */}
      {kpiLabel && kpiTargetValue && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Left: Progress Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">{kpiLabel}</span>
              <span className="text-sm font-bold text-gray-900">
                {kpiCurrentValue || 0}/{kpiTargetValue} {kpiUnit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${Math.min(100, ((kpiCurrentValue || 0) / kpiTargetValue) * 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Right: Weekly Tracker (if weekly) */}
          {frequency === 'weekly' && (
            <div className="sm:w-auto">
              <div className="text-[10px] font-medium text-gray-600 mb-1">This Week</div>
              <div className="flex gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const today = new Date();
                  const currentDayOfWeek = today.getDay();
                  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
                  const dayDate = new Date(today);
                  dayDate.setDate(today.getDate() + mondayOffset + index);
                  const dateStr = dayDate.toISOString().split('T')[0];
                  
                  const isCompleted = Array.isArray(completions) && completions.some(
                    (completion: HabitCompletion) => completion.completionDate === dateStr
                  );
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const isFuture = dayDate > new Date();
                  
                  return (
                    <div key={day} className="text-center">
                      <div className="text-[9px] text-gray-500">{day.slice(0, 1)}</div>
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center
                        ${isCompleted ? 'bg-green-500' : 
                          isToday ? 'bg-blue-500' :
                          isFuture ? 'bg-gray-100' :
                          'bg-gray-300'}
                      `}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : isToday && !todayCompleted ? (
                          <Circle className="h-3 w-3 text-white" />
                        ) : (
                          <Circle className="h-3 w-3 text-white opacity-50" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Section without KPI */}
      {(!kpiLabel || !kpiTargetValue) && frequency === 'weekly' && (
        <div className="border-t pt-3">
          <div className="text-xs font-medium text-gray-700 mb-2">This Week</div>
          <div className="flex gap-1 justify-center">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const today = new Date();
              const currentDayOfWeek = today.getDay();
              const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
              const dayDate = new Date(today);
              dayDate.setDate(today.getDate() + mondayOffset + index);
              const dateStr = dayDate.toISOString().split('T')[0];
              
              const isCompleted = Array.isArray(completions) && completions.some(
                (completion: HabitCompletion) => completion.completionDate === dateStr
              );
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isFuture = dayDate > new Date();
              
              return (
                <div key={day} className="text-center">
                  <div className="text-[10px] text-gray-600 mb-1">{day.slice(0, 3)}</div>
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isCompleted ? 'bg-green-500' : 
                      isToday ? 'bg-blue-500' :
                      isFuture ? 'bg-gray-100 border border-gray-200' :
                      'bg-gray-300'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : isToday && !todayCompleted ? (
                      <Circle className="h-4 w-4 text-white" />
                    ) : (
                      <Circle className="h-4 w-4 text-white opacity-50" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Simple Daily/Monthly Status - Only if not weekly */}
      {frequency !== 'weekly' && (
        <div className="border-t pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {todayCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-xs font-medium">
              Today ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
            </span>
          </div>
          
          {todayCompleted ? (
            <Badge className="text-xs px-2 py-0 bg-green-100 text-green-800 border-green-200">
              Completed
            </Badge>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                className="h-6 text-xs px-3 sm:hidden"
                onClick={() => handleLogCompletion()}
                disabled={logCompletionMutation.isPending}
              >
                Done
              </Button>
              <DropdownMenu open={showNotesDropdown} onOpenChange={setShowNotesDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2"
                    disabled={logCompletionMutation.isPending}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <ChevronDown className="h-2 w-2 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Add a note (optional)</label>
                    <Textarea
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      className="text-xs"
                      placeholder="What did you accomplish?"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-6 text-xs flex-1"
                        onClick={() => handleLogCompletion(completionNotes)}
                        disabled={logCompletionMutation.isPending}
                      >
                        Mark Done
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setShowNotesDropdown(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}

      {/* Mobile Done Button for Weekly */}
      {frequency === 'weekly' && !todayCompleted && (
        <div className="border-t pt-3 flex justify-center sm:hidden">
          <Button
            size="sm"
            className="h-7 px-4 text-xs"
            onClick={() => handleLogCompletion()}
            disabled={logCompletionMutation.isPending}
          >
            Mark Today Complete
          </Button>
        </div>
      )}

    </div>
  );
}