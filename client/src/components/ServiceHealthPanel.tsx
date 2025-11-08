import { useQuery } from '@tanstack/react-query';
import { Wifi, CreditCard, BarChart3, AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ServiceHealthProps {
  customerId: string;
}

interface HealthData {
  connection: {
    status: 'good' | 'warning' | 'error' | 'unknown';
    detail: string;
    ipAddress: string;
    lastSeen: string;
  };
  billing: {
    status: 'good' | 'warning' | 'error' | 'unknown';
    detail: string;
    balance: number;
    nextDue: string;
  };
  usage: {
    status: 'good' | 'warning' | 'error' | 'unknown';
    detail: string;
    percentage: number;
    planLimit: string;
  };
  overall: {
    status: 'good' | 'warning' | 'error' | 'unknown';
  };
}

function HealthIndicator({ 
  icon: Icon, 
  label, 
  status, 
  detail, 
  tooltip 
}: { 
  icon: any; 
  label: string; 
  status: string; 
  detail: string; 
  tooltip: string;
}) {
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'good': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-3 h-3 text-amber-600" />;
      case 'error': return <XCircle className="w-3 h-3 text-red-600" />;
      default: return <HelpCircle className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'good': return 'text-green-700 bg-green-50 border-green-200';
      case 'warning': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center justify-between p-1.5 rounded-sm border transition-colors ${getStatusColor(status)} hover:shadow-sm cursor-help`}>
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Icon className="w-2.5 h-2.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[10px] truncate">{label}</div>
                <div className="text-[9px] opacity-75 truncate">{detail}</div>
              </div>
            </div>
            <div className="flex-shrink-0 ml-1">
              {getStatusIcon(status)}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs mt-1">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ServiceHealthPanel({ customerId }: ServiceHealthProps) {
  // Don't render if no valid customer ID
  if (!customerId || customerId === '0' || customerId === 'undefined') {
    return (
      <div className="bg-white rounded-lg border p-2 mb-4">
        <h3 className="font-medium text-[10px] mb-2 flex items-center gap-1">
          <BarChart3 className="w-2.5 h-2.5" />
          Service Health
        </h3>
        <div className="text-center py-4">
          <XCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-600">No customer associated</p>
        </div>
      </div>
    );
  }

  const { data: healthData, isLoading, error } = useQuery<HealthData>({
    queryKey: ['/api/service-health', customerId],
    queryFn: async () => {
      console.log(`Fetching service health for customer ID: ${customerId}`);
      
      // Add timeout for mobile devices
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(`/api/service-health/${customerId}`, {
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        console.log(`Service health response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Service health API error: ${response.status} - ${errorText}`);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Service health data received:', data);
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
    },
    enabled: !!customerId && customerId !== '0',
    refetchInterval: false, // DISABLE automatic refetching
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    staleTime: 15 * 60 * 1000, // 15 minutes - much longer cache
    retry: (failureCount, error) => {
      // Don't retry on timeout errors
      if (error.message.includes('timeout')) return false;
      // Only retry once for other errors
      return failureCount < 1;
    },
    retryDelay: 2000, // 2 second delay between retries
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-4 mb-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2" />
          Service Health
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <div className="space-y-1">
                    <div className="w-12 h-2 bg-gray-300 rounded"></div>
                    <div className="w-16 h-1.5 bg-gray-300 rounded"></div>
                  </div>
                </div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !healthData) {
    const errorMessage = error instanceof Error ? error.message : 'Service health unavailable';
    const isTimeoutError = errorMessage.includes('timeout');
    const isConnectionError = errorMessage.includes('Failed to fetch') || errorMessage.includes('Network error');
    
    return (
      <div className="bg-white rounded-lg border p-4 mb-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2" />
          Service Health
        </h3>
        <div className="text-center py-4">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600 mb-2">
            {isTimeoutError ? 'Request timed out' : 
             isConnectionError ? 'Connection failed' : 
             'Service health unavailable'}
          </p>
          <p className="text-xs text-gray-500">
            {isTimeoutError ? 'Please check your connection and try again' :
             isConnectionError ? 'Unable to connect to server' :
             'Service information temporarily unavailable'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-2 mb-4">
      <h3 className="font-medium text-[10px] mb-2 flex items-center gap-1">
        <BarChart3 className="w-2.5 h-2.5" />
        Service Health
      </h3>
      
      <div className="space-y-2">
        <HealthIndicator 
          icon={Wifi}
          label="Connection"
          status={healthData.connection.status}
          detail={healthData.connection.detail}
          tooltip={`Service status and connectivity. IP Address: ${healthData.connection.ipAddress}. Last seen: ${healthData.connection.lastSeen}`}
        />
        
        <HealthIndicator 
          icon={CreditCard}
          label="Billing"
          status={healthData.billing.status}
          detail={healthData.billing.detail}
          tooltip={`Account balance and payment status. Current balance: £${healthData.billing.balance.toFixed(2)}. Next due: ${healthData.billing.nextDue}`}
        />
        
        <HealthIndicator 
          icon={BarChart3}
          label="Usage"
          status={healthData.usage.status}
          detail={healthData.usage.detail}
          tooltip={`Data usage compared to plan limits. Plan limit: ${healthData.usage.planLimit}. Current usage: ${healthData.usage.percentage}%`}
        />
      </div>

      {/* Overall Status Indicator */}
      <div className="mt-4 pt-3 border-t">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Overall Status</span>
          <div className="flex items-center space-x-1">
            {healthData.overall.status === 'good' && (
              <>
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-green-700 font-medium">All Good</span>
              </>
            )}
            {healthData.overall.status === 'warning' && (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="text-amber-700 font-medium">Attention</span>
              </>
            )}
            {healthData.overall.status === 'error' && (
              <>
                <XCircle className="w-3 h-3 text-red-600" />
                <span className="text-red-700 font-medium">Issues Found</span>
              </>
            )}
            {healthData.overall.status === 'unknown' && (
              <>
                <HelpCircle className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600 font-medium">Unknown</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}