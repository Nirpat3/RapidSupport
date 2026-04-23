import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  BarChart3, 
  Users, 
  Bot,
  Activity,
  Brain,
  UserCheck,
  BookOpen,
  File,
  Rss,
  Settings, 
  HelpCircle, 
  LogOut,
  Shield,
  TrendingUp,
  Bell,
  Clock,
  FileText,
  Code,
  Code2,
  Tags,
  Sparkles,
  Zap,
  Smartphone,
  Share2,
  Palette,
  Crown,
  Building2,
  GitBranch,
  Atom,
  ChevronRight,
  Cloud,
  Mail,
  CreditCard,
  ExternalLink,
  Monitor,
  Gauge,
  Webhook,
  Globe,
  Download,
  BellRing,
  Handshake,
  Plug,
  Store
} from "lucide-react";
import { Link } from "wouter";
import { useNotifications } from "@/contexts/NotificationContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/AuthContext";

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";

interface AppSidebarProps {
  currentUser?: {
    id: string;
    name: string;
    role: 'admin' | 'agent';
    avatar?: string;
  };
}

// Role-based menu access configuration
// 'all' = visible to everyone, or specify array of allowed roles
type AllowedRoles = 'all' | ('admin' | 'agent')[];

interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  badge?: number;
  allowedRoles?: AllowedRoles;
  external?: boolean; // Opens in new tab
}

const getNavigationItems = (unreadCount: number, activityCount: number, feedCount: number): NavigationItem[] => [
  // === SUPPORT STAFF CORE (visible to all staff) ===
  {
    title: "Conversations",
    url: "/conversations",
    icon: MessageSquare,
    badge: unreadCount > 0 ? unreadCount : undefined,
    allowedRoles: 'all'
  },
  {
    title: "Communication",
    url: "/communication",
    icon: Share2,
    allowedRoles: 'all'
  },
  {
    title: "Activity", 
    url: "/activity-hub",
    icon: Bell,
    badge: (activityCount + feedCount) > 0 ? (activityCount + feedCount) : undefined,
    allowedRoles: 'all'
  },
  {
    title: "Customers",
    url: "/customers", 
    icon: Users,
    allowedRoles: 'all'
  },
  {
    title: "Knowledge Base",
    url: "/knowledge-hub", 
    icon: BookOpen,
    allowedRoles: 'all'
  },
  {
    title: "Workflows",
    url: "/workflows",
    icon: GitBranch,
    allowedRoles: ['admin']
  },
  
  // === ADMIN ONLY HUB PAGES ===
  {
    title: "Analytics", 
    url: "/analytics-hub",
    icon: BarChart3,
    allowedRoles: ['admin']
  },
  {
    title: "AI Hub",
    url: "/ai-hub", 
    icon: Brain,
    allowedRoles: ['admin']
  },
  {
    title: "Lead Tracking",
    url: "/leads",
    icon: TrendingUp,
    allowedRoles: ['admin']
  }
];

