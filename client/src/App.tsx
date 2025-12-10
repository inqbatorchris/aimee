import { Switch, Route, useLocation, Link } from "wouter";
import { useEffect, useState, lazy, Suspense } from "react";
import React from "react";

// ============================================================================
// PRE-AUTH PAGES - Eager loaded (shown before login)
// ============================================================================
import Login from "@/pages/auth/LoginPage";
import ForgotPassword from "@/pages/auth/ForgotPasswordPage";
import ResetPassword from "@/pages/auth/ResetPasswordPage";
import MarketingLanding from "@/pages/MarketingLanding";

// ============================================================================
// SHARED COMPONENTS - Eager loaded (used across all contexts)
// ============================================================================
import UserDropdown from "@/components/UserDropdown";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { NavigationProvider } from "@/components/Navigation/NavigationProvider";
import { NavigationSidebar, MobileMenuTrigger } from "@/components/Navigation/NavigationSidebar";
import { AddToBacklogButton } from "@/components/AddToBacklogButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import MobileUserMenu from "@/components/MobileUserMenu";
import CycleDateIndicator from "@/components/CycleDateIndicator";
import { BrandLogo } from "@/components/BrandLogo";
import { clearAuthState } from "@/utils/clearAuth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import QAOverlay from "@/components/QAOverlay";
import { AIAssistantButton } from "@/components/AIAssistant/AIAssistantButton";

// ============================================================================
// FIELD APP - Lazy loaded (only for field workers)
// ============================================================================
const FieldApp = lazy(() => import("@/pages/field-app"));

// ============================================================================
// AUTHENTICATED PORTAL PAGES - Lazy loaded (only after login)
// ============================================================================
// Customer & Support Management
const SupportTickets = lazy(() => import("@/pages/SupportTicketsFixed"));
const CustomerManagement = lazy(() => import("@/pages/CustomerManagement"));
const CustomerMapping = lazy(() => import("@/pages/CustomerMapping"));
const FiberNetwork = lazy(() => import("@/pages/FiberNetwork"));
const ChamberWorkflow = lazy(() => import("@/pages/ChamberWorkflow"));
const Addresses = lazy(() => import("@/pages/Addresses"));

// User Management
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const OriginalUserProfile = lazy(() => import("@/pages/UserProfile"));

// Settings & Tools
const Settings = lazy(() => import("@/pages/core/Settings"));
const DevTools = lazy(() => import("@/pages/DevTools"));
const ManagedServices = lazy(() => import("@/pages/ManagedServices"));

// Training & Knowledge Base
const Training = lazy(() => import("@/pages/Training"));
const DocumentEditor = lazy(() => import("@/pages/KnowledgeBase/DocumentEditor"));
const KnowledgeBaseListing = lazy(() => import("@/pages/KnowledgeBase/KnowledgeBaseListing"));
const DocumentView = lazy(() => import("@/pages/KnowledgeBase/DocumentView"));
const TrainingModuleEditor = lazy(() => import("@/pages/KnowledgeBase/TrainingModuleEditor"));
const SprintDetails = lazy(() => import("@/pages/SprintDetails"));

// Dynamic Pages
const DynamicPage = lazy(() => import('@/pages/DynamicPage'));
const MyDay = lazy(() => import("@/pages/MyDay"));
const DynamicMyDay = lazy(() => import("@/pages/DynamicMyDay"));
const ThemeEditor = lazy(() => import("@/pages/ThemeEditor"));
const ComingSoon = lazy(() => import("@/pages/ComingSoon"));
const OrganizationSettings = lazy(() => import("@/pages/OrganizationSettings"));

