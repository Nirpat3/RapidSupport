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
import { PermissionGuard } from "@/components/PermissionGuard";
import PlatformAssistantWidget from "@/components/PlatformAssistantWidget";
import NotFound from "@/pages/not-found";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const CustomerChatPage = lazy(() => import("@/pages/CustomerChatPage"));
const CustomerPortalKnowledgeBase = lazy(() => import("@/pages/CustomerPortalKnowledgeBase"));
const EmbedChatWidget = lazy(() => import("@/pages/EmbedChatWidget"));
const SupportCenterWidget = lazy(() => import("@/pages/SupportCenterWidget"));
const PublicArticlePage = lazy(() => import("@/pages/PublicArticlePage"));
const KnowledgeCategoryPage = lazy(() => import("@/pages/KnowledgeCategoryPage"));
const CustomerPortalLogin = lazy(() => import("@/pages/CustomerPortalLogin"));
const OrgCustomerLoginPage = lazy(() => import("@/pages/OrgCustomerLoginPage"));
const WorkspaceSelectPage = lazy(() => import("@/pages/WorkspaceSelectPage"));
const InstallAppPage = lazy(() => import("@/pages/InstallAppPage"));
const MockupPage = lazy(() => import("@/pages/MockupPage"));
const PublicPolicyPage = lazy(() => import("@/pages/PublicPolicyPage"));

const CustomerPortalRouter = lazy(() => import("@/components/CustomerPortalRouter").then(m => ({ default: m.CustomerPortalRouter })));

