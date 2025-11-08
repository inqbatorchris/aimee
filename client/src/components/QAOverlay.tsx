import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Copy, Bug } from 'lucide-react';
import { useLocation } from 'wouter';

interface APICall {
  method: string;
  path: string;
  status: number;
  took: number;
  requestBody?: string;
  responseBody?: string;
  timestamp: number;
}

// Global API call interceptor
const apiCalls: APICall[] = [];

// Intercept fetch to track API calls
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const startTime = Date.now();
    const [url, options] = args;
    const method = options?.method || 'GET';
    const path = typeof url === 'string' ? url.replace(window.location.origin, '') : '';
    
    // Only track API calls
    if (!path.startsWith('/api')) {
      return originalFetch(...args);
    }
    
    let requestBody = '';
    if (options?.body) {
      try {
        requestBody = typeof options.body === 'string' 
          ? options.body 
          : JSON.stringify(options.body);
      } catch {
        requestBody = '[Binary Data]';
      }
    }
    
    try {
      const response = await originalFetch(...args);
      const took = Date.now() - startTime;
      
      // Clone response to read body
      const clonedResponse = response.clone();
      let responseBody = '';
      
      try {
        const text = await clonedResponse.text();
        responseBody = text.substring(0, 200);
      } catch {
        responseBody = '[Could not read response]';
      }
      
      const apiCall: APICall = {
        method,
        path,
        status: response.status,
        took,
        requestBody: requestBody.substring(0, 200),
        responseBody,
        timestamp: Date.now(),
      };
      
      apiCalls.unshift(apiCall);
      if (apiCalls.length > 10) {
        apiCalls.length = 10; // Keep only last 10
      }
      
      // Trigger update for any mounted QAOverlay components
      window.dispatchEvent(new CustomEvent('qa-api-call', { detail: apiCall }));
      
      return response;
    } catch (error) {
      const apiCall: APICall = {
        method,
        path,
        status: 0,
        took: Date.now() - startTime,
        requestBody: requestBody.substring(0, 200),
        responseBody: error instanceof Error ? error.message : 'Network error',
        timestamp: Date.now(),
      };
      
      apiCalls.unshift(apiCall);
      if (apiCalls.length > 10) {
        apiCalls.length = 10;
      }
      
      window.dispatchEvent(new CustomEvent('qa-api-call', { detail: apiCall }));
      throw error;
    }
  };
}

export default function QAOverlay() {
  const [location] = useLocation();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [calls, setCalls] = useState<APICall[]>([]);
  
  // Check if QA mode is enabled
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const qaParam = params.get('qa') === '1';
    const qaStorage = localStorage.getItem('qa') === 'on';
    setIsEnabled(qaParam || qaStorage);
  }, [location]);
  
  // Listen for API calls
  useEffect(() => {
    const handleAPICall = () => {
      setCalls([...apiCalls]);
    };
    
    window.addEventListener('qa-api-call', handleAPICall);
    return () => {
      window.removeEventListener('qa-api-call', handleAPICall);
    };
  }, []);
  
  const copySummary = () => {
    const summary = calls.map(call => 
      `${call.method} ${call.path} - ${call.status} (${call.took}ms)\n` +
      `Request: ${call.requestBody || 'None'}\n` +
      `Response: ${call.responseBody || 'None'}\n`
    ).join('\n---\n');
    
    navigator.clipboard.writeText(summary);
  };
  
  const toggleQA = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('qa', newState ? 'on' : 'off');
  };
  
  if (!isEnabled) {
    return null;
  }
  
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Bug className="h-4 w-4 mr-2" />
          QA
        </Button>
      </div>
    );
  }
  
  return (
    <Card className="fixed bottom-4 right-4 w-[500px] max-h-[400px] z-[9999] shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bug className="h-4 w-4" />
          QA Overlay - API Calls
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copySummary}
            disabled={calls.length === 0}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[300px] overflow-y-auto">
          {calls.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No API calls yet
            </div>
          ) : (
            <div className="divide-y">
              {calls.map((call, index) => (
                <div key={index} className="p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">
                      <span className={`font-bold ${
                        call.status >= 200 && call.status < 300 ? 'text-green-600' :
                        call.status >= 400 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {call.method}
                      </span>{' '}
                      {call.path}
                    </span>
                    <span className="text-muted-foreground">
                      {call.status} ({call.took}ms)
                    </span>
                  </div>
                  {call.requestBody && (
                    <div className="text-muted-foreground">
                      <span className="font-semibold">Req:</span> {call.requestBody}
                    </div>
                  )}
                  {call.responseBody && (
                    <div className="text-muted-foreground">
                      <span className="font-semibold">Res:</span> {call.responseBody}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}