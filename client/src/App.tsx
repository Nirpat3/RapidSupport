import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import LoginForm from "@/components/LoginForm";
import ConversationsPage from "@/pages/ConversationsPage";
import DashboardPage from "@/pages/DashboardPage";
import CustomersPage from "@/pages/CustomersPage";
import CustomerProfilePage from "@/pages/CustomerProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import CustomerChatPage from "@/pages/CustomerChatPage";
import SupportPage from "@/pages/SupportPage";
import CustomerPortalKnowledgeBase from "@/pages/CustomerPortalKnowledgeBase";
import EmbedChatWidget from "@/pages/EmbedChatWidget";
import SupportCenterWidget from "@/pages/SupportCenterWidget";
import AIConfigurationPage from "@/pages/AIConfigurationPage";
import AIPerformanceInsightsPage from "@/pages/AIPerformanceInsightsPage";
import HumanOversightPage from "@/pages/HumanOversightPage";
import KnowledgeManagementPage from "@/pages/KnowledgeManagementPage";
import FileManagementPage from "@/pages/FileManagementPage";
import AgentAnalyticsPage from "@/pages/AgentAnalyticsPage";
import FeedPage from "@/pages/FeedPage";
import ActivityPage from "@/pages/ActivityPage";
import FeedbackEvaluationPage from "@/pages/FeedbackEvaluationPage";
import CustomerPortalLogin from "@/pages/CustomerPortalLogin";
import CustomerPortalFeed from "@/pages/CustomerPortalFeed";
import { CustomerPortalRouter } from "@/components/CustomerPortalRouter";
import PublicArticlePage from "@/pages/PublicArticlePage";
import KnowledgeCategoryPage from "@/pages/KnowledgeCategoryPage";
import UserManagementPage from "@/pages/UserManagementPage";
import UserProfilePage from "@/pages/UserProfilePage";
import SupportCategoriesPage from "@/pages/SupportCategoriesPage";
import DocumentationPage from "@/pages/DocumentationPage";
import WidgetSetupPage from "@/pages/WidgetSetupPage";
import MockupPage from "@/pages/MockupPage";
import InstallAppPage from "@/pages/InstallAppPage";
import ChannelSettingsPage from "@/pages/ChannelSettingsPage";
import LeadTrackingPage from "@/pages/LeadTrackingPage";
import BrandingSettingsPage from "@/pages/BrandingSettingsPage";
import { PermissionGuard } from "@/components/PermissionGuard";
import PlatformAssistantWidget from "@/components/PlatformAssistantWidget";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/mockup" component={MockupPage} />
      <Route path="/admin">
        <PermissionGuard feature="conversations">
          <ConversationsPage />
        </PermissionGuard>
      </Route>
      <Route path="/conversations/:id">
        <PermissionGuard feature="conversations">
          <ConversationsPage />
        </PermissionGuard>
      </Route>
      <Route path="/conversations">
        <PermissionGuard feature="conversations">
          <ConversationsPage />
        </PermissionGuard>
      </Route>
      <Route path="/activity">
        <PermissionGuard feature="activity">
          <ActivityPage />
        </PermissionGuard>
      </Route>
      <Route path="/dashboard">
        <PermissionGuard feature="dashboard">
          <DashboardPage />
        </PermissionGuard>
      </Route>
      <Route path="/customers/:id">
        <PermissionGuard feature="customers">
          <CustomerProfilePage />
        </PermissionGuard>
      </Route>
      <Route path="/customers">
        <PermissionGuard feature="customers">
          <CustomersPage />
        </PermissionGuard>
      </Route>
      <Route path="/ai-configuration">
        <PermissionGuard feature="ai-agents">
          <AIConfigurationPage />
        </PermissionGuard>
      </Route>
      <Route path="/ai-performance">
        <PermissionGuard feature="ai-dashboard">
          <AIPerformanceInsightsPage />
        </PermissionGuard>
      </Route>
      <Route path="/human-oversight">
        <PermissionGuard feature="ai-takeover">
          <HumanOversightPage />
        </PermissionGuard>
      </Route>
      <Route path="/knowledge">
        <PermissionGuard feature="knowledge-base">
          <KnowledgeManagementPage />
        </PermissionGuard>
      </Route>
      <Route path="/files">
        <PermissionGuard feature="file-management">
          <FileManagementPage />
        </PermissionGuard>
      </Route>
      <Route path="/analytics">
        <PermissionGuard feature="analytics">
          <AgentAnalyticsPage />
        </PermissionGuard>
      </Route>
      <Route path="/feedback">
        <PermissionGuard feature="feedback">
          <FeedbackEvaluationPage />
        </PermissionGuard>
      </Route>
      <Route path="/feed">
        <PermissionGuard feature="feed">
          <FeedPage />
        </PermissionGuard>
      </Route>
      <Route path="/user-management/:id">
        <PermissionGuard feature="user-management">
          <UserProfilePage />
        </PermissionGuard>
      </Route>
      <Route path="/user-management">
        <PermissionGuard feature="user-management">
          <UserManagementPage />
        </PermissionGuard>
      </Route>
      <Route path="/support-categories">
        <PermissionGuard feature="support-categories">
          <SupportCategoriesPage />
        </PermissionGuard>
      </Route>
      <Route path="/settings">
        <PermissionGuard feature="settings">
          <SettingsPage />
        </PermissionGuard>
      </Route>
      <Route path="/channels">
        <PermissionGuard feature="settings">
          <ChannelSettingsPage />
        </PermissionGuard>
      </Route>
      <Route path="/leads">
        <PermissionGuard feature="customers">
          <LeadTrackingPage />
        </PermissionGuard>
      </Route>
      <Route path="/documentation">
        <DocumentationPage />
      </Route>
      <Route path="/widget-setup">
        <PermissionGuard feature="settings">
          <WidgetSetupPage />
        </PermissionGuard>
      </Route>
      <Route path="/branding">
        <PermissionGuard feature="settings">
          <BrandingSettingsPage />
        </PermissionGuard>
      </Route>
      <Route path="/install-app" component={InstallAppPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  
  const style = {
    "--sidebar-width": "16rem", 
    "--sidebar-width-icon": "3rem",
  };
  
  return (
    <NotificationProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full max-w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0 bg-gradient-to-br from-background via-background to-muted/30">
            <header className="flex items-center justify-between p-2 sm:p-4 border-b border-border/50 glass-subtle min-w-0 sticky top-0 z-20">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="flex-shrink-0" />
                <div className="h-5 w-px bg-border/50 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">SB</span>
                  </div>
                  <h2 className="font-semibold text-sm sm:text-lg truncate hidden sm:block" data-testid="page-header">
                    Support Board
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground truncate max-w-32" data-testid="text-user-name">
                    {user?.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground truncate lg:hidden max-w-20 px-2" data-testid="text-user-name-short">
                  {user?.name?.split(' ')[0]}
                </span>
                <NotificationBell />
                <ThemeToggle />
                <button 
                  onClick={logout}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
                  data-testid="button-logout"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Exit</span>
                </button>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto w-full max-w-full box-border">
              <Router />
            </main>
          </div>
        </div>
        <PlatformAssistantWidget />
      </SidebarProvider>
    </NotificationProvider>
  );
}

function AppContent() {
  const { user, login, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Check if we're on public routes - use wouter's reactive location
  const pathname = location.replace(/\/$/, ''); // Remove trailing slash
  const isCustomerChatPage = pathname === '' || pathname === '/customer-chat';
  const isKnowledgeBasePage = pathname === '/knowledge-base';
  const isKnowledgeCategoryPage = pathname.startsWith('/knowledge-base/category/');
  const isChatEmbedPage = pathname === '/chat'; // Embeddable chat widget
  const isSupportCenterWidget = pathname === '/support-widget'; // Enhanced support center widget
  const isMockupPage = pathname === '/mockup'; // Design mockup page - public
  const isInstallAppPage = pathname === '/install-app'; // Install app instructions page
  
  // Knowledge base article public view
  const isPublicArticlePage = pathname.startsWith('/kb/');
  
  // Customer portal pages (separate from staff portal - customers have their own login)
  const isPortalLoginPage = pathname === '/portal/login';
  const isPortalPage = pathname.startsWith('/portal') && pathname !== '/portal/login';
  
  // For customer chat page (now the landing page), render without authentication
  if (isCustomerChatPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CustomerChatPage />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // For knowledge base page, render without authentication
  if (isKnowledgeBasePage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CustomerPortalKnowledgeBase />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // For knowledge base category page, render without authentication
  if (isKnowledgeCategoryPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <KnowledgeCategoryPage />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // For embeddable chat widget (used in iframes)
  if (isChatEmbedPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <EmbedChatWidget />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // For enhanced support center widget (used in iframes with API key)
  if (isSupportCenterWidget) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SupportCenterWidget />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // For public knowledge base article viewing
  if (isPublicArticlePage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <PublicArticlePage />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // For customer portal login page, render without staff authentication
  if (isPortalLoginPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CustomerPortalLogin />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // For customer portal pages, render without staff authentication
  if (isPortalPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CustomerPortalRouter />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // For design mockup page, render without authentication
  if (isMockupPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MockupPage />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // For install app page, render without authentication
  if (isInstallAppPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <InstallAppPage />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show login screen if not authenticated
  if (!user) {
    return <LoginForm onLogin={login} />;
  }
  
  // Show main application
  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
