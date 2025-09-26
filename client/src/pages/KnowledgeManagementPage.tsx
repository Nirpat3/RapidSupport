import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  TrendingUp,
  Target,
  Clock,
  Tag,
  FileText,
  BookOpen,
  Upload,
  Link,
  User,
  Filter,
  File,
  Globe
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Knowledge article form schemas
const knowledgeArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  content: z.string().min(10, "Content must be at least 10 characters").max(10000, "Content must be under 10000 characters"),
  category: z.string().min(1, "Category is required"),
  tags: z.string().optional(),
  priority: z.number().min(1).max(100).default(50),
  isActive: z.boolean().default(true),
  assignedAgentIds: z.array(z.string()).optional(),
});

const urlKnowledgeSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  category: z.string().min(1, "Category is required"),
  tags: z.string().optional(),
  priority: z.number().min(1).max(100).default(50),
  assignedAgentIds: z.array(z.string()).optional(),
});

const fileKnowledgeSchema = z.object({
  files: z.any().refine((files) => files && files.length > 0, "Please select at least one file"),
  category: z.string().min(1, "Category is required"),
  tags: z.string().optional(),
  priority: z.number().min(1).max(100).default(50),
  assignedAgentIds: z.array(z.string()).optional(),
});

type KnowledgeArticleForm = z.infer<typeof knowledgeArticleSchema>;
type UrlKnowledgeForm = z.infer<typeof urlKnowledgeSchema>;
type FileKnowledgeForm = z.infer<typeof fileKnowledgeSchema>;

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  isActive: boolean;
  priority: number;
  usageCount: number;
  effectiveness: number;
  sourceType: 'manual' | 'file' | 'url';
  fileName?: string;
  fileType?: string;
  sourceUrl?: string;
  assignedAgentIds?: string[];
  createdBy?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

const categories = [
  "Technical Support",
  "Billing & Payments", 
  "Product Information",
  "Account Management",
  "Troubleshooting",
  "General FAQ",
  "Company Policy",
  "Integration Help"
];