// Settings sub-items (admin only)
const settingsSubItems: NavigationItem[] = [
  {
    title: "General Settings",
    url: "/settings-hub",
    icon: Settings,
    allowedRoles: ['admin']
  },
  {
    title: "Administration",
    url: "/administration",
    icon: Shield,
    allowedRoles: ['admin']
  },
  {
    title: "Quantum Optimization",
    url: "/quantum-optimization", 
    icon: Atom,
    allowedRoles: ['admin']
  },
  {
    title: "API Integration",
    url: "/api-integration",
    icon: Code2,
    allowedRoles: ['admin']
  },
  {
    title: "Partner Integrations",
    url: "/partner-integrations",
    icon: Plug,
    allowedRoles: ['admin']
  },
  {
    title: "Stores",
    url: "/stores",
    icon: Store,
    allowedRoles: ['admin']
  },
  {
    title: "Customer Chat Preview",
    url: "/chat",
    icon: ExternalLink,
    allowedRoles: ['admin'],
    external: true
  },
  {
    title: "Organizations",
    url: "/organization-management",
    icon: Building2,
    allowedRoles: ['admin']
  },
  {
    title: "Cloud Storage",
    url: "/cloud-storage",
    icon: Cloud,
    allowedRoles: ['admin']
  },
  {
    title: "Email Integration",
    url: "/email-integration",
    icon: Mail,
    allowedRoles: ['admin']
  },
  {
    title: "Saved Replies",
    url: "/saved-replies",
    icon: MessageSquare,
    allowedRoles: ['admin']
  },
  {
    title: "Billing & Usage",
    url: "/billing",
    icon: CreditCard,
    allowedRoles: 'all'
  },
  {
    title: "SLA Management",
    url: "/sla-management",
    icon: Clock,
    allowedRoles: ['admin']
  },
  {
    title: "Shre AI Agent",
    url: "/shre-ai",
    icon: Bot,
    allowedRoles: ['admin']
  },
  {
    title: "Resellers",
    url: "/resellers",
    icon: Handshake,
    allowedRoles: ['admin']
  },
  {
    title: "Webhooks",
    url: "/webhooks",
    icon: Webhook,
    allowedRoles: ['admin']
  },
  {
    title: "Custom Domains",
    url: "/custom-domains",
    icon: Globe,
    allowedRoles: ['admin']
  },
  {
    title: "Data Export",
    url: "/data-export",
    icon: Download,
    allowedRoles: ['admin']
  },
  {
    title: "Monitoring",
    url: "/monitoring",
    icon: Monitor,
    allowedRoles: ['admin']
  },
  {
    title: "Audit Log",
    url: "/audit-log",
    icon: FileText,
    allowedRoles: ['admin']
  },
  {
    title: "Security Settings",
    url: "/settings/security",
    icon: Shield,
    allowedRoles: 'all'
  },
  {
    title: "Notification Settings",
    url: "/settings/notifications",
    icon: BellRing,
    allowedRoles: 'all'
  },
  {
    title: "Rate Limiting",
    url: "/rate-limiting",
    icon: Gauge,
    allowedRoles: ['admin']
  }
];

const supportItems: NavigationItem[] = [
  {
    title: "Install App",
    url: "/install-app",
    icon: Smartphone,
    allowedRoles: 'all'
  },
  {
    title: "Documentation",
    url: "/documentation",
    icon: FileText,
    allowedRoles: 'all'
  },
  {
    title: "Help Center",
    url: "/help",
    icon: HelpCircle,
    allowedRoles: 'all'
  }
];

