import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, FolderTree } from "lucide-react";
import { useLocation } from "wouter";

import KnowledgeManagementPage from "./KnowledgeManagementPage";
import DocFrameworkPage from "./DocFrameworkPage";
import FileManagementPage from "./FileManagementPage";

export default function KnowledgeHubPage() {
  const [location] = useLocation();
  
  const getDefaultTab = () => {
    if (location.includes("doc-framework")) return "framework";
    if (location.includes("files")) return "files";
    return "articles";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground">Manage articles, documentation, and files</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="articles" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Articles</span>
                <span className="sm:hidden">KB</span>
              </TabsTrigger>
              <TabsTrigger value="framework" className="flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                <span className="hidden sm:inline">Doc Framework</span>
                <span className="sm:hidden">Docs</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Files</span>
                <span className="sm:hidden">Files</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {activeTab === "articles" && <KnowledgeManagementPage embedded />}
        {activeTab === "framework" && <DocFrameworkPage embedded />}
        {activeTab === "files" && <FileManagementPage embedded />}
      </div>
    </div>
  );
}
