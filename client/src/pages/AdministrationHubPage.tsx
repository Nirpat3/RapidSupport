import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Building, Users } from "lucide-react";
import { useLocation } from "wouter";

import PlatformAdminPage from "./PlatformAdminPage";
import WorkspaceAdminPage from "./WorkspaceAdminPage";

export default function AdministrationHubPage() {
  const [location] = useLocation();
  
  const getDefaultTab = () => {
    if (location.includes("workspace")) return "workspace";
    return "platform";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
              <p className="text-sm text-muted-foreground">Manage platform and workspace settings</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="platform" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline">Platform</span>
                <span className="sm:hidden">Platform</span>
              </TabsTrigger>
              <TabsTrigger value="workspace" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Workspace</span>
                <span className="sm:hidden">Workspace</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {activeTab === "platform" && <PlatformAdminPage embedded />}
        {activeTab === "workspace" && <WorkspaceAdminPage embedded />}
      </div>
    </div>
  );
}
