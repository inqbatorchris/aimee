/**
 * Field App Login Screen
 * Uses existing JWT authentication
 */

import { useState } from 'react';
import { fieldDB } from '@/lib/field-app/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Smartphone } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoUrl from '@/assets/CC_Future_proof_broadband.svg';
import companyLogoUrl from '@/assets/Country_Connect_Logo_Tight_2024_White.png';

interface LoginProps {
  onSuccess: (session: any) => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const session = {
        token: data.token,
        userId: data.user.id,
        email: data.user.email,
        organizationId: data.user.organizationId,
        downloadedAt: new Date()
      };

      await fieldDB.saveSession(session);
      localStorage.setItem('authToken', data.token);
      
      onSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-5 w-5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">Field App</span>
            </div>
            <img src={logoUrl} alt="Country Connect - Future Proof Broadband" className="h-[49px]" />
            <p className="mt-3 text-[#ffffff] text-[20px]">Mobile login.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                autoComplete="email"
                disabled={loading}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                autoComplete="current-password"
                disabled={loading}
                data-testid="input-password"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2" data-testid="alert-login-error">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
              data-testid="button-sign-in"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-sm text-zinc-400">
              <strong className="text-zinc-300">Note:</strong> Use your regular app credentials. 
              After login, you can download work items and work completely offline.
            </p>
          </div>

          <div className="mt-6 text-center border-t border-zinc-700 pt-6">
            <p className="text-zinc-400 text-sm mb-3">
              Using desktop?{' '}
              <a
                href="/login"
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                data-testid="link-desktop-login"
              >
                Desktop Login
              </a>
            </p>
          </div>

          <div className="mt-10 text-center">
            <img src={companyLogoUrl} alt="Country Connect" className="h-12 mx-auto" />
          </div>
        </div>
      </div>

      <div className="p-6 text-center">
        <p className="text-xs text-zinc-600">
          Field App v1.0 • Secure offline work
        </p>
      </div>
    </div>
  );
}