export default function KnowledgeManagementPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSourceType, setSelectedSourceType] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [activeTab, setActiveTab] = useState("manual");

  // Fetch all knowledge base articles
  const { data: articles = [], isLoading, refetch } = useQuery<KnowledgeArticle[]>({
    queryKey: ['/api/knowledge-base'],
  });

  // Fetch AI agents for assignment
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/ai-agents'],
  });

  // Create article mutation
  const createMutation = useMutation({
    mutationFn: (data: KnowledgeArticleForm) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };
      return apiRequest('POST', '/api/knowledge-base', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Knowledge article created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create knowledge article.",
        variant: "destructive",
      });
    },
  });

  // Update article mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: KnowledgeArticleForm }) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };
      return apiRequest('PUT', `/api/knowledge-base/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
      setEditingArticle(null);
      toast({
        title: "Success",
        description: "Knowledge article updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update knowledge article.",
        variant: "destructive",
      });
    },
  });

  // Delete article mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/knowledge-base/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
      toast({
        title: "Success",
        description: "Knowledge article deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete knowledge article.",
        variant: "destructive",
      });
    },
  });

  // URL knowledge creation mutation
  const createFromUrlMutation = useMutation({
    mutationFn: (data: UrlKnowledgeForm) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        sourceType: 'url' as const,
      };
      return apiRequest('POST', '/api/knowledge-base/from-url', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Knowledge article created from URL successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create knowledge article from URL.",
        variant: "destructive",
      });
    },
  });

  // File upload mutation
  const createFromFilesMutation = useMutation({
    mutationFn: (data: { files: FileList; category: string; tags: string; priority: number; assignedAgentIds?: string[] }) => {
      const formData = new FormData();
      Array.from(data.files).forEach((file) => {
        formData.append('files', file);
      });
      formData.append('category', data.category);
      formData.append('tags', data.tags);
      formData.append('priority', data.priority.toString());
      if (data.assignedAgentIds) {
        formData.append('assignedAgentIds', JSON.stringify(data.assignedAgentIds));
      }
      return apiRequest('POST', '/api/knowledge-base/from-files', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Knowledge articles created from files successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create knowledge articles from files.",
        variant: "destructive",
      });
    },
  });

  // Filter articles based on search, category, source type, and agent
  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchQuery === "" || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    const matchesSourceType = selectedSourceType === "all" || article.sourceType === selectedSourceType;
    const matchesAgent = selectedAgent === "all" || 
      (article.assignedAgentIds && article.assignedAgentIds.includes(selectedAgent));
    
    return matchesSearch && matchesCategory && matchesSourceType && matchesAgent;
  });

  // Calculate summary statistics
  const totalArticles = articles.length;
  const activeArticles = articles.filter(a => a.isActive).length;
  const avgEffectiveness = articles.length > 0 
    ? Math.round(articles.reduce((sum, a) => sum + a.effectiveness, 0) / articles.length)
    : 0;
  const totalUsage = articles.reduce((sum, a) => sum + a.usageCount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Knowledge Management</h1>
          <p className="text-muted-foreground">Manage AI knowledge base articles and track effectiveness</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-article">
              <Plus className="w-4 h-4 mr-2" />
              Add Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Knowledge Base Content</DialogTitle>
              <DialogDescription>
                Add content to the knowledge base through manual entry, file upload, or URL.
              </DialogDescription>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  File Upload
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  From URL
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="mt-4">
                <KnowledgeArticleForm
                  onSubmit={(data) => createMutation.mutate(data)}
                  isSubmitting={createMutation.isPending}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  agents={agents}
                />
              </TabsContent>
              
              <TabsContent value="files" className="mt-4">
                <FileUploadForm
                  onSubmit={(data) => createFromFilesMutation.mutate(data)}
                  isSubmitting={createFromFilesMutation.isPending}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  agents={agents}
                />
              </TabsContent>
              
              <TabsContent value="url" className="mt-4">
                <UrlKnowledgeForm
                  onSubmit={(data) => createFromUrlMutation.mutate(data)}
                  isSubmitting={createFromUrlMutation.isPending}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  agents={agents}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-articles">{totalArticles}</div>
            <p className="text-xs text-muted-foreground">
              {activeArticles} active, {totalArticles - activeArticles} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Effectiveness</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-effectiveness">{avgEffectiveness}%</div>
            <p className="text-xs text-muted-foreground">
              Based on customer feedback
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-usage">{totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Times referenced by AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-categories">{new Set(articles.map(a => a.category)).size}</div>
            <p className="text-xs text-muted-foreground">
              Different knowledge areas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedSourceType} onValueChange={setSelectedSourceType}>
          <SelectTrigger className="w-[150px]" data-testid="select-source-type">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="manual">Manual Entry</SelectItem>
            <SelectItem value="file">File Upload</SelectItem>
            <SelectItem value="url">URL Import</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-[200px]" data-testid="select-agent">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No articles found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "all" 
                ? "Try adjusting your search or filters."
                : "Create your first knowledge base article to get started."
              }
            </p>
            {!searchQuery && selectedCategory === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Article
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold" data-testid={`article-title-${article.id}`}>
                        {article.title}
                      </h3>
                      {!article.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {/* Source Type Badge */}
                      <Badge variant="outline" className="text-xs">
                        {article.sourceType === 'manual' && (
                          <><FileText className="w-3 h-3 mr-1" />Manual</>
                        )}
                        {article.sourceType === 'file' && (
                          <><File className="w-3 h-3 mr-1" />File</>
                        )}
                        {article.sourceType === 'url' && (
                          <><Globe className="w-3 h-3 mr-1" />URL</>
                        )}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {article.content.length > 200 
                        ? `${article.content.substring(0, 200)}...` 
                        : article.content
                      }
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                      <div className="space-y-1">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {article.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Used {article.usageCount} times
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {article.effectiveness}% effective
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Priority {article.priority}
                        </span>
                      </div>
                    </div>
                    
                    {/* File or URL Information */}
                    {article.sourceType === 'file' && article.fileName && (
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <File className="w-3 h-3" />
                        <span>{article.fileName}</span>
                        {article.fileType && <span>({article.fileType})</span>}
                      </div>
                    )}
                    {article.sourceType === 'url' && article.sourceUrl && (
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Link className="w-3 h-3" />
                        <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[300px]">
                          {article.sourceUrl}
                        </a>
                      </div>
                    )}
                    
                    {/* Assigned Agents */}
                    {article.assignedAgentIds && article.assignedAgentIds.length > 0 && (
                      <div className="text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1 mb-1">
                          <User className="w-3 h-3" />
                          Assigned Agents:
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {article.assignedAgentIds.map((agentId) => {
                            const agent = agents.find(a => a.id === agentId);
                            return (
                              <Badge key={agentId} variant="secondary" className="text-xs">
                                {agent?.name || 'Unknown Agent'}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {article.tags && article.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {article.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingArticle(article)}
                      data-testid={`button-edit-${article.id}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this article?")) {
                          deleteMutation.mutate(article.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${article.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingArticle && (
        <Dialog open={true} onOpenChange={() => setEditingArticle(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Knowledge Article</DialogTitle>
              <DialogDescription>
                Update the knowledge base article details.
              </DialogDescription>
            </DialogHeader>
            <KnowledgeArticleForm
              defaultValues={{
                title: editingArticle.title,
                content: editingArticle.content,
                category: editingArticle.category,
                tags: editingArticle.tags?.join(', ') || '',
                priority: editingArticle.priority,
                isActive: editingArticle.isActive,
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editingArticle.id, data })}
              isSubmitting={updateMutation.isPending}
              onCancel={() => setEditingArticle(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Form component for creating/editing knowledge articles
function KnowledgeArticleForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  onCancel,
  agents = [],
}: {
  defaultValues?: Partial<KnowledgeArticleForm>;
  onSubmit: (data: KnowledgeArticleForm) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  agents?: Agent[];
}) {
  const form = useForm<KnowledgeArticleForm>({
    resolver: zodResolver(knowledgeArticleSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "",
      tags: "",
      priority: 50,
      isActive: true,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter article title..."
                  {...field}
                  data-testid="input-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-category-form">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the knowledge content that AI agents can reference..."
                  className="min-h-[200px] resize-none"
                  {...field}
                  data-testid="textarea-content"
                />
              </FormControl>
              <FormDescription>
                This content will be used by AI agents to answer customer questions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="billing, technical, setup (comma-separated)"
                    {...field}
                    data-testid="input-tags"
                  />
                </FormControl>
                <FormDescription>
                  Comma-separated tags for better searchability
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority (1-100)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="1"
                    max="100"
                    placeholder="50"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value) || 50)}
                    data-testid="input-priority"
                  />
                </FormControl>
                <FormDescription>
                  Higher priority articles are preferred by AI
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Agent Assignment */}
        {agents.length > 0 && (
          <FormField
            control={form.control}
            name="assignedAgentIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to AI Agents</FormLabel>
                <FormDescription>
                  Select which AI agents can access this knowledge article
                </FormDescription>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`agent-${agent.id}`}
                        checked={field.value?.includes(agent.id) || false}
                        onCheckedChange={(checked) => {
                          const currentIds = field.value || [];
                          if (checked) {
                            field.onChange([...currentIds, agent.id]);
                          } else {
                            field.onChange(currentIds.filter(id => id !== agent.id));
                          }
                        }}
                        data-testid={`checkbox-agent-${agent.id}`}
                      />
                      <Label htmlFor={`agent-${agent.id}`} className="text-sm">
                        {agent.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-active"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Active Article
                </FormLabel>
                <FormDescription>
                  Only active articles can be used by AI agents
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="button-save-article">
            {isSubmitting ? "Saving..." : "Save Article"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// File upload form component
function FileUploadForm({
  onSubmit,
  isSubmitting,
  onCancel,
  agents = [],
}: {
  onSubmit: (data: { files: FileList; category: string; tags: string; priority: number; assignedAgentIds?: string[] }) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  agents?: Agent[];
}) {
  const form = useForm({
    resolver: zodResolver(fileKnowledgeSchema),
    defaultValues: {
      category: "",
      tags: "",
      priority: 50,
      assignedAgentIds: [],
    },
  });

  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleSubmit = (data: any) => {
    if (selectedFiles) {
      onSubmit({
        files: selectedFiles,
        category: data.category,
        tags: data.tags,
        priority: data.priority,
        assignedAgentIds: data.assignedAgentIds,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Upload Files</Label>
          <Input
            id="file-upload"
            type="file"
            multiple
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={(e) => {
              setSelectedFiles(e.target.files);
              form.setValue('files', e.target.files);
            }}
            className="cursor-pointer"
            data-testid="input-files"
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: TXT, MD, PDF, DOC, DOCX. Multiple files can be selected.
          </p>
          {selectedFiles && selectedFiles.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium mb-1">Selected files:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {Array.from(selectedFiles).map((file, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <File className="w-3 h-3" />
                    <span>{file.name}</span>
                    <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-category-file">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="billing, technical, setup (comma-separated)"
                    {...field}
                    data-testid="input-tags-file"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority (1-100)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="1"
                    max="100"
                    placeholder="50"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value) || 50)}
                    data-testid="input-priority-file"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Agent Assignment */}
        {agents.length > 0 && (
          <FormField
            control={form.control}
            name="assignedAgentIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to AI Agents</FormLabel>
                <FormDescription>
                  Select which AI agents can access this knowledge
                </FormDescription>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`file-agent-${agent.id}`}
                        checked={field.value?.includes(agent.id) || false}
                        onCheckedChange={(checked) => {
                          const currentIds = field.value || [];
                          if (checked) {
                            field.onChange([...currentIds, agent.id]);
                          } else {
                            field.onChange(currentIds.filter(id => id !== agent.id));
                          }
                        }}
                        data-testid={`checkbox-file-agent-${agent.id}`}
                      />
                      <Label htmlFor={`file-agent-${agent.id}`} className="text-sm">
                        {agent.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedFiles} data-testid="button-upload-files">
            {isSubmitting ? "Uploading..." : "Upload Files"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// URL knowledge form component
function UrlKnowledgeForm({
  onSubmit,
  isSubmitting,
  onCancel,
  agents = [],
}: {
  onSubmit: (data: UrlKnowledgeForm) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  agents?: Agent[];
}) {
  const form = useForm<UrlKnowledgeForm>({
    resolver: zodResolver(urlKnowledgeSchema),
    defaultValues: {
      url: "",
      category: "",
      tags: "",
      priority: 50,
      assignedAgentIds: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com/article"
                  type="url"
                  {...field}
                  data-testid="input-url"
                />
              </FormControl>
              <FormDescription>
                The system will extract content from this URL and create knowledge articles
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-category-url">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="billing, technical, setup (comma-separated)"
                    {...field}
                    data-testid="input-tags-url"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority (1-100)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="1"
                    max="100"
                    placeholder="50"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value) || 50)}
                    data-testid="input-priority-url"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Agent Assignment */}
        {agents.length > 0 && (
          <FormField
            control={form.control}
            name="assignedAgentIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to AI Agents</FormLabel>
                <FormDescription>
                  Select which AI agents can access this knowledge
                </FormDescription>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`url-agent-${agent.id}`}
                        checked={field.value?.includes(agent.id) || false}
                        onCheckedChange={(checked) => {
                          const currentIds = field.value || [];
                          if (checked) {
                            field.onChange([...currentIds, agent.id]);
                          } else {
                            field.onChange(currentIds.filter(id => id !== agent.id));
                          }
                        }}
                        data-testid={`checkbox-url-agent-${agent.id}`}
                      />
                      <Label htmlFor={`url-agent-${agent.id}`} className="text-sm">
                        {agent.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="button-import-url">
            {isSubmitting ? "Importing..." : "Import from URL"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}