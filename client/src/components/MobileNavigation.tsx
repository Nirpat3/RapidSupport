import { Home, MessageCircle, User, HelpCircle, Settings } from 'lucide-react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  badge?: number;
}

interface MobileNavigationProps {
  variant?: 'customer' | 'staff' | 'portal';
  conversationCount?: number;
}

export function MobileNavigation({ variant = 'customer', conversationCount }: MobileNavigationProps) {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const customerNavItems: NavItem[] = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: MessageCircle, label: 'Chat', path: '/chat', badge: conversationCount },
    { icon: HelpCircle, label: 'Help', path: '/kb' },
    { icon: User, label: 'Account', path: '/portal' },
  ];

  const staffNavItems: NavItem[] = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: MessageCircle, label: 'Chats', path: '/conversations', badge: conversationCount },
    { icon: User, label: 'Customers', path: '/customers' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const portalNavItems: NavItem[] = [
    { icon: Home, label: 'Home', path: '/portal' },
    { icon: MessageCircle, label: 'Messages', path: '/portal/conversations', badge: conversationCount },
    { icon: HelpCircle, label: 'Help', path: '/portal/knowledge' },
    { icon: User, label: 'Profile', path: '/portal/profile' },
  ];

  const navItems = variant === 'staff' 
    ? staffNavItems 
    : variant === 'portal' 
    ? portalNavItems 
    : customerNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.path || location.startsWith(item.path + '/');
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative",
                "transition-colors duration-200 touch-manipulation tap-highlight-none",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileBottomSpacer() {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  return <div className="h-16 flex-shrink-0" />;
}
