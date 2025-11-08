/**
 * Field App Login Screen
 * Uses existing JWT authentication
 */

import { useState } from 'react';
import { fieldDB } from '@/lib/field-app/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
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
      // Use existing auth endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save session to IndexedDB
      const session = {
        token: data.token,
        userId: data.user.id,
        email: data.user.email,
        organizationId: data.user.organizationId,
        downloadedAt: new Date()
      };

      await fieldDB.saveSession(session);
      
      // Store token in localStorage for API calls
      localStorage.setItem('authToken', data.token);
      
      onSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-zinc-900 text-white flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="p-6 pb-8">
        <div className="mb-8">
          <img src={logoUrl} alt="Country Connect" className="h-[49px]" />
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 px-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base"
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

        {/* Back to Web Login Link */}
        <div className="mt-4 text-center">
          <a
            href="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-2"
          >
            ← Back to Web Login
          </a>
        </div>

        {/* Company Logo */}
        <div className="mt-8 text-center">
          <img src={companyLogoUrl} alt="Country Connect" className="h-12 mx-auto" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center text-xs text-zinc-500">
        Field App v1.0 • Secure offline work
      </div>
    </div>
  );
}