import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Flame, 
  Calendar, 
  Target, 
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface HabitExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitExplanationDialog({ open, onOpenChange }: HabitExplanationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span>Habit Tracker Explained</span>
          </DialogTitle>
          <DialogDescription>
            Learn how to use the habit tracking system for consistent progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* What is it */}
          <div>
            <h3 className="font-medium text-sm mb-2 flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span>What is a Habit Task?</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Habit tasks are recurring activities that help you build consistency toward your key results. 
              Unlike one-time project tasks, habits are tracked over time to build streaks and measure progress.
            </p>
          </div>

          {/* How to use */}
          <div>
            <h3 className="font-medium text-sm mb-2 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span>How to Use It</span>
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start space-x-2">
                <span className="font-medium text-primary">1.</span>
                <span>Create a habit task with frequency (daily, weekly, monthly)</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-primary">2.</span>
                <span>Click the habit tracker to mark completion for today</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-primary">3.</span>
                <span>Add optional notes about your completion and effort level</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-primary">4.</span>
                <span>Build streaks and track your consistency over time</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-medium text-sm mb-2 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span>Tracking Features</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2 p-2 bg-orange-50 rounded-md">
                <Flame className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-xs font-medium">Current Streak</div>
                  <div className="text-xs text-muted-foreground">Days in a row</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-md">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-xs font-medium">Completion Rate</div>
                  <div className="text-xs text-muted-foreground">% success rate</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-md">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-xs font-medium">Total Completions</div>
                  <div className="text-xs text-muted-foreground">Times completed</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded-md">
                <Clock className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-xs font-medium">Longest Streak</div>
                  <div className="text-xs text-muted-foreground">Best run ever</div>
                </div>
              </div>
            </div>
          </div>

          {/* Example */}
          <div>
            <h3 className="font-medium text-sm mb-2">Example Habit Tasks</h3>
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">Review daily metrics</Badge>
              <Badge variant="outline" className="text-xs">Customer follow-up calls</Badge>
              <Badge variant="outline" className="text-xs">Weekly team check-ins</Badge>
              <Badge variant="outline" className="text-xs">Monthly goal review</Badge>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} size="sm">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}