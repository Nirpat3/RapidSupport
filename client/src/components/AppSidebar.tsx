import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Bell
} from "lucide-react";
import { Link } from "wouter";
import { useNotifications } from "@/contexts/NotificationContext";
import { apiRequest } from "@/lib/queryClient";

interface AppSidebarProps {
  currentUser?: {
    id: string;
    name: string;
    role: 'admin' | 'agent';
    avatar?: string;
  };
}

const getNavigationItems = (unreadCount: number, activityCount: number) => [
  {
    title: "Conversations",
    url: "/",
    icon: MessageSquare,
    badge: unreadCount > 0 ? unreadCount : undefined
  },
  {
    title: "Activity", 
    url: "/activity",
    icon: Bell,
    badge: activityCount > 0 ? activityCount : undefined
  },
  {
    title: "Dashboard", 
    url: "/dashboard",
    icon: BarChart3
  },
  {
    title: "Customers",
    url: "/customers", 
    icon: Users
  },
  {
    title: "AI Agents",
    url: "/ai-agents", 
    icon: Bot
  },
  {
    title: "Staff AI Dashboard",
    url: "/ai-dashboard", 
    icon: Activity
  },
  {
    title: "AI Training",
    url: "/ai-training", 
    icon: Brain
  },
  {
    title: "AI Takeover",
    url: "/ai-takeover", 
    icon: UserCheck
  },
  {
    title: "Knowledge Base",
    url: "/knowledge", 
    icon: BookOpen
  },
  {
    title: "File Management",
    url: "/files", 
    icon: File
  },
  {
    title: "Analytics",
    url: "/analytics", 
    icon: TrendingUp
  },
  {
    title: "Feed",
    url: "/feed", 
    icon: Rss
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings
  }
];

const supportItems = [
  {
    title: "Help Center",
    url: "/help",
    icon: HelpCircle
  }
];

export default function AppSidebar({ currentUser }: AppSidebarProps) {
  const [activeItem, setActiveItem] = useState("/");
  const { totalUnreadCount } = useNotifications();
  
  // TODO: remove mock functionality
  const user = currentUser || {
    id: 'user1',
    name: 'Sarah Smith',
    role: 'admin' as const
  };

  // Fetch activity notification count
  const { data: activityData } = useQuery<{ count: number }>({
    queryKey: ['/api/activity/notifications/unread-count'],
    queryFn: () => apiRequest('/api/activity/notifications/unread-count', 'GET'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const activityCount = activityData?.count || 0;
  const navigationItems = getNavigationItems(totalUnreadCount, activityCount);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg" data-testid="app-title">Support Board</h1>
            <p className="text-xs text-muted-foreground">Customer Support</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={activeItem === item.url}
                    onClick={() => setActiveItem(item.url)}
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="destructive" className="ml-auto text-xs h-5 px-1.5">
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
        
        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={activeItem === item.url}
                    onClick={() => setActiveItem(item.url)}
                    data-testid={`support-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="px-3 py-4 space-y-3">
          {/* User Profile */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="user-name">{user.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs" data-testid="user-role">
                  {user.role}
                </Badge>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Logout Button */}
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
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