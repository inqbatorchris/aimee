import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function MultiTabWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [tabCount, setTabCount] = useState(1);

  useEffect(() => {
    // Use localStorage to track multiple tabs
    const tabId = Math.random().toString(36).substr(2, 9);
    const storageKey = 'active_tabs';
    const heartbeatKey = 'tab_heartbeat';
    
    // Get existing tabs
    const existingTabs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updatedTabs = [...existingTabs, tabId];
    localStorage.setItem(storageKey, JSON.stringify(updatedTabs));
    
    // Set up heartbeat to keep track of active tabs
    const heartbeat = setInterval(() => {
      const now = Date.now();
      localStorage.setItem(`${heartbeatKey}_${tabId}`, now.toString());
      
      // Clean up old tabs and count active ones
      const allTabs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const activeTabs = allTabs.filter((id: string) => {
        const lastHeartbeat = parseInt(localStorage.getItem(`${heartbeatKey}_${id}`) || '0');
        return (now - lastHeartbeat) < 10000; // 10 seconds
      });
      
      // Update active tabs list
      localStorage.setItem(storageKey, JSON.stringify(activeTabs));
      setTabCount(activeTabs.length);
      setShowWarning(activeTabs.length > 1);
    }, 5000);
    
    // Initial heartbeat
    localStorage.setItem(`${heartbeatKey}_${tabId}`, Date.now().toString());
    
    // Cleanup on unmount
    return () => {
      clearInterval(heartbeat);
      const tabs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filteredTabs = tabs.filter((id: string) => id !== tabId);
      localStorage.setItem(storageKey, JSON.stringify(filteredTabs));
      localStorage.removeItem(`${heartbeatKey}_${tabId}`);
    };
  }, []);

  if (!showWarning) return null;

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription>
        <span className="text-orange-800">
          <strong>Multiple tabs detected ({tabCount} active)</strong> - This can cause excessive API requests to Splynx. 
          Please close other tabs to prevent system overload.
        </span>
      </AlertDescription>
    </Alert>
  );
}