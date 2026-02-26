import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Megaphone, 
  Rss, 
  Users, 
  MessageSquare,
  ChevronRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";

interface CommLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  {
    title: "Announcements",
    url: "/portal/communication/announcements",
    icon: Megaphone,
  },
  {
    title: "Feed",
    url: "/portal/communication/feed",
    icon: Rss,
  },
  {
    title: "Community",
    url: "/portal/communication/community",
    icon: Users,
  },
  {
    title: "Messages",
    url: "/portal/communication/messages",
    icon: MessageSquare,
  },
];

export function CommLayout({ children }: CommLayoutProps) {
  const [location] = useLocation();

  const style = {
    "--sidebar-width": "14rem",
  };

  return (
    <CustomerPortalLayout>
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Communication</h2>
          <p className="text-muted-foreground">
            Stay updated and connect with your team and workspace.
          </p>
        </div>

        <SidebarProvider style={style as React.CSSProperties} className="items-start">
          <div className="flex h-[calc(100vh-12rem)] w-full gap-6 overflow-hidden">
            <Sidebar variant="floating" collapsible="none" className="hidden md:flex border rounded-lg overflow-hidden bg-card">
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.map((item) => {
                        const isActive = location === item.url;
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive}>
                              <Link href={item.url} className="flex items-center gap-3">
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </div>
    </CustomerPortalLayout>
  );
}
