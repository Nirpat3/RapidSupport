import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, TrendingUp, UserCheck, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

import AIConfigurationPage from "./AIConfigurationPage";
import AIPerformanceInsightsPage from "./AIPerformanceInsightsPage";
import HumanOversightPage from "./HumanOversightPage";

export default function AIHubPage() {
  const [location] = useLocation();
  
  const getDefaultTab = () => {
    if (location.includes("performance")) return "performance";
    if (location.includes("oversight")) return "oversight";
    return "configuration";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">AI Hub</h1>
              <p className="text-sm text-muted-foreground">Configure, monitor, and optimize AI agents</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="configuration" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                <span className="hidden sm:inline">Configuration</span>
                <span className="sm:hidden">Config</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Performance</span>
                <span className="sm:hidden">Perf</span>
              </TabsTrigger>
              <TabsTrigger value="oversight" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Oversight</span>
                <span className="sm:hidden">Watch</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {activeTab === "configuration" && <AIConfigurationPage embedded />}
        {activeTab === "performance" && <AIPerformanceInsightsPage embedded />}
        {activeTab === "oversight" && <HumanOversightPage embedded />}
      </div>
    </div>
  );
}
