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
import AIAgentsPage from "@/pages/AIAgentsPage";
import StaffAIDashboard from "@/pages/StaffAIDashboard";
import AITrainingPage from "@/pages/AITrainingPage";
import StaffTakeoverPage from "@/pages/StaffTakeoverPage";
import KnowledgeManagementPage from "@/pages/KnowledgeManagementPage";
import FileManagementPage from "@/pages/FileManagementPage";
import AgentAnalyticsPage from "@/pages/AgentAnalyticsPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ConversationsPage} />
      <Route path="/conversations" component={ConversationsPage} />
      <Route path="/conversations/:id" component={ConversationsPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/customers/:id" component={CustomerProfilePage} />
      <Route path="/ai-agents" component={AIAgentsPage} />
      <Route path="/ai-dashboard" component={StaffAIDashboard} />
      <Route path="/ai-training" component={AITrainingPage} />
      <Route path="/ai-takeover" component={StaffTakeoverPage} />
      <Route path="/knowledge" component={KnowledgeManagementPage} />
      <Route path="/files" component={FileManagementPage} />
      <Route path="/analytics" component={AgentAnalyticsPage} />
      <Route path="/settings" component={SettingsPage} />
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
        <div className="flex h-screen w-full max-w-full overflow-hidden">
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
            <main className="flex-1 overflow-hidden w-full max-w-full box-border">
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
  
  // Check if we're on the customer chat page (public route)
  const isCustomerChatPage = window.location.pathname === '/customer-chat';
  
  // For customer chat page, render without authentication but with necessary providers
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
