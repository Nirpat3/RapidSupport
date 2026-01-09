import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Tag, MessageCircle, Layout, Palette } from "lucide-react";
import { useLocation } from "wouter";

import SettingsPage from "./SettingsPage";
import SupportCategoriesPage from "./SupportCategoriesPage";
import ChannelSettingsPage from "./ChannelSettingsPage";
import WidgetSetupPage from "./WidgetSetupPage";
import BrandingSettingsPage from "./BrandingSettingsPage";

export default function SettingsHubPage() {
  const [location] = useLocation();
  
  const getDefaultTab = () => {
    if (location.includes("categories")) return "categories";
    if (location.includes("channels")) return "channels";
    if (location.includes("widget")) return "widget";
    if (location.includes("branding")) return "branding";
    return "general";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">Configure your workspace and support experience</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full max-w-2xl overflow-x-auto">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline">Categories</span>
              </TabsTrigger>
              <TabsTrigger value="channels" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Channels</span>
              </TabsTrigger>
              <TabsTrigger value="widget" className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                <span className="hidden sm:inline">Widget</span>
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {activeTab === "general" && <SettingsPage embedded />}
        {activeTab === "categories" && <SupportCategoriesPage embedded />}
        {activeTab === "channels" && <ChannelSettingsPage embedded />}
        {activeTab === "widget" && <WidgetSetupPage embedded />}
        {activeTab === "branding" && <BrandingSettingsPage embedded />}
      </div>
    </div>
  );
}
