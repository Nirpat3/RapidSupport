import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import LoginForm from "@/components/LoginForm";
import ConversationsPage from "@/pages/ConversationsPage";
import DashboardPage from "@/pages/DashboardPage";
import CustomersPage from "@/pages/CustomersPage";
import CustomerProfilePage from "@/pages/CustomerProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import CustomerChatPage from "@/pages/CustomerChatPage";
import SupportPage from "@/pages/SupportPage";
import EmbedChatWidget from "@/pages/EmbedChatWidget";
import SupportCenterWidget from "@/pages/SupportCenterWidget";
import AIAgentsPage from "@/pages/AIAgentsPage";
import StaffAIDashboard from "@/pages/StaffAIDashboard";
import AITrainingPage from "@/pages/AITrainingPage";
import StaffTakeoverPage from "@/pages/StaffTakeoverPage";
import AILearningDashboard from "@/pages/AILearningDashboard";
import AgentManagement from "@/pages/AgentManagement";
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
import UserManagementPage from "@/pages/UserManagementPage";
import DocumentationPage from "@/pages/DocumentationPage";
import { PermissionGuard } from "@/components/PermissionGuard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
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
      <Route path="/ai-agents">
        <PermissionGuard feature="ai-agents">
          <AIAgentsPage />
        </PermissionGuard>
      </Route>
      <Route path="/ai-dashboard">
        <PermissionGuard feature="ai-dashboard">
          <StaffAIDashboard />
        </PermissionGuard>
      </Route>
      <Route path="/ai-training">
        <PermissionGuard feature="ai-training">
          <AITrainingPage />
        </PermissionGuard>
      </Route>
      <Route path="/ai-learning">
        <PermissionGuard feature="ai-learning">
          <AILearningDashboard />
        </PermissionGuard>
      </Route>
      <Route path="/agent-management">
        <PermissionGuard feature="agent-management">
          <AgentManagement />
        </PermissionGuard>
      </Route>
      <Route path="/ai-takeover">
        <PermissionGuard feature="ai-takeover">
          <StaffTakeoverPage />
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
      <Route path="/user-management">
        <PermissionGuard feature="user-management">
          <UserManagementPage />
        </PermissionGuard>
      </Route>
      <Route path="/settings">
        <PermissionGuard feature="settings">
          <SettingsPage />
        </PermissionGuard>
      </Route>
      <Route path="/documentation">
        <DocumentationPage />
      </Route>
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
          <div className="flex flex-col flex-1 min-w-0">
            <header className="flex items-center justify-between p-2 sm:p-4 border-b border-border bg-card min-w-0">
              <div className="flex items-center gap-1 sm:gap-4 min-w-0 flex-1">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="flex-shrink-0" />
                <div className="h-6 w-px bg-border hidden sm:block" />
                <h2 className="font-semibold text-sm sm:text-lg truncate" data-testid="page-header">
                  Support Board
                </h2>
              </div>
              <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                <span className="text-xs text-muted-foreground truncate hidden lg:block max-w-32" data-testid="text-user-name">
                  {user?.name} ({user?.role})
                </span>
                <span className="text-xs text-muted-foreground truncate lg:hidden max-w-20" data-testid="text-user-name-short">
                  {user?.name?.split(' ')[0]}
                </span>
                <ThemeToggle />
                <button 
                  onClick={logout}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 ml-1"
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
      </SidebarProvider>
    </NotificationProvider>
  );
}

function AppContent() {
  const { user, login, isLoading } = useAuth();
  
  // Check if we're on public routes
  const pathname = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
  const isCustomerChatPage = pathname === '' || pathname === '/customer-chat';
  const isKnowledgeBasePage = pathname === '/knowledge-base';
  const isChatEmbedPage = pathname === '/chat'; // Embeddable chat widget
  const isSupportCenterWidget = pathname === '/support-widget'; // Enhanced support center widget
  
  // Knowledge base article public view
  const isPublicArticlePage = window.location.pathname.startsWith('/kb/');
  
  // Customer portal pages (separate from staff portal - customers have their own login)
  const isPortalLoginPage = window.location.pathname === '/portal/login';
  const isPortalPage = window.location.pathname.startsWith('/portal') && window.location.pathname !== '/portal/login';
  
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
          <SupportPage />
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
