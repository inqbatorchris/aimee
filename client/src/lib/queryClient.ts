import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone response to avoid consuming it
    const responseClone = res.clone();
    
    // Try to parse JSON error message first
    let errorMessage = res.statusText;
    try {
      const errorData = await responseClone.json();
      errorMessage = errorData.message || errorData.error || res.statusText;
    } catch {
      // If not JSON, use text
      try {
        errorMessage = await responseClone.text() || res.statusText;
      } catch {
        errorMessage = res.statusText;
      }
    }
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  const method = options?.method || 'GET';
  
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {
    ...(options?.headers || {}),
  };
  
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Debug feature requests in development
  if (url.includes('/api/features') && import.meta.env.DEV) {
    console.log('=== FEATURE API DEBUG ===');
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Token present:', !!token);
    console.log('Headers:', headers);
    console.log('Body:', options?.body);
  }

  // Add debugging for AI requests
  if (url.includes('/ai/generate-response')) {
    console.log('=== AI API REQUEST DEBUG ===');
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Token from localStorage:', token);
    console.log('Headers:', headers);
    console.log('Body:', options?.body);
    console.log('Body stringified:', options?.body ? JSON.stringify(options.body) : 'none');
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    // Prevent password managers from treating API calls as login forms
    cache: "no-cache",
    mode: "cors",
  });

  // Add debugging for AI responses
  if (url.includes('/ai/generate-response')) {
    console.log('=== API RESPONSE DEBUG ===');
    console.log('Status:', res.status);
    console.log('Status Text:', res.statusText);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    
    // Clone response to read text without consuming it
    const responseClone = res.clone();
    const responseText = await responseClone.text();
    console.log('Response text (first 200 chars):', responseText.substring(0, 200));
  }

  // Debug feature responses in development
  if (url.includes('/api/features') && import.meta.env.DEV) {
    console.log('=== FEATURE API RESPONSE ===');
    console.log('Status:', res.status);
    console.log('Status Text:', res.statusText);
    if (!res.ok) {
      const responseClone = res.clone();
      const responseText = await responseClone.text();
      console.log('Error Response:', responseText);
    }
  }

  // Clone response before checking if it's OK
  const responseForCheck = res.clone();
  await throwIfResNotOk(responseForCheck);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build URL with query parameters from queryKey[1]
    let fullUrl = url;
    if (queryKey[1] && typeof queryKey[1] === 'object') {
      const params = new URLSearchParams();
      Object.entries(queryKey[1]).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          params.append(key, String(value));
        }
      });
      const paramString = params.toString();
      if (paramString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + paramString;
      }
    }

    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch when component mounts if data exists
      refetchOnReconnect: false, // Don't refetch when network reconnects
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
