import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ThumbsDown, ThumbsUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamFeedbackFormProps {
  meetingId: number;
  teamName?: string;
  onComplete?: () => void;
}

type Rating = 'poor' | 'good' | 'great';

export function TeamFeedbackForm({ meetingId, teamName, onComplete }: TeamFeedbackFormProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  
  // Simple 3-point feedback
  const [overallRating, setOverallRating] = useState<Rating | null>(null);
  const [itemsForNextCheckIn, setItemsForNextCheckIn] = useState('');

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/strategy/meetings/${meetingId}/feedback`, {
        method: 'POST',
        body: {
          overallRating,
          itemsForNextCheckIn
        }
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ 
        description: 'Thank you for your feedback!',
        className: 'bg-green-50 border-green-200'
      });
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    },
    onError: (error: any) => {
      toast({ 
        description: error.message || 'Failed to submit feedback',
        variant: 'destructive'
      });
    }
  });

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Feedback Submitted!</h2>
          <p className="text-muted-foreground">
            Thank you for taking the time to provide feedback.
          </p>
        </CardContent>
      </Card>
    );
  }

  const ratingOptions: { value: Rating; label: string; icon: React.ReactNode; color: string }[] = [
    { 
      value: 'poor', 
      label: 'Poor', 
      icon: <ThumbsDown className="h-5 w-5" />,
      color: 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
    },
    { 
      value: 'good', 
      label: 'Good', 
      icon: <ThumbsUp className="h-5 w-5" />,
      color: 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'
    },
    { 
      value: 'great', 
      label: 'Great', 
      icon: <Star className="h-5 w-5" />,
      color: 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
    }
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Post-Meeting Feedback</CardTitle>
        <CardDescription>
          {teamName ? `Quick feedback for ${teamName} meeting` : 'Quick feedback for this meeting'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simple Overall Rating */}
        <div className="space-y-3">
          <Label>How was this meeting?</Label>
          <div className="grid grid-cols-3 gap-3">
            {ratingOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setOverallRating(option.value)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
                  overallRating === option.value
                    ? option.color + ' border-opacity-100'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className={cn(
                  "mb-2",
                  overallRating === option.value ? option.color.split(' ')[0] : 'text-gray-600'
                )}>
                  {option.icon}
                </div>
                <span className={cn(
                  "font-medium",
                  overallRating === option.value ? option.color.split(' ')[0] : 'text-gray-700'
                )}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Items for Next Check-in */}
        <div className="space-y-3">
          <Label>Items for next check-in (optional)</Label>
          <Textarea
            placeholder="List any items that should be discussed in the next check-in..."
            value={itemsForNextCheckIn}
            onChange={(e) => setItemsForNextCheckIn(e.target.value)}
            className="min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">
            These items will automatically be added to the next check-in agenda
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onComplete}
          >
            Skip
          </Button>
          <Button
            onClick={() => submitFeedbackMutation.mutate()}
            disabled={!overallRating || submitFeedbackMutation.isPending}
          >
            {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}