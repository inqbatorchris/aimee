import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import logoUrl from '@/assets/CC_Future_proof_broadband.svg';
import companyLogoUrl from '@/assets/Country_Connect_Logo_Tight_2024_White.png';
import aimeeLogo from '@assets/aimeelogowhite_1759953200944.png';

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
      
      if (data.rememberMe) {
        localStorage.setItem('rememberedEmail', data.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('return');
      
      if (returnUrl) {
        setLocation(decodeURIComponent(returnUrl));
      } else {
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

  useState(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setValue('rememberMe', true);
    }
  });

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-10">
            <img src={logoUrl} alt="Country Connect - Future Proof Broadband" className="h-[49px]" />
            <p className="mt-3 text-[#ffffff] text-[20px] text-center">Desktop login.</p>
            <div className="mt-3 text-center">
              <span className="text-zinc-400 text-[14px]">
                Field worker?{' '}
                <button
                  type="button"
                  onClick={() => setLocation('/field-app')}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors text-[16px]"
                  disabled={isLoading}
                  data-testid="link-field-app"
                >
                  Use Field App
                </button>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
                className={`bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 ${errors.email ? 'border-red-500' : ''}`}
                disabled={isLoading}
                autoComplete="email"
                data-testid="input-email"
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={`bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 ${errors.password ? 'border-red-500' : ''}`}
                disabled={isLoading}
                autoComplete="current-password"
                data-testid="input-password"
              />
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2" data-testid="alert-login-error">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setValue('rememberMe', checked as boolean)}
                  disabled={isLoading}
                  className="border-zinc-700 bg-zinc-800 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  data-testid="checkbox-remember-me"
                />
                <Label 
                  htmlFor="rememberMe" 
                  className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300"
                >
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                onClick={() => setLocation('/forgot-password')}
                className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm"
                disabled={isLoading}
                data-testid="link-forgot-password"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
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
          </form>

          <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-sm text-zinc-400">
              <strong className="text-zinc-300">Need help?</strong> Contact your administrator for login assistance or password reset.
            </p>
          </div>

          <div className="mt-10 text-center">
            <img src={companyLogoUrl} alt="Country Connect" className="h-12 mx-auto" />
          </div>
        </div>
      </div>
      <div className="p-6 text-center">
        <a 
          href="https://aimee.works" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-400 transition-colors"
          data-testid="link-powered-by"
        >
          <span className="text-xs">Powered by</span>
          <img src={aimeeLogo} alt="Aimee.works" className="h-5" />
        </a>
      </div>
    </div>
  );
}