// Strategy Pages
const StrategyDashboard = lazy(() => import("@/pages/StrategyDashboard"));
const StrategyCheckin = lazy(() => import("@/pages/StrategyCheckin"));
const StrategySetup = lazy(() => import("@/pages/StrategySetup"));
const MissionVision = lazy(() => import("@/pages/strategy/MissionVision"));
const StrategyManagement = lazy(() => import("@/pages/StrategyManagement"));
const CycleManagement = lazy(() => import("@/pages/strategy/CheckInDashboard"));
const MeetingFeedback = lazy(() => import("@/pages/strategy/MeetingFeedback"));
const StrategyRisks = lazy(() => import("@/pages/StrategyRisks"));
const StrategyAlignment = lazy(() => import("@/pages/StrategyAlignment"));
const StrategyInitiatives = lazy(() => import("@/pages/StrategyInitiatives"));
const CycleDetailView = lazy(() => import("@/pages/CycleDetailView"));
const CheckInMeeting = lazy(() => import("@/pages/CheckInMeeting"));
const Objectives = lazy(() => import("@/pages/strategy/Objectives"));
const StrategyTasks = lazy(() => import("@/pages/strategy/Tasks"));
const WorkItems = lazy(() => import("@/pages/strategy/WorkItems"));
const StrategySettings = lazy(() => import("@/pages/strategy/StrategySettings"));
const TemplateWorkItemView = lazy(() => import("@/components/work-items/TemplateWorkItemView"));

