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
  SidebarHeader
} from "@/components/ui/sidebar";
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
  FileText,
  Code,
  Tags,
  Sparkles,
  Zap,
  Smartphone,
  Share2,
  Palette
} from "lucide-react";
import { Link } from "wouter";
import { useNotifications } from "@/contexts/NotificationContext";
import { apiRequest } from "@/lib/queryClient";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/AuthContext";

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
    title: "Activity", 
    url: "/activity",
    icon: Bell,
    badge: activityCount > 0 ? activityCount : undefined,
    allowedRoles: 'all'
  },
  {
    title: "Customers",
    url: "/customers", 
    icon: Users,
    allowedRoles: 'all'  // Contacts - support staff need this
  },
  {
    title: "Knowledge Base",
    url: "/knowledge", 
    icon: BookOpen,
    allowedRoles: 'all'  // Reference for support staff
  },
  
  // === MANAGER/ADMIN ONLY ===
  {
    title: "Dashboard", 
    url: "/dashboard",
    icon: BarChart3,
    allowedRoles: ['admin']
  },
  {
    title: "AI Configuration",
    url: "/ai-configuration", 
    icon: Bot,
    allowedRoles: ['admin']
  },
  {
    title: "AI Performance",
    url: "/ai-performance", 
    icon: TrendingUp,
    allowedRoles: ['admin']
  },
  {
    title: "Human Oversight",
    url: "/human-oversight", 
    icon: UserCheck,
    allowedRoles: ['admin']
  },
  {
    title: "File Management",
    url: "/files", 
    icon: File,
    allowedRoles: ['admin']
  },
  {
    title: "Analytics",
    url: "/analytics", 
    icon: TrendingUp,
    allowedRoles: ['admin']
  },
  {
    title: "Feedback",
    url: "/feedback", 
    icon: MessageSquare,
    allowedRoles: ['admin']
  },
  {
    title: "Feed",
    url: "/feed", 
    icon: Rss,
    badge: feedCount > 0 ? feedCount : undefined,
    allowedRoles: ['admin']
  },
  {
    title: "User Management",
    url: "/user-management",
    icon: Shield,
    allowedRoles: ['admin']
  },
  {
    title: "Support Categories",
    url: "/support-categories",
    icon: Tags,
    allowedRoles: ['admin']
  },
  {
    title: "External Channels",
    url: "/channels",
    icon: Share2,
    allowedRoles: ['admin']
  },
  {
    title: "Lead Tracking",
    url: "/leads",
    icon: TrendingUp,
    allowedRoles: ['admin']
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    allowedRoles: ['admin']
  }
];

const supportItems: NavigationItem[] = [
  {
    title: "Widget Setup",
    url: "/widget-setup",
    icon: Code,
    allowedRoles: ['admin']
  },
  {
    title: "Branding",
    url: "/branding",
    icon: Palette,
    allowedRoles: ['admin']
  },
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
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <p className="text-xs text-sidebar-foreground/60">Enterprise Suite</p>
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
          <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/50">
            <div className="relative">
              <Avatar className="w-9 h-9 ring-2 ring-sidebar-primary/20 ring-offset-2 ring-offset-sidebar">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-sidebar" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="user-name">
                {user.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge 
                  variant="secondary" 
                  className="text-xs capitalize bg-sidebar-primary/10 text-sidebar-primary border-0 px-2 py-0"
                  data-testid="user-role"
                >
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-smooth" 
            onClick={() => console.log('Logout clicked')}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
