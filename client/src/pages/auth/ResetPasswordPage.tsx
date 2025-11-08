import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const token = params.token;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  // Verify token validity on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          password: data.password
        }
      });

      if (response.ok) {
        setSuccess(true);
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset. Redirecting to login...",
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation('/login');
        }, 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Unable to reset password. The link may be expired.');
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
            <CardTitle className="text-white">Create New Password</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your new password below. Make sure it's at least 8 characters long and includes a number.
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

                {/* New Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      {...register('password')}
                      className={`bg-[#0A0A0B] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#8B5CF6] focus:ring-[#8B5CF6] pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Min 8 characters, must include at least 1 number
                  </p>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      {...register('confirmPassword')}
                      className={`bg-[#0A0A0B] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#8B5CF6] focus:ring-[#8B5CF6] pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                  disabled={isLoading || !token}
                  data-testid="button-reset-password"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
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
                  <div className="space-y-2">
                    <p>Your password has been successfully reset!</p>
                    <p className="text-sm">Redirecting you to the login page...</p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Manual Login Button */}
              <Button
                onClick={() => setLocation('/login')}
                className="w-full bg-[#00BFA6] hover:bg-[#00BFA6]/90"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
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