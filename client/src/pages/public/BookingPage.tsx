import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Loader2, User, LogIn, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';

interface AppointmentType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  taskCategory: string;
  accessMode: 'open' | 'authenticated';
  requireCustomerAccount: boolean;
  duration: string;
  buttonLabel: string;
  confirmationMessage: string;
  organization: {
    id: number;
    name: string;
    logoUrl: string | null;
  };
}

interface LegacyBookingInfo {
  taskTypeName: string;
  ticketNumber?: string;
  ticketSubject?: string;
  serviceAddress?: string;
  duration: string;
  customerName?: string;
}

interface Slot {
  datetime: string;
  displayDate: string;
  displayTime: string;
}

export default function BookingPage() {
  const { slug, token } = useParams<{ slug?: string; token?: string }>();
  const [location] = useLocation();
  
  const isLegacyTokenFlow = location.startsWith('/public/bookings') && !!token;
  const identifier = isLegacyTokenFlow ? token : slug;
  
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('booking-theme');
    return stored ? stored === 'dark' : true;
  });
  
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('booking-theme', theme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [isDarkMode]);
  
  const toggleTheme = () => setIsDarkMode(prev => !prev);
  
  const { data: legacyBooking, isLoading: legacyLoading, error: legacyError } = useQuery<LegacyBookingInfo>({
    queryKey: ['/api/public/bookings', token],
    queryFn: async () => {
      const response = await fetch(`/api/public/bookings/${token}`);
      if (!response.ok) throw new Error('Booking not found');
      return response.json();
    },
    enabled: isLegacyTokenFlow,
  });
  
  const { data: appointmentType, isLoading: slugLoading, error: slugError } = useQuery<AppointmentType>({
    queryKey: ['/api/public/appointment-types', slug],
    queryFn: async () => {
      const response = await fetch(`/api/public/appointment-types/${slug}`);
      if (!response.ok) throw new Error('Appointment type not found');
      return response.json();
    },
    enabled: !isLegacyTokenFlow && !!slug,
  });
  
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: isLegacyTokenFlow 
      ? ['/api/public/bookings', token, 'slots']
      : ['/api/public/appointment-types', slug, 'slots'],
    queryFn: async () => {
      if (isLegacyTokenFlow) {
        const response = await apiRequest(`/api/public/bookings/${token}/available-slots`, {
          method: 'POST',
          body: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        });
        return response.json();
      } else {
        const response = await apiRequest(`/api/public/appointment-types/${slug}/available-slots`, {
          method: 'POST',
          body: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        });
        return response.json();
      }
    },
    enabled: (isLegacyTokenFlow ? !!legacyBooking : !!appointmentType) && !isConfirmed,
  });
  
  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/public/auth/login', {
        method: 'POST',
        body: { email: loginEmail, password: loginPassword }
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      setLoggedInUser(data.user);
      setCustomerName(data.user.username || '');
      setCustomerEmail(data.user.email || '');
      setShowLogin(false);
    }
  });
  
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (isLegacyTokenFlow) {
        const response = await apiRequest(`/api/public/bookings/${token}/confirm`, {
          method: 'POST',
          body: {
            selectedDatetime: selectedSlot?.datetime,
            contactNumber: customerPhone,
            additionalNotes
          }
        });
        return response.json();
      } else {
        const response = await apiRequest(`/api/public/appointment-types/${slug}/book`, {
          method: 'POST',
          body: {
            selectedDatetime: selectedSlot?.datetime,
            customerName,
            customerEmail,
            customerPhone,
            serviceAddress,
            additionalNotes,
            authToken
          }
        });
        return response.json();
      }
    },
    onSuccess: (data) => {
      setConfirmationData(data);
      setIsConfirmed(true);
    }
  });
  
  const isLoading = isLegacyTokenFlow ? legacyLoading : slugLoading;
  const error = isLegacyTokenFlow ? legacyError : slugError;
  const requiresAuth = !isLegacyTokenFlow && appointmentType?.accessMode === 'authenticated';
  const needsLogin = requiresAuth && !authToken;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900" data-testid="loading-booking">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading booking page...</p>
        </div>
      </div>
    );
  }
  
  const hasData = isLegacyTokenFlow ? !!legacyBooking : !!appointmentType;
  
  if (error || !hasData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4" data-testid="error-booking">
        <Card className="max-w-md w-full p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 dark:text-white">Booking Not Found</h1>
            <p className="text-muted-foreground dark:text-gray-400 mb-4">
              {isLegacyTokenFlow 
                ? 'This booking link is invalid or has expired.'
                : 'This booking page is not available or the link is incorrect.'}
            </p>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Please contact support for assistance.
            </p>
          </div>
        </Card>
      </div>
    );
  }
  
  const bookingName = isLegacyTokenFlow ? legacyBooking?.taskTypeName : appointmentType?.name;
  const bookingDuration = isLegacyTokenFlow ? legacyBooking?.duration : appointmentType?.duration;
  const displayServiceAddress = isLegacyTokenFlow ? legacyBooking?.serviceAddress : serviceAddress;
  const orgLogo = !isLegacyTokenFlow ? appointmentType?.organization?.logoUrl : null;
  const orgName = !isLegacyTokenFlow ? appointmentType?.organization?.name : null;
  
  if (isConfirmed && confirmationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4" data-testid="confirmation-booking">
        <Card className="max-w-md w-full p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-center">
            {orgLogo && (
              <img 
                src={orgLogo} 
                alt={orgName || ''}
                className="h-12 mx-auto mb-4"
              />
            )}
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 dark:text-white">Appointment Confirmed!</h1>
            <p className="text-muted-foreground dark:text-gray-400 mb-6">
              {confirmationData.confirmationMessage || `Your ${bookingName} has been scheduled.`}
            </p>
            
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-3 mb-3">
                <Calendar className="h-5 w-5 text-muted-foreground dark:text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium dark:text-white">{selectedSlot?.displayDate}</div>
                  <div className="text-sm text-muted-foreground dark:text-gray-400">{selectedSlot?.displayTime}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 mb-3">
                <Clock className="h-5 w-5 text-muted-foreground dark:text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm dark:text-gray-200">Duration: {bookingDuration}</div>
                </div>
              </div>
              
              {displayServiceAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground dark:text-gray-400 mt-0.5" />
                  <div className="text-sm dark:text-gray-200">{displayServiceAddress}</div>
                </div>
              )}
            </div>
            
            <Alert className="dark:bg-gray-700 dark:border-gray-600">
              <AlertDescription className="dark:text-gray-200">
                {isLegacyTokenFlow 
                  ? 'A confirmation email has been sent to your registered email address.'
                  : `Reference: #${confirmationData.bookingId}. You'll receive a confirmation email shortly.`}
              </AlertDescription>
            </Alert>
          </div>
        </Card>
      </div>
    );
  }
  
  const slotsByDate = (slotsData?.slots || []).reduce((acc: Record<string, Slot[]>, slot: Slot) => {
    const date = slot.displayDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});
  
  const legacyCanSubmit = isLegacyTokenFlow && selectedSlot;
  const slugCanSubmit = !isLegacyTokenFlow && selectedSlot && customerName && customerEmail && (!requiresAuth || authToken);
  const canSubmit = isLegacyTokenFlow ? legacyCanSubmit : slugCanSubmit;
  
  const bookingDescription = !isLegacyTokenFlow ? appointmentType?.description : null;
  const legacyTicketInfo = isLegacyTokenFlow && legacyBooking 
    ? `Ticket #${legacyBooking.ticketNumber} - ${legacyBooking.ticketSubject}`
    : null;
  
  const inputClasses = "dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400";
  const labelClasses = "dark:text-gray-200";
  const buttonOutlineClasses = "dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600";
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4 overflow-y-auto" data-testid="booking-page">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {orgLogo && (
                <img 
                  src={orgLogo} 
                  alt={orgName || ''}
                  className="h-10 mb-3"
                />
              )}
              <h1 className="text-2xl font-bold mb-1 dark:text-white" data-testid="text-booking-title">
                {isLegacyTokenFlow ? `Schedule ${bookingName}` : `Book: ${bookingName}`}
              </h1>
              {bookingDescription && (
                <p className="text-muted-foreground dark:text-gray-400">{bookingDescription}</p>
              )}
              {legacyTicketInfo && (
                <p className="text-muted-foreground dark:text-gray-400">{legacyTicketInfo}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                data-testid="button-toggle-theme"
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                <Clock className="h-4 w-4" />
                {bookingDuration}
              </div>
            </div>
          </div>
          
          {isLegacyTokenFlow && legacyBooking?.serviceAddress && (
            <div className="flex items-start gap-3 mb-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground dark:text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium dark:text-white">Service Address</div>
                <div className="text-sm text-muted-foreground dark:text-gray-400">{legacyBooking.serviceAddress}</div>
              </div>
            </div>
          )}
          
          {isLegacyTokenFlow && (
            <div className="mb-6">
              <Label htmlFor="contact-number" className={labelClasses}>Contact Number (Optional)</Label>
              <Input
                id="contact-number"
                type="tel"
                placeholder="(555) 123-4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                data-testid="input-contact-number"
                className={inputClasses}
              />
            </div>
          )}
          
          {needsLogin && !showLogin && (
            <Alert className="mb-6">
              <LogIn className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>This appointment type requires you to log in first.</span>
                <Button size="sm" onClick={() => setShowLogin(true)}>
                  Log In
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {showLogin && (
            <Card className="p-4 mb-6 bg-gray-100 dark:bg-gray-700 dark:border-gray-600">
              <h3 className="font-medium mb-3 dark:text-white">Log in to continue</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="login-email" className={labelClasses}>Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    data-testid="input-login-email"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <Label htmlFor="login-password" className={labelClasses}>Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    data-testid="input-login-password"
                    className={inputClasses}
                  />
                </div>
                {loginMutation.error && (
                  <Alert variant="destructive">
                    <AlertDescription>Invalid email or password</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => loginMutation.mutate()}
                    disabled={loginMutation.isPending || !loginEmail || !loginPassword}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Log In
                  </Button>
                  <Button variant="ghost" onClick={() => setShowLogin(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}
          
          {loggedInUser && (
            <Alert className="mb-6">
              <User className="h-4 w-4" />
              <AlertDescription>
                Logged in as {loggedInUser.email}
              </AlertDescription>
            </Alert>
          )}
          
          {!isLegacyTokenFlow && (
            <>
              <Separator className="my-6 dark:bg-gray-700" />
              
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 dark:text-white">Your Details</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="customer-name" className={labelClasses}>Full Name *</Label>
                    <Input
                      id="customer-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="John Smith"
                      required
                      data-testid="input-customer-name"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-email" className={labelClasses}>Email *</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                      data-testid="input-customer-email"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone" className={labelClasses}>Phone Number</Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      data-testid="input-customer-phone"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <Label htmlFor="service-address" className={labelClasses}>Service Address</Label>
                    <Input
                      id="service-address"
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                      placeholder="123 Main St, City"
                      data-testid="input-service-address"
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          
          <Separator className="my-6 dark:bg-gray-700" />
          
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-3 dark:text-white">Select Date & Time</h2>
            
            {slotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground dark:text-gray-400" />
              </div>
            ) : Object.keys(slotsByDate).length === 0 ? (
              <Alert className="dark:bg-gray-700 dark:border-gray-600">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="dark:text-gray-200">
                  No available slots found in the next 2 weeks. Please contact support.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4 max-h-[250px] overflow-y-auto border rounded-lg p-3 dark:border-gray-600 dark:bg-gray-700/30">
                {Object.entries(slotsByDate).map(([date, slots]) => (
                  <div key={date}>
                    <div className="font-medium mb-2 text-sm text-muted-foreground dark:text-gray-400">{date}</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {(slots as Slot[]).map((slot) => (
                        <Button
                          key={slot.datetime}
                          variant={selectedSlot?.datetime === slot.datetime ? 'default' : 'outline'}
                          className={`h-auto py-2 px-3 text-sm ${selectedSlot?.datetime !== slot.datetime ? buttonOutlineClasses : ''}`}
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
          
          <Separator className="my-6 dark:bg-gray-700" />
          
          <div className="mb-6">
            <Label htmlFor="additional-notes" className={labelClasses}>Additional Notes (Optional)</Label>
            <Textarea
              id="additional-notes"
              placeholder="Any special instructions or requirements..."
              rows={3}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className={inputClasses}
              data-testid="textarea-notes"
            />
          </div>
          
          {confirmMutation.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(confirmMutation.error as any)?.message || 'Failed to create booking. Please try again.'}
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit || confirmMutation.isPending}
            onClick={() => confirmMutation.mutate()}
            data-testid="button-confirm-booking"
          >
            {confirmMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isLegacyTokenFlow 
              ? 'Confirm Appointment'
              : (appointmentType?.buttonLabel || 'Confirm Booking')}
          </Button>
          
          {!canSubmit && (
            <p className="text-sm text-muted-foreground dark:text-gray-400 text-center mt-2">
              {isLegacyTokenFlow 
                ? (!selectedSlot ? 'Please select a time slot' : '')
                : (!customerName || !customerEmail 
                    ? 'Please fill in your name and email'
                    : !selectedSlot 
                      ? 'Please select a time slot'
                      : needsLogin 
                        ? 'Please log in to continue'
                        : '')}
            </p>
          )}
        </Card>
        
        {orgName && (
          <p className="text-center text-sm text-muted-foreground dark:text-gray-400 mt-4">
            Powered by {orgName}
          </p>
        )}
      </div>
    </div>
  );
}
