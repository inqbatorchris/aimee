import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Loader2, User, LogIn, Moon, Sun, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, type User as FirebaseUser } from 'firebase/auth';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

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
  postBookingRedirectUrl?: string | null;
  organization: {
    id: number;
    name: string;
    logoUrl: string | null;
  };
  firebaseConfig?: FirebaseConfig | null;
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
  const [firebaseAuth, setFirebaseAuth] = useState<ReturnType<typeof getAuth> | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [isFirebaseLoggingIn, setIsFirebaseLoggingIn] = useState(false);
  
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
  
  // Initialize Firebase when appointment type with Firebase config is loaded
  useEffect(() => {
    if (!appointmentType?.firebaseConfig) return;
    
    const config = appointmentType.firebaseConfig;
    const appName = `booking-${config.projectId}`;
    
    try {
      // Check if app with this name already exists
      const existingApps = getApps();
      let app = existingApps.find(a => a.name === appName);
      
      if (!app) {
        // Initialize Firebase with organization's config using unique app name
        app = initializeApp(config, appName);
        console.log('Firebase initialized for booking page:', appName);
      }
      
      const auth = getAuth(app);
      setFirebaseAuth(auth);
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      setFirebaseError('Failed to initialize authentication');
    }
    
    // Cleanup on unmount (optional - helps prevent memory leaks)
    return () => {
      const apps = getApps();
      const appToCleanup = apps.find(a => a.name === appName);
      if (appToCleanup) {
        deleteApp(appToCleanup).catch(console.error);
      }
    };
  }, [appointmentType?.firebaseConfig]);
  
  // Check if Firebase auth is available
  const useFirebaseAuth = !isLegacyTokenFlow && !!appointmentType?.firebaseConfig && !!firebaseAuth;
  
  // Handle Firebase email/password login
  const handleFirebaseLogin = useCallback(async () => {
    if (!firebaseAuth || !loginEmail || !loginPassword) return;
    
    setIsFirebaseLoggingIn(true);
    setFirebaseError(null);
    
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, loginEmail, loginPassword);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      setAuthToken(idToken);
      setLoggedInUser({
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        uid: user.uid,
      });
      setCustomerName(user.displayName || user.email?.split('@')[0] || '');
      setCustomerEmail(user.email || '');
      setShowLogin(false);
    } catch (error: any) {
      console.error('Firebase login error:', error);
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      setFirebaseError(errorMessage);
    } finally {
      setIsFirebaseLoggingIn(false);
    }
  }, [firebaseAuth, loginEmail, loginPassword]);
  
  // Handle Google sign-in
  const handleGoogleSignIn = useCallback(async () => {
    if (!firebaseAuth) return;
    
    setIsFirebaseLoggingIn(true);
    setFirebaseError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(firebaseAuth, provider);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      setAuthToken(idToken);
      setLoggedInUser({
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        uid: user.uid,
      });
      setCustomerName(user.displayName || '');
      setCustomerEmail(user.email || '');
      setShowLogin(false);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setFirebaseError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsFirebaseLoggingIn(false);
    }
  }, [firebaseAuth]);
  
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
            authToken,
            authType: useFirebaseAuth ? 'firebase' : (authToken ? 'jwt' : undefined),
            firebaseUid: useFirebaseAuth && loggedInUser?.uid ? loggedInUser.uid : undefined
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
  
  const inputClasses = "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400";
  const labelClasses = "text-gray-700 dark:text-gray-200";
  const buttonOutlineClasses = "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600";
  
  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 overflow-y-auto" data-testid="booking-page">
      <div className="max-w-3xl mx-auto py-8 px-4 pb-16">
        <Card className="p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {orgLogo && (
                <img 
                  src={orgLogo} 
                  alt={orgName || ''}
                  className="h-10 mb-3"
                />
              )}
              <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white" data-testid="text-booking-title">
                {isLegacyTokenFlow ? `Schedule ${bookingName}` : `Book: ${bookingName}`}
              </h1>
              {bookingDescription && (
                <p className="text-gray-600 dark:text-gray-400">{bookingDescription}</p>
              )}
              {legacyTicketInfo && (
                <p className="text-gray-600 dark:text-gray-400">{legacyTicketInfo}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                data-testid="button-toggle-theme"
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
                {useFirebaseAuth && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isFirebaseLoggingIn}
                    data-testid="button-google-signin"
                  >
                    {isFirebaseLoggingIn ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                )}
                
                {useFirebaseAuth && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 text-gray-500 dark:text-gray-400">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                )}
                
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
                {(loginMutation.error || firebaseError) && (
                  <Alert variant="destructive">
                    <AlertDescription>{firebaseError || 'Invalid email or password'}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={useFirebaseAuth ? handleFirebaseLogin : () => loginMutation.mutate()}
                    disabled={(useFirebaseAuth ? isFirebaseLoggingIn : loginMutation.isPending) || !loginEmail || !loginPassword}
                    data-testid="button-login"
                  >
                    {(useFirebaseAuth ? isFirebaseLoggingIn : loginMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Log In
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowLogin(false); setFirebaseError(null); }}>
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
              <Separator className="my-6 bg-gray-200 dark:bg-gray-700" />
              
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Your Details</h2>
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
          
          <Separator className="my-6 bg-gray-200 dark:bg-gray-700" />
          
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Select Date & Time</h2>
            
            {slotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400" />
              </div>
            ) : Object.keys(slotsByDate).length === 0 ? (
              <Alert className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-gray-700 dark:text-gray-200">
                  No available slots found in the next 2 weeks. Please contact support.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4 max-h-[250px] overflow-y-auto border rounded-lg p-3 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                {Object.entries(slotsByDate).map(([date, slots]) => (
                  <div key={date}>
                    <div className="font-medium mb-2 text-sm text-gray-600 dark:text-gray-400">{date}</div>
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
          
          <Separator className="my-6 bg-gray-200 dark:bg-gray-700" />
          
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
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
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
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('lastVisitedPath');
                window.location.href = '/';
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              data-testid="button-back-to-app"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Application
            </Button>
          </div>
        </Card>
        
        {orgName && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Powered by {orgName}
          </p>
        )}
      </div>
    </div>
  );
}
