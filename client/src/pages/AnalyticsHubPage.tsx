import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Home, Star } from "lucide-react";
import { useLocation } from "wouter";

import DashboardPage from "./DashboardPage";
import AgentAnalyticsPage from "./AgentAnalyticsPage";
import FeedbackEvaluationPage from "./FeedbackEvaluationPage";

export default function AnalyticsHubPage() {
  const [location] = useLocation();
  
  const getDefaultTab = () => {
    if (location.includes("analytics")) return "analytics";
    if (location.includes("feedback")) return "feedback";
    return "dashboard";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
              <p className="text-sm text-muted-foreground">Monitor performance, metrics, and customer feedback</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Home</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">Feedback</span>
                <span className="sm:hidden">Reviews</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {activeTab === "dashboard" && <DashboardPage embedded />}
        {activeTab === "analytics" && <AgentAnalyticsPage embedded />}
        {activeTab === "feedback" && <FeedbackEvaluationPage embedded />}
      </div>
    </div>
  );
}
