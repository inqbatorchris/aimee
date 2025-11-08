import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { TeamFeedbackForm } from '@/components/meeting/TeamFeedbackForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function MeetingFeedback() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const meetingId = params.meetingId ? parseInt(params.meetingId) : null;

  // Fetch meeting details
  const { data: meeting, isLoading: meetingLoading } = useQuery<any>({
    queryKey: [`/api/strategy/check-in-meetings/${meetingId}`],
    enabled: !!meetingId
  });

  // Check if current user has already submitted feedback
  const { data: myFeedback } = useQuery<any>({
    queryKey: [`/api/strategy/meetings/${meetingId}/my-feedback`],
    enabled: !!meetingId
  });

  // Fetch all feedback for the meeting
  const { data: allFeedback } = useQuery<any>({
    queryKey: [`/api/strategy/meetings/${meetingId}/feedback`],
    enabled: !!meetingId
  });

  // Fetch team members to show who has/hasn't submitted
  const { data: teamMembers } = useQuery<any[]>({
    queryKey: [`/api/teams/${meeting?.teamId}/members`],
    enabled: !!meeting?.teamId
  });

  if (meetingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Meeting Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The meeting you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => setLocation('/strategy/checkin')}>
                Back to Check-in Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate feedback completion
  const feedbackCount = allFeedback?.feedback?.length || 0;
  const teamMemberCount = teamMembers?.length || 1;
  const completionPercentage = Math.round((feedbackCount / teamMemberCount) * 100);

  // If user hasn't submitted feedback, show the form
  if (!myFeedback?.hasSubmitted) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation('/strategy/checkin')}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          
          {/* Meeting Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{meeting.title || 'Team Check-in'}</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(meeting.scheduledDate), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.teamName || 'Team Meeting'}
                    </span>
                  </CardDescription>
                </div>
                <Badge variant={meeting.status === 'Completed' ? 'default' : 'secondary'}>
                  {meeting.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Feedback Form */}
        <TeamFeedbackForm
          meetingId={meetingId!}
          teamName={meeting.teamName}
          onComplete={() => setLocation('/strategy/checkin')}
        />
      </div>
    );
  }

  // User has already submitted, show summary
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => setLocation('/strategy/checkin')}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>

        {/* Meeting Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{meeting.title || 'Team Check-in'}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(meeting.scheduledDate), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {meeting.teamName || 'Team Meeting'}
                  </span>
                </CardDescription>
              </div>
              <Badge variant="default">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Feedback Submitted
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Feedback Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Summary</CardTitle>
            <CardDescription>
              {feedbackCount} of {teamMemberCount} team members have submitted feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>

            {/* Your Feedback */}
            {myFeedback?.feedback && (
              <div className="space-y-4">
                <h3 className="font-medium">Your Feedback</h3>
                <div className="grid gap-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm">Overall Rating</span>
                    <Badge variant={
                      myFeedback.feedback.overallRating === 'great' ? 'default' :
                      myFeedback.feedback.overallRating === 'good' ? 'secondary' : 
                      'destructive'
                    }>
                      {myFeedback.feedback.overallRating ? 
                        myFeedback.feedback.overallRating.charAt(0).toUpperCase() + 
                        myFeedback.feedback.overallRating.slice(1) : 'N/A'}
                    </Badge>
                  </div>
                </div>
                
                {myFeedback.feedback.itemsForNextCheckIn && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Items for Next Check-in:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {myFeedback.feedback.itemsForNextCheckIn}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Team Members Status */}
            {teamMembers && teamMembers.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Team Feedback Status</h3>
                <div className="grid gap-2">
                  {teamMembers.map((member: any) => {
                    const hasFeedback = allFeedback?.feedback?.some(
                      (f: any) => f.userId === member.userId
                    );
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {member.fullName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{member.fullName}</span>
                        </div>
                        {hasFeedback ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}