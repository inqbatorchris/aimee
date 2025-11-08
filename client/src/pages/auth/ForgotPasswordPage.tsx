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
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess(false);
    setDevResetLink(null);

    try {
      const response = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: data
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(true);
        
        // In development, show the reset link for testing
        if (result.devMode?.resetLink) {
          setDevResetLink(result.devMode.resetLink);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Unable to send reset email. Please try again.');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] px-4 py-8">
      {/* Gradient background effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#8B5CF6]/20 via-transparent to-[#EC4899]/20 opacity-30" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/uploads/logos/logo-1756765982563-805671989.png" 
            alt="Aimee.works" 
            className="h-12 w-auto mx-auto cursor-pointer"
            onClick={() => setLocation('/')}
          />
        </div>

        <Card className="bg-[#18181B] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Reset Your Password</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your email and we'll send you instructions to reset your password.
            </CardDescription>
          </CardHeader>

          {!success ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" data-testid="alert-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register('email')}
                    className={`bg-[#0A0A0B] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#8B5CF6] focus:ring-[#8B5CF6] ${errors.email ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                    data-testid="input-email"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                  disabled={isLoading}
                  data-testid="button-send-reset-link"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </CardContent>
            </form>
          ) : (
            <CardContent className="space-y-4">
              {/* Success Message */}
              <Alert className="border-green-200 bg-green-50" data-testid="alert-success">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Check your email! We've sent password reset instructions to your inbox.
                </AlertDescription>
              </Alert>

              {/* Development Mode Reset Link */}
              {devResetLink && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <div className="space-y-2">
                      <p className="font-semibold">Development Mode:</p>
                      <p className="text-sm">Since email sending is not configured, here's your reset link:</p>
                      <button
                        onClick={() => setLocation(devResetLink)}
                        className="text-sm text-blue-600 underline hover:text-blue-800 break-all"
                        data-testid="link-dev-reset"
                      >
                        {devResetLink}
                      </button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Resend Option */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Didn't receive the email?
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuccess(false);
                    setDevResetLink(null);
                  }}
                  data-testid="button-resend"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          )}

          <CardFooter className="justify-center">
            <button
              onClick={() => setLocation('/login')}
              className="text-sm text-[#8B5CF6] hover:text-[#7C3AED] transition"
              disabled={isLoading}
              data-testid="link-back-to-login"
            >
              Back to login
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}