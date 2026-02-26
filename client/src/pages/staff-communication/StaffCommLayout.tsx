import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { Megaphone, LayoutDashboard, Users, MessageSquare } from "lucide-react";
import { ReactNode } from "react";

interface StaffCommLayoutProps {
  children: ReactNode;
}

export default function StaffCommLayout({ children }: StaffCommLayoutProps) {
  const [location] = useLocation();

  const menuItems = [
    {
      title: "Announcements",
      url: "/communication/announcements",
      icon: Megaphone,
    },
    {
      title: "Feed",
      url: "/communication/feed",
      icon: LayoutDashboard,
    },
    {
      title: "Community",
      url: "/communication/community",
      icon: Users,
    },
    {
      title: "Messages",
      url: "/communication/messages",
      icon: MessageSquare,
    },
  ];

  const style = {
    "--sidebar-width": "14rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar variant="inset" className="border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
