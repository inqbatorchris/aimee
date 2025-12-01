import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

export default function BookingPage() {
  const { token } = useParams();
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [contactNumber, setContactNumber] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // Fetch booking details
  const { data: booking, isLoading, error } = useQuery({
    queryKey: [`/api/public/bookings/${token}`],
    enabled: !!token,
  });
  
  // Fetch available slots
  const { data: slotsData } = useQuery({
    queryKey: [`/api/public/bookings/${token}/slots`],
    queryFn: async () => {
      const response = await apiRequest(`/api/public/bookings/${token}/available-slots`, {
        method: 'POST',
        body: {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      });
      return response.json();
    },
    enabled: !!booking && !isConfirmed,
  });
  
  // Confirm booking mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/public/bookings/${token}/confirm`, {
        method: 'POST',
        body: {
          selectedDatetime: selectedSlot.datetime,
          contactNumber,
          additionalNotes
        }
      });
      return response.json();
    },
    onSuccess: () => {
      setIsConfirmed(true);
    }
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="loading-booking">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" data-testid="error-booking">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
            <p className="text-muted-foreground mb-4">
              This booking link is invalid or has expired.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact support for assistance.
            </p>
          </div>
        </Card>
      </div>
    );
  }
  
  if (isConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" data-testid="confirmation-booking">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Appointment Confirmed!</h1>
            <p className="text-muted-foreground mb-6">
              Your {booking.taskTypeName.toLowerCase()} has been scheduled.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-3 mb-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">{selectedSlot?.displayDate}</div>
                  <div className="text-sm text-muted-foreground">{selectedSlot?.displayTime}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 mb-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm">Duration: {booking.duration}</div>
                </div>
              </div>
              
              {booking.serviceAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="text-sm">{booking.serviceAddress}</div>
                </div>
              )}
            </div>
            
            <Alert>
              <AlertDescription>
                A confirmation email has been sent to your registered email address.
                You'll receive a reminder 1 hour before the appointment.
              </AlertDescription>
            </Alert>
          </div>
        </Card>
      </div>
    );
  }
  
  // Group slots by date
  const slotsByDate = (slotsData?.slots || []).reduce((acc: any, slot: any) => {
    const date = slot.displayDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" data-testid="booking-page">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2" data-testid="text-booking-title">
              Schedule {booking.taskTypeName}
            </h1>
            <p className="text-muted-foreground">
              Ticket #{booking.ticketNumber} - {booking.ticketSubject}
            </p>
          </div>
          
          {booking.serviceAddress && (
            <div className="flex items-start gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Service Address</div>
                <div className="text-sm text-muted-foreground">{booking.serviceAddress}</div>
              </div>
            </div>
          )}
          
          <div className="mb-6">
            <Label className="text-base mb-3 block">Select Date & Time</Label>
            
            {Object.keys(slotsByDate).length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No available slots found. Please contact support.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {Object.entries(slotsByDate).map(([date, slots]: [string, any]) => (
                  <div key={date}>
                    <div className="font-medium mb-2">{date}</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((slot: any) => (
                        <Button
                          key={slot.datetime}
                          variant={selectedSlot?.datetime === slot.datetime ? 'default' : 'outline'}
                          className="h-auto py-3"
                          onClick={() => setSelectedSlot(slot)}
                          data-testid={`button-slot-${slot.datetime}`}
                        >
                          {slot.displayTime}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="contact-number">Contact Number (Optional)</Label>
              <Input
                id="contact-number"
                type="tel"
                placeholder="(555) 123-4567"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                data-testid="input-contact-number"
              />
            </div>
            
            <div>
              <Label htmlFor="additional-notes">Additional Notes (Optional)</Label>
              <Textarea
                id="additional-notes"
                placeholder="Any special instructions or requirements..."
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                data-testid="textarea-notes"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={!selectedSlot || confirmMutation.isPending}
              className="flex-1"
              data-testid="button-confirm-booking"
            >
              {confirmMutation.isPending ? 'Confirming...' : 'Confirm Appointment'}
            </Button>
          </div>
          
          {confirmMutation.isError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to confirm booking. Please try again or contact support.
              </AlertDescription>
            </Alert>
          )}
        </Card>
      </div>
    </div>
  );
}
