import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Rss } from "lucide-react";
import { useLocation } from "wouter";

import ActivityPage from "./ActivityPage";
import FeedPage from "./FeedPage";

export default function ActivityHubPage() {
  const [location] = useLocation();
  
  const getDefaultTab = () => {
    if (location.includes("feed")) return "feed";
    return "notifications";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
              <p className="text-sm text-muted-foreground">Stay updated with notifications and announcements</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="feed" className="flex items-center gap-2">
                <Rss className="w-4 h-4" />
                <span>Feed</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {activeTab === "notifications" && <ActivityPage embedded />}
        {activeTab === "feed" && <FeedPage embedded />}
      </div>
    </div>
  );
}