const ConversationsPage = lazy(() => import("@/pages/ConversationsPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const CustomersPage = lazy(() => import("@/pages/CustomersPage"));
const CustomerProfilePage = lazy(() => import("@/pages/CustomerProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AIConfigurationPage = lazy(() => import("@/pages/AIConfigurationPage"));
const AIPerformanceInsightsPage = lazy(() => import("@/pages/AIPerformanceInsightsPage"));
const HumanOversightPage = lazy(() => import("@/pages/HumanOversightPage"));
const KnowledgeManagementPage = lazy(() => import("@/pages/KnowledgeManagementPage"));
const FileManagementPage = lazy(() => import("@/pages/FileManagementPage"));
const AgentAnalyticsPage = lazy(() => import("@/pages/AgentAnalyticsPage"));
const FeedPage = lazy(() => import("@/pages/FeedPage"));
const ActivityPage = lazy(() => import("@/pages/ActivityPage"));
const FeedbackEvaluationPage = lazy(() => import("@/pages/FeedbackEvaluationPage"));
const UserManagementPage = lazy(() => import("@/pages/UserManagementPage"));
const UserProfilePage = lazy(() => import("@/pages/UserProfilePage"));
const SupportCategoriesPage = lazy(() => import("@/pages/SupportCategoriesPage"));
const DocumentationPage = lazy(() => import("@/pages/DocumentationPage"));
const DocFrameworkPage = lazy(() => import("@/pages/DocFrameworkPage"));
const WorkflowsPage = lazy(() => import("@/pages/WorkflowsPage"));
const WidgetSetupPage = lazy(() => import("@/pages/WidgetSetupPage"));
const ChannelSettingsPage = lazy(() => import("@/pages/ChannelSettingsPage"));
const LeadTrackingPage = lazy(() => import("@/pages/LeadTrackingPage"));
const BrandingSettingsPage = lazy(() => import("@/pages/BrandingSettingsPage"));
const PlatformAdminPage = lazy(() => import("@/pages/PlatformAdminPage"));
const WorkspaceAdminPage = lazy(() => import("@/pages/WorkspaceAdminPage"));
const AIHubPage = lazy(() => import("@/pages/AIHubPage"));
const AnalyticsHubPage = lazy(() => import("@/pages/AnalyticsHubPage"));
const KnowledgeHubPage = lazy(() => import("@/pages/KnowledgeHubPage"));
const SettingsHubPage = lazy(() => import("@/pages/SettingsHubPage"));
const AdministrationHubPage = lazy(() => import("@/pages/AdministrationHubPage"));
const ActivityHubPage = lazy(() => import("@/pages/ActivityHubPage"));
const ApiIntegrationPage = lazy(() => import("@/pages/ApiIntegrationPage"));
const LegalPoliciesPage = lazy(() => import("@/pages/LegalPoliciesPage"));
const PublicLegalPage = lazy(() => import("@/pages/PublicLegalPage"));

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/mockup" component={MockupPage} />
        <Route path="/platform-admin">
          <PermissionGuard feature="platform-admin">
            <PlatformAdminPage />
          </PermissionGuard>
        </Route>
        <Route path="/workspace-admin">
          <PermissionGuard feature="workspace-admin">
            <WorkspaceAdminPage />
          </PermissionGuard>
        </Route>
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
        <Route path="/activity-hub">
          <PermissionGuard feature="activity">
            <ActivityHubPage />
          </PermissionGuard>
        </Route>
        <Route path="/ai-hub">
          <PermissionGuard feature="ai-agents">
            <AIHubPage />
          </PermissionGuard>
        </Route>
        <Route path="/analytics-hub">
          <PermissionGuard feature="analytics">
            <AnalyticsHubPage />
          </PermissionGuard>
        </Route>
        <Route path="/knowledge-hub">
          <PermissionGuard feature="knowledge-base">
            <KnowledgeHubPage />
          </PermissionGuard>
        </Route>
        <Route path="/settings-hub">
          <PermissionGuard feature="settings">
            <SettingsHubPage />
          </PermissionGuard>
        </Route>
        <Route path="/administration">
          <PermissionGuard feature="platform-admin">
            <AdministrationHubPage />
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
        <Route path="/doc-framework">
          <PermissionGuard feature="knowledge-base">
            <DocFrameworkPage />
          </PermissionGuard>
        </Route>
        <Route path="/workflows">
          <PermissionGuard feature="knowledge-base">
            <WorkflowsPage />
          </PermissionGuard>
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
        <Route path="/api-integration">
          <PermissionGuard feature="settings">
            <ApiIntegrationPage />
          </PermissionGuard>
        </Route>
        <Route path="/legal-policies">
          <PermissionGuard feature="settings">
            <LegalPoliciesPage />
          </PermissionGuard>
        </Route>
        <Route path="/policies/:type" component={PublicPolicyPage} />
        <Route path="/org/:slug/policies/:type" component={PublicPolicyPage} />
        <Route path="/install-app" component={InstallAppPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
                    <span className="text-white text-xs font-bold">NA</span>
                  </div>
                  <h2 className="font-semibold text-sm sm:text-lg truncate hidden sm:block" data-testid="page-header">
                    Nova AI
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
  
  const pathname = location.replace(/\/$/, '');
  const isLandingPage = pathname === '';
  const isAboutPage = pathname === '/about';
  const isPricingPage = pathname === '/pricing';
  const isContactPage = pathname === '/contact';
  const isLegalPage = pathname.startsWith('/legal/');
  const isOrgChatPage = pathname.startsWith('/chat/') && pathname !== '/chat';
  const isKnowledgeBasePage = pathname === '/knowledge-base';
  const isKnowledgeCategoryPage = pathname.startsWith('/knowledge-base/category/');
  const isChatEmbedPage = pathname === '/chat';
  const isSupportCenterWidget = pathname === '/support-widget';
  const isMockupPage = pathname === '/mockup';
  const isInstallAppPage = pathname === '/install-app';
  const isPublicArticlePage = pathname.startsWith('/kb/');
  const isOrgLoginPage = pathname.startsWith('/org/') && pathname.endsWith('/login');
  const isWorkspaceSelectPage = pathname === '/workspace-select';
  const isPortalLoginPage = pathname === '/portal/login';
  const isPortalPage = pathname.startsWith('/portal') && pathname !== '/portal/login';
  
  if (isLandingPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <LandingPage />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isAboutPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <AboutPage />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isPricingPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <PricingPage />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isContactPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <ContactPage />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isLegalPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/legal/:type">
                <PublicLegalPage />
              </Route>
            </Switch>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isOrgChatPage) {
    const orgSlug = pathname.replace('/chat/', '');
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <CustomerChatPage orgSlug={orgSlug} />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isOrgLoginPage) {
    const orgSlug = pathname.replace('/org/', '').replace('/login', '');
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <OrgCustomerLoginPage orgSlug={orgSlug} />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isWorkspaceSelectPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <WorkspaceSelectPage />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isKnowledgeBasePage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <CustomerPortalKnowledgeBase />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isKnowledgeCategoryPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <KnowledgeCategoryPage />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isChatEmbedPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <EmbedChatWidget />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isSupportCenterWidget) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <SupportCenterWidget />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isPublicArticlePage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <PublicArticlePage />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isPortalLoginPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <CustomerPortalLogin />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isPortalPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <CustomerPortalRouter />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isMockupPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <MockupPage />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  if (isInstallAppPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <InstallAppPage />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
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
  
  if (!user) {
    return <LoginForm onLogin={login} />;
  }
  
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
