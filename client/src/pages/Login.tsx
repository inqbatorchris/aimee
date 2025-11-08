import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import logoWhite from '@assets/aimeelogowhite_1759953200944.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      
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
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[#0A0A0B]">
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
              className="mx-auto mb-4 h-12 sm:h-16 w-auto"
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
            <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
              <form onSubmit={handleSubmit} className="space-y-5" method="POST" action="#" role="form">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4 text-[#8B5CF6]" />
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="username"
                      name="email"
                      className="w-full bg-[#0A0A0B] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#8B5CF6] focus:ring-[#8B5CF6]"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2 text-gray-300">
                    <Lock className="h-4 w-4 text-[#8B5CF6]" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    name="password"
                    className="w-full bg-[#0A0A0B] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#8B5CF6] focus:ring-[#8B5CF6]"
                  />
                </div>
                
                {/* Forgot Password Link */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember"
                      className="h-4 w-4 rounded border-gray-700 bg-[#0A0A0B] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                    />
                    <Label htmlFor="remember" className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                      Remember me
                    </Label>
                  </div>
                  <Link 
                    href="/forgot-password"
                    className="text-sm text-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold py-6 text-base shadow-lg transition-all duration-200"
                  size="lg"
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
                  <span className="text-sm text-gray-400">
                    Don't have an account?{' '}
                    <Link 
                      href="/register"
                      className="text-[#8B5CF6] hover:text-[#7C3AED] font-medium transition-colors"
                    >
                      Sign up
                    </Link>
                  </span>
                </div>

                {/* Field App Link */}
                <div className="text-center pt-3 border-t border-gray-800 mt-4">
                  <span className="text-sm text-gray-400">
                    Field worker?{' '}
                    <Link 
                      href="/field-app/login"
                      className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      Use Field App
                    </Link>
                  </span>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Back to Home Link */}
          <div className="text-center mt-8">
            <Link 
              href="/"
              className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}