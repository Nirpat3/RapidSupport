import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  User, 
  MessageSquare, 
  MessageCircle, 
  LogOut,
  Megaphone,
  BookOpen,
  Plus,
  ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface CustomerPortalLayoutProps {
  children: React.ReactNode;
}

interface UnreadCountsResponse {
  totalUnread: number;
  perConversation: Array<{ conversationId: string; unreadCount: number }>;
}

function CustomerPortalSidebar() {
  const [location] = useLocation();

  const { data: customerData } = useQuery<{ customer: { id: string; name: string; email: string } }>({
    queryKey: ['/api/portal/auth/me'],
  });

  const { data: unreadData } = useQuery<UnreadCountsResponse>({
    queryKey: ['/api/customer-portal/unread-counts'],
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery<{
    openConversations: number;
  }>({
    queryKey: ['/api/customer-portal/stats'],
  });

  const customer = customerData?.customer;
  const totalUnread = unreadData?.totalUnread || 0;
  const openTickets = stats?.openConversations || 0;

  const handleLogout = async () => {
    await fetch('/api/portal/auth/logout', { method: 'POST' });
    window.location.href = '/portal/login';
  };

  const mainNavItems = [
    { path: '/portal/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/portal/conversations', icon: MessageSquare, label: 'Conversations', badge: totalUnread > 0 ? totalUnread : undefined },
    { path: '/portal/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
    { path: '/portal/feeds', icon: Megaphone, label: 'Announcements' },
  ];

  const secondaryNavItems = [
    { path: '/portal/profile', icon: User, label: 'Profile' },
    { path: '/portal/feedback', icon: MessageCircle, label: 'Feedback' },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {customer?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{customer?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{customer?.email}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-3">
            <Link href="/portal/chat">
              <Button className="w-full gap-2 justify-start" data-testid="button-new-conversation">
                <Plus className="h-4 w-4" />
                New Conversation
              </Button>
            </Link>
          </div>

          {openTickets > 0 && (
            <div className="px-2 pb-3">
              <Link href="/portal/conversations">
                <div className="p-3 rounded-md bg-accent/50 border border-accent hover-elevate cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Open Tickets</p>
                      <p className="text-lg font-bold">{openTickets}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            </div>
          )}
        </SidebarGroup>

        <Separator />

        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = location === item.path || location.startsWith(item.path + '/');
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Link href={item.path}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <Badge variant="destructive" className="ml-auto h-5 min-w-[1.25rem] px-1.5 text-xs">
                            {item.badge > 99 ? '99+' : item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => {
                const isActive = location === item.path || location.startsWith(item.path + '/');
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Link href={item.path}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function CustomerPortalLayout({ children }: CustomerPortalLayoutProps) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <CustomerPortalSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center gap-2 p-2 border-b lg:hidden">
            <SidebarTrigger data-testid="button-menu" />
            <h1 className="font-semibold">Customer Portal</h1>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
