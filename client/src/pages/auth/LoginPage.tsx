import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import logoWhite from '@assets/aimeelogowhite_1759953200944.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false)
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      await login({ email: data.email, password: data.password });
      
      // Save email if remember me is checked
      if (data.rememberMe) {
        localStorage.setItem('rememberedEmail', data.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      
      // Check for return URL parameter first
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('return');
      
      if (returnUrl) {
        // Decode and use the return URL
        setLocation(decodeURIComponent(returnUrl));
      } else {
        // Check for last visited path, otherwise go to /my-day
        const lastPath = localStorage.getItem('lastVisitedPath');
        if (lastPath && lastPath !== '/' && !lastPath.includes('/login')) {
          setLocation(lastPath);
        } else {
          setLocation('/my-day');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
      toast({
        title: "Login Failed",
        description: "Unable to connect to the server. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered email on mount
  useState(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setValue('rememberMe', true);
    }
  });

  return (
    <div className="login-page min-h-screen relative bg-[#0A0A0B]">
      {/* Gradient background effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#8B5CF6]/20 via-transparent to-[#EC4899]/20 opacity-30 pointer-events-none" />
      {/* Animated background orbs */}
      <div className="fixed top-0 -left-4 w-72 h-72 bg-[#8B5CF6]/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="fixed bottom-0 -right-4 w-96 h-96 bg-[#EC4899]/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
      {/* Main content - mobile: normal flow, desktop: centered */}
      <div className="relative z-10 px-4 pt-12 pb-16 sm:min-h-screen sm:flex sm:flex-col sm:justify-center sm:py-8">
        <div className="w-full max-w-md mx-auto">
          {/* Logo/Brand Section */}
          <div className="text-center mb-8">
            <img 
              src={logoWhite} 
              alt="Aimee.works" 
              className="mx-auto mb-4 h-12 sm:h-16 w-auto cursor-pointer"
              onClick={() => setLocation('/')}
            />
            <p className="text-gray-400 text-sm sm:text-base">Welcome back! Please sign in to continue.</p>
          </div>

          {/* Login Card */}
          <Card className="shadow-2xl border-gray-800 backdrop-blur-sm bg-[#18181B]/95">
            <CardHeader className="pb-4 sm:pb-6 pt-6 sm:pt-8">
              <CardTitle className="text-2xl sm:text-3xl text-center font-bold text-white">
                Sign In
              </CardTitle>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-5">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-400" data-testid="alert-login-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    {...register('email')}
                    className={`w-full bg-[#0A0A0B] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#8B5CF6] focus:ring-[#8B5CF6] ${errors.email ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                    data-testid="input-email"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-400">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={`w-full bg-[#0A0A0B] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#8B5CF6] focus:ring-[#8B5CF6] ${errors.password ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                    data-testid="input-password"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-400">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setValue('rememberMe', checked as boolean)}
                      disabled={isLoading}
                      className="border-gray-700 bg-[#0A0A0B] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                      data-testid="checkbox-remember-me"
                    />
                    <Label 
                      htmlFor="rememberMe" 
                      className="text-sm text-gray-400 cursor-pointer hover:text-gray-300"
                    >
                      Remember me
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocation('/forgot-password')}
                    className="text-[#8B5CF6] hover:text-[#7C3AED] transition-colors text-[14px]"
                    disabled={isLoading}
                    data-testid="link-forgot-password"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold py-6 shadow-lg transition-all duration-200 text-[14px]"
                  disabled={isLoading}
                  data-testid="button-sign-in"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                {/* Register Link */}
                <div className="text-center pt-2">
                  <span className="text-gray-400 text-[14px]">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setLocation('/register')}
                      className="text-[#8B5CF6] hover:text-[#7C3AED] font-medium transition-colors"
                      disabled={isLoading}
                      data-testid="link-register"
                    >
                      Sign up
                    </button>
                  </span>
                </div>

                {/* Field App Link */}
                <div className="text-center pt-3 border-t border-gray-800 mt-4">
                  <span className="text-gray-400 text-[14px]">
                    Field worker?{' '}
                    <button
                      type="button"
                      onClick={() => setLocation('/field-app')}
                      className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors text-[14px]"
                      disabled={isLoading}
                      data-testid="link-field-app"
                    >
                      Use Field App
                    </button>
                  </span>
                </div>
              </CardContent>
            </form>
          </Card>

          {/* Back to Home Link */}
          <div className="text-center mt-8">
            <button
              onClick={() => setLocation('/')}
              className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2"
              disabled={isLoading}
              data-testid="link-back-home"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}