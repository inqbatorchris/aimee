/**
 * Field App - Main Entry Point
 * Mobile-first PWA for field workers
 */

import { useEffect, useState } from 'react';
import { Route, Switch, useLocation, Redirect } from 'wouter';
import { fieldDB } from '@/lib/field-app/db';
import Login from './Login';
import Download from './Download';
import WorkList from './WorkList';
import WorkDetail from './WorkDetail';
import Sync from './Sync';
import { Button } from '@/components/ui/button';
import { Switch as ToggleSwitch } from '@/components/ui/switch';
import { Home, Download as DownloadIcon, RefreshCw, User, WifiOff, Wifi } from 'lucide-react';

export default function FieldApp() {
  const [location, setLocation] = useLocation();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workMode, setWorkMode] = useState<'online' | 'offline'>('offline'); // Default to offline mode
  const [stats, setStats] = useState<any>(null);
  const [actualNetworkStatus, setActualNetworkStatus] = useState(navigator.onLine); // For display only

  // Initialize DB and check session
  useEffect(() => {
    const init = async () => {
      try {
        await fieldDB.init();
        const savedSession = await fieldDB.getSession();
        setSession(savedSession);
        
        // Load saved work mode from settings
        const settings = await fieldDB.getSettings();
        if (settings) {
          setWorkMode(settings.workMode);
          console.log('[FieldApp] Loaded work mode:', settings.workMode);
        } else {
          // First time - save default offline mode
          await fieldDB.saveSettings({ 
            workMode: 'offline', 
            lastChanged: new Date() 
          });
          console.log('[FieldApp] Initialized work mode: offline');
        }
        
        // Load stats
        const dbStats = await fieldDB.getStats();
        setStats(dbStats);
        
        // Register service worker for PWA support
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/field-sw.js', {
              scope: '/field-app'
            });
            console.log('Field App Service Worker registered:', registration);
            
            // Prevent automatic page reload on service worker update
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              console.log('[FieldApp] Service worker updated, but NOT reloading page');
            });
          } catch (error) {
            console.error('Service Worker registration failed:', error);
          }
        }
        
        // Add manifest link
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          manifestLink.setAttribute('href', '/field-manifest.json');
        }
      } catch (error) {
        console.error('Failed to initialize field app:', error);
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  // Monitor actual network status (for display only, doesn't control functionality)
  useEffect(() => {
    const handleOnline = () => setActualNetworkStatus(true);
    const handleOffline = () => setActualNetworkStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const dbStats = await fieldDB.getStats();
      setStats(dbStats);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fieldDB.clearSession();
    setSession(null);
    setLocation('/field-app/login');
  };
  
  // Manual mode toggle handler
  const handleModeToggle = async (checked: boolean) => {
    const newMode: 'online' | 'offline' = checked ? 'online' : 'offline';
    setWorkMode(newMode);
    await fieldDB.saveSettings({ 
      workMode: newMode, 
      lastChanged: new Date() 
    });
    console.log('[FieldApp] Work mode changed to:', newMode);
  };

  if (loading) {
    return (
      <div className="h-screen bg-zinc-900 text-white flex items-center justify-center" style={{ height: '100dvh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p>Loading Field App...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show login
  if (!session) {
    return (
      <div className="h-screen bg-zinc-900" style={{ height: '100dvh' }}>
        <Switch>
          <Route path="/field-app/login">
            {() => <Login onSuccess={(s) => { setSession(s); setLocation('/field-app'); }} />}
          </Route>
          <Route>
            <Redirect to="/field-app/login" />
          </Route>
        </Switch>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-900 text-white flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header - with safe area inset for iOS notch/status bar in PWA mode */}
      <header className="bg-zinc-800 border-b border-zinc-700 px-4 flex-shrink-0" style={{ 
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: '0.75rem'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#ffffff] mt-[8px] mb-[8px]">
              {session.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Actual network status (display only) */}
            <div className="text-xs text-[#ffffff]">
              WAN: {actualNetworkStatus ? '🟢' : '🔴'}
            </div>
            
            {/* Manual work mode toggle */}
            <div className="flex items-center gap-2">
              <ToggleSwitch
                checked={workMode === 'online'}
                onCheckedChange={handleModeToggle}
                className="data-[state=checked]:bg-emerald-600"
              />
              <div className={`flex items-center gap-1 text-xs ${
                workMode === 'online' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {workMode === 'online' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {workMode === 'online' ? 'Online' : 'Offline'}
              </div>
            </div>
            
            {/* Stats badge */}
            {stats?.pendingSync > 0 && (
              <div className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-xs">
                {stats.pendingSync} pending
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          {/* Home - Work List */}
          <Route path="/field-app">
            {() => <WorkList stats={stats} />}
          </Route>
          
          {/* Download - Select & Download Work Items */}
          <Route path="/field-app/download">
            {() => workMode === 'online' ? (
              <Download 
                session={session} 
                onComplete={() => setLocation('/field-app')} 
              />
            ) : (
              <div className="p-4 text-center">
                <WifiOff className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                <p className="text-zinc-400 mb-4">Switch to Online Mode to download work items</p>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/field-app')}
                  className="bg-zinc-800 border-zinc-700"
                >
                  Go Back
                </Button>
              </div>
            )}
          </Route>
          
          {/* Work Detail - View/Edit Work Item */}
          <Route path="/field-app/work/:id">
            {(params) => <WorkDetail workItemId={parseInt(params.id)} />}
          </Route>
          
          {/* Sync - Manual Sync */}
          <Route path="/field-app/sync">
            {() => workMode === 'online' ? (
              <Sync 
                session={session}
                onComplete={() => setLocation('/field-app')} 
              />
            ) : (
              <div className="p-4 text-center">
                <WifiOff className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                <p className="text-zinc-400 mb-4">Switch to Online Mode to sync changes</p>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/field-app')}
                  className="bg-zinc-800 border-zinc-700"
                >
                  Go Back
                </Button>
              </div>
            )}
          </Route>
        </Switch>
      </main>
      {/* Bottom Navigation - with safe area inset for iOS home indicator in PWA mode */}
      <nav className="bg-zinc-800 border-t border-zinc-700 flex-shrink-0" style={{
        paddingBottom: 'max(0, env(safe-area-inset-bottom))'
      }}>
        <div className="flex">
          <button
            onClick={() => setLocation('/field-app')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              location === '/field-app' ? 'text-emerald-400' : 'text-zinc-400'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Work</span>
          </button>
          
          <button
            onClick={() => setLocation('/field-app/download')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              location === '/field-app/download' ? 'text-emerald-400' : 'text-zinc-400'
            }`}
            disabled={workMode !== 'online'}
          >
            <DownloadIcon className="h-5 w-5" />
            <span className="text-xs">Download</span>
          </button>
          
          <button
            onClick={() => setLocation('/field-app/sync')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors relative ${
              location === '/field-app/sync' ? 'text-emerald-400' : 'text-zinc-400'
            }`}
            disabled={workMode !== 'online'}
          >
            <RefreshCw className="h-5 w-5" />
            <span className="text-xs">Sync</span>
            {stats?.pendingSync > 0 && (
              <span className="absolute top-2 right-1/2 translate-x-3 h-2 w-2 bg-amber-400 rounded-full"></span>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="flex-1 py-3 flex flex-col items-center gap-1 text-zinc-400"
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Account</span>
          </button>
        </div>
      </nav>
    </div>
  );
}