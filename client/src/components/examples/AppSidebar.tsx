import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from '../AppSidebar';

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-96 w-full">
        <AppSidebar />
        <div className="flex-1 p-6 bg-background">
          <div className="text-center text-muted-foreground">
            <h3 className="text-lg font-medium mb-2">Main Content Area</h3>
            <p>This is where the main application content would appear</p>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}