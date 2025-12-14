import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  User, 
  MessageSquare, 
  MessageCircle, 
  LogOut,
  Rss,
  BookOpen
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CustomerPortalLayoutProps {
  children: React.ReactNode;
}

interface UnreadCountsResponse {
  totalUnread: number;
  perConversation: Array<{ conversationId: string; unreadCount: number }>;
}

export function CustomerPortalLayout({ children }: CustomerPortalLayoutProps) {
  const [location] = useLocation();

  // Get customer session info
  const { data: customerData } = useQuery<{ customer: { id: string; name: string; email: string } }>({
    queryKey: ['/api/portal/auth/me'],
  });

  // Get unread message counts for notification badge
  const { data: unreadData } = useQuery<UnreadCountsResponse>({
    queryKey: ['/api/customer-portal/unread-counts'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const customer = customerData?.customer;
  const totalUnread = unreadData?.totalUnread || 0;

  const handleLogout = async () => {
    await fetch('/api/portal/auth/logout', { method: 'POST' });
    window.location.href = '/portal/login';
  };

  const navItems = [
    { path: '/portal/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/portal/profile', icon: User, label: 'Profile' },
    { path: '/portal/conversations', icon: MessageSquare, label: 'Conversations', showBadge: true },
    { path: '/portal/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
    { path: '/portal/feedback', icon: MessageCircle, label: 'Feedback' },
    { path: '/portal/feeds', icon: Rss, label: 'Feeds' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold" data-testid="title-portal">Customer Portal</h1>
              {customer && (
                <p className="text-sm text-muted-foreground">{customer.name}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;
              const showNotificationBadge = item.showBadge && totalUnread > 0;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2 rounded-none border-b-2 border-transparent relative",
                      isActive && "border-b-primary"
                    )}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="relative">
                      <Icon className="h-4 w-4" />
                      {showNotificationBadge && (
                        <span 
                          className="absolute -top-1.5 -right-1.5 h-2 w-2 rounded-full bg-destructive"
                          data-testid="badge-unread-indicator"
                        />
                      )}
                    </div>
                    <span className="hidden sm:inline">{item.label}</span>
                    {showNotificationBadge && (
                      <Badge 
                        variant="destructive" 
                        className="ml-1 h-5 min-w-[1.25rem] px-1 text-xs hidden sm:flex"
                        data-testid="badge-unread-count"
                      >
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
