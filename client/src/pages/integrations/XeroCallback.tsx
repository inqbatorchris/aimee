import { useEffect, useState } from 'react';
import { useLocation as useWouterLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

export default function XeroCallback() {
  const [, setLocation] = useWouterLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing Xero connection...');
  const { loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (authLoading) {
      setMessage('Authenticating...');
      return;
    }

    if (!isAuthenticated) {
      console.error('User not authenticated for OAuth callback');
      setStatus('error');
      setMessage('Authentication required. Please log in and try again.');
      setTimeout(() => {
        setLocation('/integrations/xero/setup');
      }, 3000);
      return;
    }

    const handleCallback = async () => {
      try {
        setMessage('Completing Xero connection...');
        
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (!code) {
          throw new Error('No authorization code received from Xero');
        }

        const clientId = localStorage.getItem('xero_client_id');
        const clientSecret = localStorage.getItem('xero_client_secret');

        if (!clientId || !clientSecret) {
          throw new Error('OAuth credentials not found. Please restart the connection process.');
        }

        console.log('Calling Xero OAuth callback with authenticated user');
        const response = await apiRequest('/api/finance/xero/oauth/callback', {
          method: 'POST',
          body: {
            code,
            clientId,
            clientSecret,
            redirectUri: `${window.location.origin}/integrations/xero/callback`,
          },
        });

        const data = await response.json();
        console.log('OAuth callback successful:', data);

        localStorage.removeItem('xero_client_id');
        localStorage.removeItem('xero_client_secret');

        await queryClient.invalidateQueries({ queryKey: ['/api/finance/xero/status'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });

        setStatus('success');
        setMessage('Xero connected successfully!');
        
        setTimeout(() => {
          setLocation('/finance');
        }, 2000);
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        
        if (error.status === 401) {
          setMessage('Authentication failed. Please log in and try again.');
        } else {
          setMessage(error.message || 'Failed to complete Xero connection');
        }
        
        setStatus('error');
        
        localStorage.removeItem('xero_client_id');
        localStorage.removeItem('xero_client_secret');
        
        setTimeout(() => {
          setLocation('/integrations/xero/setup');
        }, 3000);
      }
    };

    handleCallback();
  }, [setLocation, authLoading, isAuthenticated]);

  return (
    <div className="container mx-auto p-6 max-w-2xl flex items-center justify-center min-h-screen">
      <Card className="p-8 text-center w-full">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Connecting to Xero</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold mb-2">Success!</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to Financial Dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Connection Failed</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting back to setup...
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