// Integration Pages
const SplynxSetup = lazy(() => import("@/pages/integrations/SplynxSetup"));
const SplynxAgents = lazy(() => import("@/pages/integrations/SplynxAgents"));
const PXCSetup = lazy(() => import("@/pages/integrations/PXCSetup"));
const GoogleMapsSetup = lazy(() => import("@/pages/integrations/GoogleMapsSetup"));
const FirebaseSetup = lazy(() => import("@/pages/integrations/FirebaseSetup"));
const AirtableSetup = lazy(() => import("@/pages/integrations/AirtableSetup"));
const XeroSetup = lazy(() => import("@/pages/integrations/XeroSetup"));
const XeroCallback = lazy(() => import("@/pages/integrations/XeroCallback"));
const VapiSetup = lazy(() => import("@/pages/integrations/VapiSetup"));
const AITicketDraftingSetup = lazy(() => import("@/pages/integrations/AITicketDraftingSetup"));
const WebhookManager = lazy(() => import("@/pages/integrations/WebhookManager"));
const AirtableTableView = lazy(() => import("@/pages/data/AirtableTableView"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const FinanceDashboard = lazy(() => import("@/pages/finance/FinanceDashboard"));
const Transactions = lazy(() => import("@/pages/finance/Transactions"));
const ProfitCenters = lazy(() => import("@/pages/finance/ProfitCenters"));
const ChartOfAccounts = lazy(() => import("@/pages/finance/ChartOfAccounts"));
const OkrAnalysis = lazy(() => import("@/pages/finance/OkrAnalysis"));
const VapiPerformanceDashboard = lazy(() => import("@/pages/VapiPerformanceDashboard"));

// Agent & Workflow Pages
const AgentBuilder = lazy(() => import("@/pages/AgentBuilder"));
const AgentWorkflowEdit = lazy(() => import("@/pages/agents/AgentWorkflowEdit"));
const TemplateList = lazy(() => import("@/pages/templates/TemplateList"));
const TemplateEdit = lazy(() => import("@/pages/templates/TemplateEdit"));

// Admin Pages
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdminDashboard"));

// Developer Tools
const DeveloperDocumentation = lazy(() => import("@/pages/dev-tools/DeveloperDocumentation"));
const DevToolsPages = lazy(() => import("@/pages/dev-tools/DevToolsPages"));
const DevToolsMenu = lazy(() => import("@/pages/dev-tools/DevToolsMenu"));
const DevToolsFeatures = lazy(() => import("@/pages/dev-tools/DevToolsFeatures"));

// Core Pages
const CoreThemeEditor = lazy(() => import("@/pages/core/CoreThemeEditor"));
const PeopleAndTeams = lazy(() => import("@/pages/core/PeopleAndTeams"));
const CoreAccountSettings = lazy(() => import("@/pages/core/AccountSettings"));
const CoreDevTools = lazy(() => import("@/pages/core/DevTools"));

// AI Assistant
const AIAssistantSettings = lazy(() => import("@/pages/AIAssistantSettings"));

// Settings Pages
const CalendarPage = lazy(() => import("@/pages/settings/CalendarPage"));
const CalendarSettingsPage = lazy(() => import("@/pages/settings/CalendarSettingsPage"));

// Create a wrapper component to handle errors
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('Error boundary caught:', error);
    // Clear auth state on React Context corruption
    if (error.message?.includes('useRef') || 
        error.message?.includes('null') || 
        error.message?.includes('Invalid hook call') ||
        error.message?.includes('TooltipProvider')) {
      console.warn('React Context corruption detected, clearing auth state');
      clearAuthState();
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-4">Application Error</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Authentication state has been cleared.
            </p>
            <button
              onClick={() => {
                clearAuthState();
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  // Clear any corrupted auth state on app startup
  useEffect(() => {
    try {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      
      // Validate stored data structure
      if (user) {
        JSON.parse(user); // This will throw if invalid JSON
      }
    } catch (error) {
      console.warn('Corrupted auth data detected, clearing:', error);
      clearAuthState();
    }
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            {/* NavigationProvider - Restored for sidebar functionality */}
            <NavigationProvider>
              <AppContent />
            </NavigationProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const { currentUser, isAuthenticated, loading, logout } = useAuth();
  const { loadThemeForOrg } = useTheme();

  // Load theme when user is authenticated
  useEffect(() => {
    if (!loading) {
      if (currentUser && currentUser.organizationId) {
        // Load theme for authenticated user
        loadThemeForOrg(currentUser.organizationId);
      } else {
        // No user, show page with default theme
        document.documentElement.classList.remove('theme-loading');
        document.documentElement.classList.add('theme-loaded');
      }
    }
  }, [loading, currentUser?.organizationId, loadThemeForOrg]);

  // Save last visited path (except auth pages, field app, and public booking pages)
  useEffect(() => {
    if (isAuthenticated && !loading) {
      // Don't save auth-related paths, field app routes, or public booking pages
      const authPaths = ['/login', '/forgot-password', '/reset-password', '/'];
      const currentPath = location.split('?')[0];
      const isExcludedPath = authPaths.includes(currentPath) || 
        currentPath.startsWith('/field-app') || 
        currentPath.startsWith('/book/') || 
        currentPath.startsWith('/public/bookings');
      if (!isExcludedPath) {
        localStorage.setItem('lastVisitedPath', location);
      }
    }
  }, [location, isAuthenticated, loading]);

  // Add error recovery and debug logging
  useEffect(() => {
    console.log('App state:', { loading, isAuthenticated, location });
    
    // X button remover and diagnostic completely disabled to eliminate debug overlays
    
    // If stuck in loading state for too long, force clear
    const timeout = setTimeout(() => {
      if (loading) {
        console.error('Authentication stuck in loading state, clearing');
        clearAuthState();
        setLocation('/login');
      }
    }, 5000); // 5 second timeout

    return () => {
      clearTimeout(timeout);
    };
  }, [loading, isAuthenticated, location]);

  // Get page title based on current route
  const getPageTitle = () => {
    switch (location) {
      // Main Dashboard
      case '/':
      case '/my-day':
        return 'My Day';
      
      // Strategy & OKRs
      case '/strategy/mission':
        return 'Mission & Vision';
      
      // Projects & Tasks
      case '/projects/board':
        return 'Project Board';
      case '/projects/tasks':
        return 'Task List';
      case '/projects/calendar':
        return 'Calendar View';
      
      // Tools & Agents
      case '/tools/automation':
        return 'Automation Tools';
      case '/tools/agents':
        return 'AI Agents';
      case '/tools/routines':
        return 'Routines';
      case '/tools/logs':
        return 'Observability';
      
      // Help Desk
      case '/helpdesk/tickets':
        return 'Support Tickets';
      case '/helpdesk/knowledge':
        return 'Knowledge Base';
      case '/helpdesk/ai-assistant':
        return 'AI Assistant';
      
      
      // Composable Features
      case '/features/site-builder':
        return 'AI Site Builder';
      case '/features/crm':
        return 'CRM';
      case '/features/ecommerce':
        return 'E-commerce';
      case '/features/library':
        return 'Feature Library';
      
      // Administration
      case '/admin/organization':
        return 'Organization Settings';
      case '/admin/users':
        return 'Users & Roles';
      case '/admin/theme':
        return 'Theme Editor';
      case '/admin/integrations':
        return 'Integrations';
      case '/dev-tools':
        return 'Developer Tools';
      
      // Legacy routes (keep for compatibility)
      case '/admin':
        return 'Admin Dashboard';
      case '/admin/customers':
        return 'Customer Management';
      case '/admin/customer-mapping':
        return 'Customer Location Mapping';
      case '/field-engineering/customer-mapping':
        return 'Customer Location Mapping';
      case '/field-engineering/fiber-network':
        return 'Fiber Network';
      case '/admin/support':
        return 'Support Tickets';
      case '/admin/ai-settings':
        return 'AI Settings';
      case '/profile':
        return 'User Profile';
      case '/account-settings':
        return 'Account Settings';
      
      default:
        return 'My Day';
    }
  };

  const handleLogout = async () => {
    await logout();
  };



  // Handle authentication redirects - MUST be before any conditional returns
  useEffect(() => {
    // Only redirect to login if auth is fully initialized and user is not authenticated
    if (!loading && !isAuthenticated && !localStorage.getItem('authToken')) {
      // Allow public routes without authentication (including field app and booking pages)
      const publicRoutes = ['/', '/login', '/forgot-password', '/reset-password', '/register'];
      const isPublicRoute = publicRoutes.some(route => 
        location === route || location.startsWith('/reset-password/') || location.startsWith('/field-app') || location.startsWith('/book/') || location.startsWith('/public/bookings')
      );
      
      // Only redirect to landing page if not already on a public route
      if (!isPublicRoute) {
        setLocation('/');
      }
    }
    
    // Handle post-auth redirect from login page (but not field app)
    if (!loading && isAuthenticated && !location.startsWith('/field-app')) {
      const authRoutes = ['/login', '/forgot-password', '/reset-password', '/register', '/'];
      const isAuthRoute = authRoutes.some(route => 
        location === route || location.startsWith('/reset-password/')
      );
      
      if (isAuthRoute) {
        const lastVisitedPath = localStorage.getItem('lastVisitedPath');
        // Don't redirect to field app routes
        const redirectPath = lastVisitedPath?.startsWith('/field-app') 
          ? '/my-day' 
          : (lastVisitedPath || '/my-day');
        setLocation(redirectPath);
      }
    }
  }, [loading, isAuthenticated, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Field App handles its own authentication
  if (location.startsWith('/field-app')) {
    console.log('Field app route detected:', location);
    return (
      <div className="min-h-screen">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading Field App...</p>
            </div>
          </div>
        }>
          <FieldApp />
        </Suspense>
      </div>
    );
  }

  // Public booking page - no authentication required
  // Supports both new slug-based URLs (/book/:slug) and legacy token URLs (/public/bookings/:token)
  if (location.startsWith('/book/') || location.startsWith('/public/bookings')) {
    const BookingPage = lazy(() => import("@/pages/public/BookingPage"));
    return (
      <div className="min-h-screen">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        }>
          <Switch>
            <Route path="/book/:slug">
              <BookingPage />
            </Route>
            <Route path="/public/bookings/:token">
              <BookingPage />
            </Route>
          </Switch>
        </Suspense>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Switch>
          <Route path="/">
            {() => {
              setLocation('/login');
              return null;
            }}
          </Route>
          <Route path="/login" component={Login} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password/:token" component={ResetPassword} />
          {/* Default fallback redirects to login */}
          <Route>
            {() => {
              setLocation('/login');
              return null;
            }}
          </Route>
        </Switch>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex">
      {/* Navigation Sidebar - Restored */}
      <NavigationSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Unified Header - positioned above main content */}
        <header className="bg-background border-b border-border h-10 z-30 sticky top-0">
          <div className="flex items-center justify-between px-4 lg:px-6 h-full">
            {/* Left Section */}
            <div className="flex items-center">
              {/* Mobile Menu Trigger - Restored */}
              <div data-component="mobile-menu-trigger">
                <MobileMenuTrigger />
              </div>
              
              {/* Logo - Mobile only */}
              <div className="lg:hidden" data-component="brand-logo">
                <BrandLogo size="sm" showText={true} />
              </div>

              
            </div>

            
            
            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Debug: Add data attributes to all header components */}
              <div data-component="cycle-date-indicator">
                <CycleDateIndicator />
              </div>
              
              <div data-component="add-to-backlog-button">
                <AddToBacklogButton />
              </div>
              
              {/* Developer Mode Toggle removed - using unified status system now */}
              
              <div data-component="theme-toggle">
                <ThemeToggle />
              </div>
              
              {/* Mobile User Menu - Restored */}
              <div className="lg:hidden" data-component="mobile-user-menu">
                <MobileUserMenu />
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            }>
            <Switch>
              {/* Main Dashboard */}
              <Route path="/" component={MyDay} />
              <Route path="/my-day" component={MyDay} />
              <Route path="/my-day-dynamic" component={DynamicMyDay} />
              
              {/* Strategy & OKRs */}
              <Route path="/strategy" component={StrategyDashboard} />
              <Route path="/strategy/dashboard" component={StrategyDashboard} />
              <Route path="/strategy/mission" component={MissionVision} />

              <Route path="/strategy/checkin" component={CycleManagement} />
              <Route path="/strategy/cycle/:cycleId" component={CycleDetailView} />
              <Route path="/strategy/checkin/:objectiveId/meeting" component={CheckInMeeting} />
              <Route path="/strategy/meeting/:meetingId/feedback" component={MeetingFeedback} />
              <Route path="/strategy/cycles" component={CycleDetailView} />
              <Route path="/strategy/setup" component={StrategySetup} />
              <Route path="/strategy/risks" component={StrategyRisks} />
              <Route path="/strategy/alignment" component={StrategyAlignment} />
              <Route path="/strategy/initiatives" component={StrategyInitiatives} />
              <Route path="/strategy/management" component={StrategyManagement} />
              
              {/* Strategy Pages - Objectives & Tasks */}
              <Route path="/strategy/objectives" component={Objectives} />
              <Route path="/strategy/tasks" component={StrategyTasks} />
              <Route path="/strategy/work-items" component={WorkItems} />
              <Route path="/work-items/template/:templateId">
                {(params) => <TemplateWorkItemView templateId={params.templateId} />}
              </Route>
              <Route path="/strategy/mission-vision" component={MissionVision} />
              <Route path="/strategy/settings" component={StrategySettings} />
              <Route path="/strategy/knowledge-base" component={KnowledgeBaseListing} />
              
              {/* Projects & Tasks */}
              <Route path="/projects/board" component={StrategyTasks} />
              <Route path="/projects/tasks" component={StrategyTasks} />
              <Route path="/projects/calendar" component={StrategyTasks} />
              
              {/* Tools & Agents */}
              <Route path="/tools/automation" component={() => <ComingSoon featureName="Automation Tools" description="Powerful automation workflows and tools for your business processes" />} />
              <Route path="/tools/agents" component={() => <ComingSoon featureName="AI Agents" description="Intelligent AI agents for task automation and business process optimization" />} />
              <Route path="/tools/routines" component={() => <ComingSoon featureName="Automation Routines" description="Powerful automation workflows and scheduled task management" />} />
              <Route path="/tools/logs" component={() => <ComingSoon featureName="System Logs" description="Comprehensive system monitoring and audit log management" />} />
              
              {/* Help Desk */}
              <Route path="/helpdesk/tickets" component={SupportTickets} />
              <Route path="/helpdesk/ai-assistant" component={() => <ComingSoon featureName="AI Assistant" description="Intelligent help desk assistant for automated customer support" />} />
              
              
              {/* Composable Features */}
              <Route path="/features/site-builder" component={() => <ComingSoon featureName="AI Site Builder" description="Create professional websites with AI-powered conversations" />} />
              <Route path="/features/crm" component={() => <ComingSoon featureName="CRM" description="Customer relationship management tools and contact tracking" />} />
              <Route path="/features/ecommerce" component={() => <ComingSoon featureName="E-Commerce" description="Complete e-commerce solution with product management and payment processing" />} />
              <Route path="/features/library" component={() => <ComingSoon featureName="Content Library" description="Digital asset management and content organization system" />} />
              
              {/* Administration */}
              <Route path="/admin/organization" component={OrganizationSettings} />
              <Route path="/admin/users" component={UserManagement} />
              <Route path="/admin/theme" component={ThemeEditor} />
              <Route path="/admin/integrations" component={() => <ComingSoon featureName="Integrations" description="Connect your favorite tools and services" />} />
              {/* Integrations and Addons */}
              <Route path="/integrations" component={Integrations} />
              <Route path="/agents" component={AgentBuilder} />
              <Route path="/agents/workflows/:id/edit" component={AgentWorkflowEdit} />
              <Route path="/templates/workflows" component={TemplateList} />
              <Route path="/templates/workflows/:id/edit" component={TemplateEdit} />
              
              {/* AI Assistant */}
              <Route path="/ai-assistant/settings" component={AIAssistantSettings} />
              <Route path="/ai-assistant" component={AIAssistantSettings} />
              
              {/* Integrations Setup Pages */}
              <Route path="/integrations/splynx/setup" component={SplynxSetup} />
              <Route path="/integrations/splynx/agents" component={SplynxAgents} />
              <Route path="/integrations/pxc/setup" component={PXCSetup} />
              <Route path="/integrations/google-maps/setup" component={GoogleMapsSetup} />
              <Route path="/integrations/airtable/setup" component={AirtableSetup} />
              <Route path="/data/airtable/:connectionId" component={AirtableTableView} />
              <Route path="/integrations/sql-database/setup" component={() => <ComingSoon featureName="SQL Databases" description="Connect to PostgreSQL, MySQL, SQLite and more" />} />
              <Route path="/integrations/sql-direct/setup" component={() => <ComingSoon featureName="SQL Direct" description="Direct SQL database query access and management" />} />
              <Route path="/integrations/xero/setup" component={XeroSetup} />
              <Route path="/integrations/xero/callback" component={XeroCallback} />
              <Route path="/integrations/xero" component={XeroSetup} />
              <Route path="/integrations/vapi/setup" component={VapiSetup} />
              <Route path="/integrations/ai-ticket-drafting/setup" component={AITicketDraftingSetup} />
              <Route path="/integrations/webhooks" component={WebhookManager} />
              <Route path="/finance" component={FinanceDashboard} />
              <Route path="/finance/transactions" component={Transactions} />
              <Route path="/finance/profit-centers" component={ProfitCenters} />
              <Route path="/finance/chart-of-accounts" component={ChartOfAccounts} />
              <Route path="/finance/okr-analysis" component={OkrAnalysis} />
              <Route path="/vapi/performance" component={VapiPerformanceDashboard} />
              <Route path="/integrations/microsoft/setup" component={() => <ComingSoon featureName="Microsoft Outlook Integration" description="Sync your email and calendar with Microsoft Outlook" />} />
              <Route path="/integrations/firebase/setup" component={FirebaseSetup} />
              <Route path="/integrations/openai/setup" component={() => <ComingSoon featureName="OpenAI Integration" description="Integrate AI models for intelligent automation" />} />
              
              {/* Super Admin */}
              <Route path="/super-admin" component={SuperAdminDashboard} />
              <Route path="/super-admin-dashboard" component={SuperAdminDashboard} />
              
              {/* Admin Section Navigation Routes */}

              <Route path="/user-management" component={UserManagement} />
              <Route path="/forgot-password" component={ForgotPassword} />
              
              {/* User Profile and Dev Tools */}
              <Route path="/profile" component={() => {
                const [, setLocation] = useLocation();
                useEffect(() => setLocation('/core/user-profile'), []);
                return null;
              }} />
              <Route path="/settings" component={() => {
                const [, setLocation] = useLocation();
                useEffect(() => setLocation('/core/account-settings'), []);
                return null;
              }} />
              <Route path="/dev-tools" component={DevTools} />
              <Route path="/developer-docs" component={() => {
                const [, setLocation] = useLocation();
                useEffect(() => setLocation('/dev-tools/documentation'), []);
                return null;
              }} />
              <Route path="/documentation" component={() => {
                const [, setLocation] = useLocation();
                useEffect(() => setLocation('/dev-tools/documentation'), []);
                return null;
              }} />
              
              {/* Dev Tools Subpages - New separate pages with exact functionality from tabs */}
              <Route path="/dev-tools/pages" component={DevToolsPages} />
              <Route path="/dev-tools/menu" component={DevToolsMenu} />
              <Route path="/dev-tools/features" component={DevToolsFeatures} />
              <Route path="/dev-tools/documentation" component={DeveloperDocumentation} />

              {/* Legacy Routes - Keep for backward compatibility */}
              <Route path="/admin" component={() => {
                const [, setLocation] = useLocation();
                useEffect(() => setLocation('/strategy/objectives'), []);
                return null;
              }} />
              <Route path="/customers" component={CustomerManagement} />
              <Route path="/tickets" component={SupportTickets} />
              <Route path="/support" component={SupportTickets} />
              <Route path="/support-tickets" component={SupportTickets} />
              <Route path="/admin/customers" component={CustomerManagement} />
              <Route path="/admin/customer-mapping" component={CustomerMapping} />
              <Route path="/field-engineering/customer-mapping" component={CustomerMapping} />
              <Route path="/field-engineering/fiber-network" component={FiberNetwork} />
              <Route path="/field-engineering/chamber-workflow" component={ChamberWorkflow} />
              <Route path="/addresses" component={Addresses} />
              <Route path="/admin/support" component={SupportTickets} />
              <Route path="/tasks" component={StrategyTasks} />
              <Route path="/support-desk" component={SupportTickets} />
              <Route path="/voice-agent-logs" component={() => <ComingSoon featureName="Voice Agent Management" description="AI-powered voice agent configuration and management tools" />} />
              <Route path="/managed-services" component={ManagedServices} />
              <Route path="/training" component={Training} />
              <Route path="/knowledge-base" component={KnowledgeBaseListing} />
              <Route path="/knowledge-base/documents/new" component={DocumentEditor} />
              <Route path="/knowledge-base/documents/:id/edit" component={DocumentEditor} />
              <Route path="/kb/documents/:id" component={DocumentView} />
              <Route path="/knowledge-hub/training/modules/new" component={TrainingModuleEditor} />
              <Route path="/knowledge-hub/training/modules/:id/edit" component={TrainingModuleEditor} />

              {/* Redirects for backward compatibility */}
              <Route path="/admin/support" component={() => {
                const [, setLocation] = useLocation();
                useEffect(() => setLocation('/helpdesk/tickets'), []);
                return null;
              }} />
              <Route path="/voice-agents" component={() => <ComingSoon featureName="Voice Agents" description="AI-powered voice agent configuration and management tools" />} />

              {/* Core Application Pages (Use full-featured versions) */}
              <Route path="/core/account-settings" component={Settings} />
              <Route path="/core/organization-settings" component={OrganizationSettings} />
              <Route path="/core/user-management" component={PeopleAndTeams} />
              <Route path="/core/user-profile" component={OriginalUserProfile} />
              <Route path="/core/admin-dashboard" component={() => {
                const [, setLocation] = useLocation();
                useEffect(() => setLocation('/strategy/objectives'), []);
                return null;
              }} />
              <Route path="/core/super-admin-platform-manager" component={SuperAdminDashboard} />
              <Route path="/core/super-admin-dashboard" component={() => {
                const [, setLocation] = useLocation();
                useEffect(() => setLocation('/core/super-admin-platform-manager'), []);
                return null;
              }} />
              <Route path="/core/dev-tools" component={CoreDevTools} />
              <Route path="/core/theme-editor" component={CoreThemeEditor} />
              <Route path="/core/people" component={PeopleAndTeams} />
              
              {/* Settings Pages */}
              <Route path="/settings/bookable-appointments" component={() => {
                const [, setLocation] = useLocation();
                useEffect(() => setLocation('/calendar'), []);
                return null;
              }} />
              <Route path="/settings/calendar" component={CalendarSettingsPage} />
              <Route path="/calendar" component={CalendarPage} />
              
              {/* Other Routes */}
              {/* /profile redirects to /core/user-profile are handled above */}
              {/* Default fallback - redirect unknown routes to My Day */}
              <Route path="*" component={MyDay} />
            </Switch>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {/* QA Overlay - Always render when ?qa=1 */}
      <QAOverlay />
      {/* AI Assistant - Floating button on all authenticated pages */}
      <AIAssistantButton />
    </div>
  );
}

export default App;