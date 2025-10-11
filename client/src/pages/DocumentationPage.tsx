import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, BarChart3, Users, Bot, Activity, Brain, UserCheck, 
  BookOpen, File, Rss, Settings, Shield, TrendingUp, Bell, 
  Code, FileText, GitBranch, Database, Zap, Lock
} from "lucide-react";

export default function DocumentationPage() {
  const adminRoutes = [
    { path: "/conversations", name: "Conversations", icon: MessageSquare, description: "View and manage customer conversations" },
    { path: "/activity", name: "Activity", icon: Bell, description: "View activity notifications and mentions" },
    { path: "/dashboard", name: "Dashboard", icon: BarChart3, description: "System analytics and metrics" },
    { path: "/customers", name: "Customers", icon: Users, description: "Manage customer information" },
    { path: "/ai-agents", name: "AI Agents", icon: Bot, description: "Manage AI agents and configurations" },
    { path: "/ai-dashboard", name: "Staff AI Dashboard", icon: Activity, description: "Monitor AI agent performance" },
    { path: "/ai-training", name: "AI Training", icon: Brain, description: "Review and provide feedback on AI responses" },
    { path: "/ai-learning", name: "AI Learning", icon: TrendingUp, description: "View AI learning data and analytics" },
    { path: "/agent-management", name: "Agent Management", icon: Settings, description: "Create, edit, and delete AI agents", adminOnly: true },
    { path: "/ai-takeover", name: "AI Takeover", icon: UserCheck, description: "Monitor AI conversations for human intervention" },
    { path: "/knowledge", name: "Knowledge Base", icon: BookOpen, description: "Manage knowledge base articles" },
    { path: "/files", name: "File Management", icon: File, description: "Upload, organize, and manage files" },
    { path: "/analytics", name: "Analytics", icon: TrendingUp, description: "View performance reports" },
    { path: "/feedback", name: "Feedback", icon: MessageSquare, description: "Review customer feedback and ratings" },
    { path: "/feed", name: "Feed", icon: Rss, description: "Manage posts and announcements" },
    { path: "/user-management", name: "User Management", icon: Shield, description: "Manage staff roles and permissions", adminOnly: true },
    { path: "/settings", name: "Settings", icon: Settings, description: "Configure application settings" },
  ];

  const publicRoutes = [
    { path: "/support", name: "Support Center", icon: BookOpen, description: "AI-powered knowledge base search" },
    { path: "/support-widget", name: "Support Widget", icon: MessageSquare, description: "Embeddable customer support widget" },
  ];

  const apiEndpoints = [
    { endpoint: "/api/external/customers", method: "GET", description: "Get all customers" },
    { endpoint: "/api/external/customers/{id}", method: "GET", description: "Get customer by ID" },
    { endpoint: "/api/external/customers/sync", method: "POST", description: "Sync customer from external system" },
    { endpoint: "/api/external/tickets", method: "GET", description: "Get all tickets" },
    { endpoint: "/api/external/tickets/{id}", method: "GET", description: "Get ticket by ID" },
    { endpoint: "/api/external/tickets/sync", method: "POST", description: "Sync ticket from external system" },
    { endpoint: "/api/external/webhook", method: "POST", description: "Receive webhooks from external systems" },
  ];

  const features = [
    { name: "Real-time Chat", icon: MessageSquare, description: "Custom WebSocket server for live messaging" },
    { name: "AI Agents", icon: Bot, description: "Multi-agent AI with GPT-4o-mini for smart routing" },
    { name: "Knowledge Base", icon: BookOpen, description: "AI-powered semantic search and answers" },
    { name: "File Management", icon: File, description: "Support for attachments, images, and documents" },
    { name: "Analytics", icon: BarChart3, description: "Comprehensive performance metrics" },
    { name: "Permissions", icon: Lock, description: "Granular role-based access control" },
    { name: "Multi-channel", icon: Zap, description: "WhatsApp, Telegram, Facebook Messenger" },
    { name: "API Integration", icon: Code, description: "RESTful API with Node.js, Python, PHP SDKs" },
  ];

  const documentationFiles = [
    { name: "DEVELOPER_GUIDE.md", description: "Technical architecture and API documentation", icon: Code },
    { name: "CODING_GUIDELINES.md", description: "Development standards and best practices", icon: FileText },
    { name: "END_USER_GUIDE.md", description: "User documentation for admins, agents, and customers", icon: BookOpen },
    { name: "INTEGRATION_GUIDE.md", description: "Widget integration and API usage", icon: GitBranch },
    { name: "integration-docs/README.md", description: "External API reference", icon: Code },
    { name: "integration-docs/examples/nodejs-sdk.md", description: "Node.js SDK examples", icon: Code },
    { name: "integration-docs/examples/python-integration.md", description: "Python integration examples", icon: Code },
    { name: "integration-docs/examples/php-integration.md", description: "PHP integration examples", icon: Code },
    { name: "integration-docs/examples/curl-examples.md", description: "cURL command examples", icon: Code },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="title-documentation">Documentation & Sitemap</h1>
        <p className="text-muted-foreground">
          Complete guide to Support Board features, routes, APIs, and integration
        </p>
      </div>

      <Tabs defaultValue="routes" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="routes" data-testid="tab-routes">Routes</TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">Features</TabsTrigger>
          <TabsTrigger value="api" data-testid="tab-api">API</TabsTrigger>
          <TabsTrigger value="docs" data-testid="tab-docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Admin Panel Routes
              </CardTitle>
              <CardDescription>All available pages in the admin dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {adminRoutes.map((route) => (
                  <div 
                    key={route.path} 
                    className="flex items-start gap-3 p-3 rounded-lg border hover-elevate" 
                    data-testid={`route-${route.path.slice(1)}`}
                  >
                    <div className="mt-0.5">
                      <route.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{route.path}</code>
                        {route.adminOnly && <Badge variant="destructive" className="text-xs">Admin Only</Badge>}
                      </div>
                      <p className="text-sm font-medium">{route.name}</p>
                      <p className="text-xs text-muted-foreground">{route.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Public Routes
              </CardTitle>
              <CardDescription>Customer-facing pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {publicRoutes.map((route) => (
                  <div key={route.path} className="flex items-start gap-3 p-3 rounded-lg border hover-elevate">
                    <div className="mt-0.5">
                      <route.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded mb-1 inline-block">{route.path}</code>
                      <p className="text-sm font-medium">{route.name}</p>
                      <p className="text-xs text-muted-foreground">{route.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Features</CardTitle>
              <CardDescription>Key capabilities of Support Board</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature.name} className="flex items-start gap-3 p-4 rounded-lg border hover-elevate">
                    <div className="mt-1">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{feature.name}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                External API Endpoints
              </CardTitle>
              <CardDescription>
                Authenticate with <code className="bg-muted px-1 py-0.5 rounded">X-API-Key: your_api_key</code> header
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {apiEndpoints.map((endpoint, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border hover-elevate">
                    <Badge className="mt-0.5 shrink-0">{endpoint.method}</Badge>
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono text-primary break-all">{endpoint.endpoint}</code>
                      <p className="text-xs text-muted-foreground mt-1">{endpoint.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SDKs & Examples</CardTitle>
              <CardDescription>Integration libraries available</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Node.js SDK</h3>
                  <code className="text-xs bg-muted px-2 py-1 rounded block">integration-docs/examples/nodejs-sdk.md</code>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Python SDK</h3>
                  <code className="text-xs bg-muted px-2 py-1 rounded block">integration-docs/examples/python-integration.md</code>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">PHP SDK</h3>
                  <code className="text-xs bg-muted px-2 py-1 rounded block">integration-docs/examples/php-integration.md</code>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">cURL Examples</h3>
                  <code className="text-xs bg-muted px-2 py-1 rounded block">integration-docs/examples/curl-examples.md</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documentation Files
              </CardTitle>
              <CardDescription>Available documentation in the repository</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {documentationFiles.map((doc) => (
                  <div key={doc.name} className="flex items-start gap-3 p-3 rounded-lg border hover-elevate">
                    <div className="mt-0.5">
                      <doc.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded mb-1 inline-block">{doc.name}</code>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
