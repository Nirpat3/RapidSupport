import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import LoginForm from "@/components/LoginForm";
import ConversationsPage from "@/pages/ConversationsPage";
import DashboardPage from "@/pages/DashboardPage";
import CustomersPage from "@/pages/CustomersPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ConversationsPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/customers" component={CustomersPage} />
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
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="h-6 w-px bg-border" />
              <h2 className="font-semibold text-lg" data-testid="page-header">
                Support Board
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground" data-testid="text-user-name">
                {user?.name} ({user?.role})
              </span>
              <ThemeToggle />
              <div className="h-6 w-px bg-border" />
              <button 
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-logout"
              >
                Logout
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, login, isLoading } = useAuth();
  
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