export default function AppSidebar({ currentUser }: AppSidebarProps) {
  const [location] = useLocation();
  const { totalUnreadCount } = useNotifications();
  const { user: authUser } = useAuth();

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => apiRequest("/api/users/me/status", "PATCH", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  });

  const statusOptions = [
    { label: "Online", value: "online", color: "bg-emerald-500" },
    { label: "Away", value: "away", color: "bg-amber-500" },
    { label: "Busy", value: "busy", color: "bg-rose-500" },
    { label: "Offline", value: "offline", color: "bg-slate-500" },
  ];

  const currentStatusValue = authUser?.status || "offline";
  const currentStatus = statusOptions.find(s => s.value === currentStatusValue) || statusOptions[3];
  
  // Use authenticated user from context, fall back to prop or default
  const user = authUser ? {
    id: authUser.id,
    name: authUser.name,
    role: authUser.role as 'admin' | 'agent',
    avatar: undefined
  } : currentUser || {
    id: 'user1',
    name: 'Guest User',
    role: 'agent' as const  // Default to agent (most restrictive) for safety
  };

  const { data: activityData } = useQuery<{ count: number }>({
    queryKey: ['/api/activity/notifications/unread-count'],
    queryFn: () => apiRequest('/api/activity/notifications/unread-count', 'GET'),
    refetchInterval: 30000,
  });

  const { data: feedData } = useQuery<{ count: number }>({
    queryKey: ['/api/feed/unread-count'],
    queryFn: () => apiRequest('/api/feed/unread-count', 'GET'),
    refetchInterval: 30000,
  });

  const activityCount = activityData?.count || 0;
  const feedCount = feedData?.count || 0;
  const navigationItems = getNavigationItems(totalUnreadCount, activityCount, feedCount);
  const { isUrlHidden } = usePermissions();
  
  // Helper function to check if user role has access to menu item
  const hasRoleAccess = (item: NavigationItem, userRole: string): boolean => {
    if (!item.allowedRoles || item.allowedRoles === 'all') {
      return true;
    }
    return item.allowedRoles.includes(userRole as 'admin' | 'agent');
  };
  
  const filteredNavigationItems = navigationItems.filter((item) => {
    if (!hasRoleAccess(item, user.role)) {
      return false;
    }
    if (isUrlHidden(item.url)) {
      return false;
    }
    return true;
  });
  
  const filteredSupportItems = supportItems.filter((item) => {
    return hasRoleAccess(item, user.role);
  });

  const filteredSettingsItems = settingsSubItems.filter((item) => {
    if (!hasRoleAccess(item, user.role)) {
      return false;
    }
    if (isUrlHidden(item.url)) {
      return false;
    }
    return true;
  });

  // Check if any settings sub-item is active
  const isSettingsActive = settingsSubItems.some(item => location === item.url);

  return (
    <Sidebar className="border-r border-sidebar-border/50">
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="relative">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-sidebar animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base text-sidebar-foreground tracking-tight" data-testid="app-title">
              Support Board
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <p className="text-xs text-sidebar-foreground/60">Enterprise Suite</p>
              </div>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-medium uppercase tracking-wider px-2 py-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {filteredNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    className="group relative transition-smooth rounded-lg data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary"
                    data-testid={`nav-${item.title.toLowerCase().replace(/ /g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4 transition-smooth group-data-[state=active]:text-sidebar-primary" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto text-xs h-5 min-w-5 px-1.5 flex items-center justify-center bg-rose-500/90 border-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Settings Collapsible Menu (Admin Only) */}
              {filteredSettingsItems.length > 0 && (
                <Collapsible defaultOpen={isSettingsActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        className="group relative transition-smooth rounded-lg data-[state=open]:bg-sidebar-accent"
                        data-testid="nav-settings"
                      >
                        <Settings className="w-4 h-4 transition-smooth" />
                        <span className="flex-1">Settings</span>
                        <ChevronRight className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {filteredSettingsItems.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton 
                              asChild
                              isActive={location === item.url}
                              data-testid={`nav-${item.title.toLowerCase().replace(/ /g, '-')}`}
                            >
                              {item.external ? (
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                  <item.icon className="w-4 h-4" />
                                  <span>{item.title}</span>
                                </a>
                              ) : (
                                <Link href={item.url}>
                                  <item.icon className="w-4 h-4" />
                                  <span>{item.title}</span>
                                </Link>
                              )}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {filteredSupportItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-medium uppercase tracking-wider px-2 py-3">
              Resources
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {filteredSupportItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      isActive={location === item.url}
                      className="group relative transition-smooth rounded-lg data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary"
                      data-testid={`support-${item.title.toLowerCase().replace(' ', '-')}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4 transition-smooth group-data-[state=active]:text-sidebar-primary" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border/30 p-3">
        <div className="space-y-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/50 hover-elevate transition-smooth text-left">
                <div className="relative">
                  <Avatar className="w-9 h-9 ring-2 ring-sidebar-primary/20 ring-offset-2 ring-offset-sidebar">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${currentStatus.color} rounded-full border-2 border-sidebar`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="user-name">
                    {user.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/50">
                      {currentStatus.label}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] uppercase h-4 bg-sidebar-primary/10 text-sidebar-primary border-0 px-1.5"
                      data-testid="user-role"
                    >
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-sidebar-foreground/30 rotate-90" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="right" sideOffset={10}>
              <DropdownMenuLabel>My Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={currentStatusValue} onValueChange={(s) => updateStatusMutation.mutate(s)}>
                {statusOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${option.color}`} />
                    <span>{option.label}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => console.log('Logout clicked')}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
