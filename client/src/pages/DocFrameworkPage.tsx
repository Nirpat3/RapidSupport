import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  FolderTree,
  Search,
  Plus,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Tags,
  Upload,
  BookOpen,
  GitBranch,
  Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  organizationId: string | null;
  isDefault: boolean;
  settings: any;
  createdAt: string;
  updatedAt: string;
}

interface DocDomain {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface DocIntent {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  workspaceId: string;
  domainId: string | null;
  intentId: string | null;
  slug: string;
  title: string;
  summary: string | null;
  currentVersion: string | null;
  currentVersionId: string | null;
  status: string;
  accessLevel: string;
  aiAgentIds: string[] | null;
  tags: string[] | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  versionNumber: number;
  content: string;
  yamlFrontmatter: string | null;
  changeLog: string | null;
  status: string;
  isAiGenerated: boolean;
  createdBy: string | null;
  createdAt: string;
  publishedAt: string | null;
}

interface ImportJob {
  id: string;
  sourceFileId: string;
  sourceFileName: string;
  sourceFileType: string;
  status: string;
  progress: number;
  documentsCreated: number;
  documentsNeedingReview: number;
  errorMessage: string | null;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  workspaceId: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReviewQueueItem {
  id: string;
  documentVersionId: string;
  status: string;
  reviewerId: string | null;
  reviewNotes: string | null;
  isAiGenerated: boolean;
  aiConfidence: number | null;
  needsReview: boolean;
  decidedAt: string | null;
  createdAt: string;
  version: {
    id: string;
    documentId: string;
    version: string;
    content: string;
    yamlFrontmatter: string | null;
  };
  document: {
    id: string;
    title: string;
    slug: string;
    status: string;
    accessLevel: string;
  };
}

const createDocSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  summary: z.string().optional(),
  domainId: z.string().optional(),
  intentId: z.string().optional(),
  accessLevel: z.enum(["public", "internal", "restricted"]),
});

const createVersionSchema = z.object({
  content: z.string().min(1, "Content is required"),
  changeLog: z.string().optional(),
});

export default function DocFrameworkPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editVersionDialogOpen, setEditVersionDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("explorer");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [filterIntent, setFilterIntent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery<Workspace[]>({
    queryKey: ['/api/workspaces'],
  });

  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      const defaultWs = workspaces.find(ws => ws.isDefault) || workspaces[0];
      setSelectedWorkspaceId(defaultWs.id);
    }
  }, [workspaces, selectedWorkspaceId]);

  const buildDomainsUrl = () => {
    const params = new URLSearchParams();
    if (selectedWorkspaceId) params.append('workspaceId', selectedWorkspaceId);
    return `/api/docs/domains?${params.toString()}`;
  };

  const buildIntentsUrl = () => {
    const params = new URLSearchParams();
    if (selectedWorkspaceId) params.append('workspaceId', selectedWorkspaceId);
    return `/api/docs/intents?${params.toString()}`;
  };

  const buildDocumentsUrl = () => {
    const params = new URLSearchParams();
    if (selectedWorkspaceId) params.append('workspaceId', selectedWorkspaceId);
    if (filterDomain !== 'all') params.append('domainId', filterDomain);
    if (filterIntent !== 'all') params.append('intentId', filterIntent);
    if (filterStatus !== 'all') params.append('status', filterStatus);
    if (searchQuery) params.append('search', searchQuery);
    return `/api/docs/documents?${params.toString()}`;
  };

  const { data: domains = [], isLoading: domainsLoading } = useQuery<DocDomain[]>({
    queryKey: [buildDomainsUrl()],
    enabled: !!selectedWorkspaceId,
  });

  const { data: intents = [], isLoading: intentsLoading } = useQuery<DocIntent[]>({
    queryKey: [buildIntentsUrl()],
    enabled: !!selectedWorkspaceId,
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: [buildDocumentsUrl()],
    enabled: !!selectedWorkspaceId,
  });

  const { data: selectedDocVersions = [], isLoading: versionsLoading } = useQuery<DocumentVersion[]>({
    queryKey: ['/api/docs/documents', selectedDoc?.id, 'versions'],
    enabled: !!selectedDoc,
  });

  const buildImportJobsUrl = () => {
    const params = new URLSearchParams();
    if (selectedWorkspaceId) params.append('workspaceId', selectedWorkspaceId);
    return `/api/docs/import-jobs?${params.toString()}`;
  };

  const { data: importJobs = [], isLoading: importJobsLoading } = useQuery<ImportJob[]>({
    queryKey: [buildImportJobsUrl()],
    enabled: !!selectedWorkspaceId,
    refetchInterval: 5000,
  });

  const buildReviewQueueUrl = () => {
    const params = new URLSearchParams();
    if (selectedWorkspaceId) params.append('workspaceId', selectedWorkspaceId);
    params.append('status', 'pending');
    return `/api/docs/review-queue?${params.toString()}`;
  };

  const { data: reviewQueue = [], isLoading: reviewQueueLoading } = useQuery<ReviewQueueItem[]>({
    queryKey: [buildReviewQueueUrl()],
    enabled: !!selectedWorkspaceId,
  });

  const approveMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest(`/api/docs/review-queue/${reviewId}/approve`, 'POST', { notes: '' });
    },
    onSuccess: () => {
      toast({ title: "Document approved", description: "The document is now published" });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (key.startsWith('/api/docs/review-queue') || key.startsWith('/api/docs/documents'));
        }
      });
    },
    onError: (error: Error) => {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ reviewId, notes }: { reviewId: string; notes: string }) => {
      return apiRequest(`/api/docs/review-queue/${reviewId}/reject`, 'POST', { notes });
    },
    onSuccess: () => {
      toast({ title: "Document rejected" });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/docs/review-queue');
        }
      });
    },
    onError: (error: Error) => {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', selectedWorkspaceId || '');
      
      const response = await fetch('/api/docs/import-jobs/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded", description: "AI processing started..." });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/docs/import-jobs');
        }
      });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  });

  const handleFileUpload = (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(file);
  };

  const createForm = useForm<z.infer<typeof createDocSchema>>({
    resolver: zodResolver(createDocSchema),
    defaultValues: {
      title: "",
      slug: "",
      summary: "",
      accessLevel: "internal",
    }
  });

  const versionForm = useForm<z.infer<typeof createVersionSchema>>({
    resolver: zodResolver(createVersionSchema),
    defaultValues: {
      content: "",
      changeLog: "",
    }
  });

  const createDocMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createDocSchema>) => {
      return apiRequest('/api/docs/documents', 'POST', {
        ...data,
        workspaceId: selectedWorkspaceId,
        domainId: data.domainId || null,
        intentId: data.intentId || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Document created successfully" });
      setCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/docs/documents');
        }
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create document", description: error.message, variant: "destructive" });
    }
  });

  const createVersionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createVersionSchema>) => {
      const latestVersion = selectedDocVersions[0];
      const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
      
      return apiRequest(`/api/docs/documents/${selectedDoc?.id}/versions`, 'POST', {
        ...data,
        version: `1.${nextVersionNumber}.0`,
        versionNumber: nextVersionNumber,
        status: 'draft',
        isAiGenerated: false,
      });
    },
    onSuccess: () => {
      toast({ title: "Version created successfully" });
      setEditVersionDialogOpen(false);
      versionForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/docs/documents', selectedDoc?.id, 'versions'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create version", description: error.message, variant: "destructive" });
    }
  });

  const publishVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return apiRequest(`/api/docs/versions/${versionId}/publish`, 'POST');
    },
    onSuccess: () => {
      toast({ title: "Version published successfully" });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/docs/documents');
        }
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to publish version", description: error.message, variant: "destructive" });
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return apiRequest(`/api/docs/documents/${docId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "Document deleted" });
      setSelectedDoc(null);
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/docs/documents');
        }
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete document", description: error.message, variant: "destructive" });
    }
  });

  const filteredDocuments = documents.filter(doc => {
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'archived':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVersionStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-600">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'pending_review':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDomainName = (domainId: string | null) => {
    if (!domainId) return null;
    return domains.find(d => d.id === domainId)?.name || null;
  };

  const getIntentName = (intentId: string | null) => {
    if (!intentId) return null;
    return intents.find(i => i.id === intentId)?.name || null;
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Documentation Framework
          </h1>
          <p className="text-muted-foreground">
            Manage structured documentation for AI agents and internal knowledge
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Document
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="explorer">
            <FolderTree className="w-4 h-4 mr-2" />
            Explorer
          </TabsTrigger>
          <TabsTrigger value="taxonomy">
            <Tags className="w-4 h-4 mr-2" />
            Taxonomy
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="w-4 h-4 mr-2" />
            Import Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explorer">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-7 text-xs w-24">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    {domains.length > 0 && (
                      <Select value={filterDomain} onValueChange={setFilterDomain}>
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue placeholder="Domain" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Domains</SelectItem>
                          {domains.map(domain => (
                            <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {documentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredDocuments.length > 0 ? (
                      <div className="divide-y">
                        {filteredDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className={`p-3 cursor-pointer transition-colors hover-elevate ${
                              selectedDoc?.id === doc.id ? 'bg-accent' : ''
                            }`}
                            onClick={() => setSelectedDoc(doc)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">{doc.title}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {doc.slug}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  {getStatusBadge(doc.status)}
                                  {doc.currentVersion && (
                                    <Badge variant="outline" className="text-xs">
                                      v{doc.currentVersion}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No documents found</p>
                        <Button variant="ghost" onClick={() => setCreateDialogOpen(true)}>
                          Create your first document
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {selectedDoc ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          {selectedDoc.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {selectedDoc.summary || 'No summary provided'}
                        </CardDescription>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {getStatusBadge(selectedDoc.status)}
                          {getDomainName(selectedDoc.domainId) && (
                            <Badge variant="outline">{getDomainName(selectedDoc.domainId)}</Badge>
                          )}
                          {getIntentName(selectedDoc.intentId) && (
                            <Badge variant="outline">{getIntentName(selectedDoc.intentId)}</Badge>
                          )}
                          <Badge variant="outline">{selectedDoc.accessLevel}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setEditVersionDialogOpen(true)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this document?')) {
                              deleteDocMutation.mutate(selectedDoc.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="versions">
                      <TabsList className="mb-4">
                        <TabsTrigger value="versions">
                          <GitBranch className="w-4 h-4 mr-2" />
                          Versions
                        </TabsTrigger>
                        <TabsTrigger value="relationships">
                          <Link2 className="w-4 h-4 mr-2" />
                          Relationships
                        </TabsTrigger>
                        <TabsTrigger value="preview">
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="versions">
                        {versionsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : selectedDocVersions.length > 0 ? (
                          <div className="space-y-3">
                            {selectedDocVersions.map((version) => (
                              <div key={version.id} className="p-4 rounded-lg border">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline">v{version.version}</Badge>
                                    {getVersionStatusBadge(version.status)}
                                    {version.isAiGenerated && (
                                      <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {version.status === 'draft' && (
                                      <Button 
                                        size="sm" 
                                        onClick={() => publishVersionMutation.mutate(version.id)}
                                        disabled={publishVersionMutation.isPending}
                                      >
                                        {publishVersionMutation.isPending ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          'Publish'
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  {version.changeLog || 'No changelog provided'}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Created: {new Date(version.createdAt).toLocaleDateString()}
                                  {version.publishedAt && ` | Published: ${new Date(version.publishedAt).toLocaleDateString()}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <GitBranch className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No versions yet</p>
                            <Button variant="ghost" onClick={() => setEditVersionDialogOpen(true)}>
                              Create first version
                            </Button>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="relationships">
                        <div className="text-center py-8 text-muted-foreground">
                          <Link2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>Document relationships</p>
                          <p className="text-sm">Link related documents, dependencies, and references</p>
                        </div>
                      </TabsContent>

                      <TabsContent value="preview">
                        {selectedDocVersions[0] ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                              {selectedDocVersions[0].content}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>No published content to preview</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-[600px] flex items-center justify-center">
                  <CardContent className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Select a Document</h3>
                    <p className="text-muted-foreground">
                      Choose a document from the list to view its details and versions.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="taxonomy">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="w-5 h-5" />
                  Domains
                </CardTitle>
                <CardDescription>
                  Categorize documents by subject domain (e.g., API, Integration, Workflow)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {domainsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : domains.length > 0 ? (
                  <div className="space-y-2">
                    {domains.map((domain) => (
                      <div key={domain.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-medium">{domain.name}</div>
                          <div className="text-sm text-muted-foreground">{domain.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No domains defined</p>
                    <p className="text-sm">Add domains to categorize your documents</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="w-5 h-5" />
                  Intents
                </CardTitle>
                <CardDescription>
                  Define document purposes (e.g., How-To, Reference, Troubleshooting)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {intentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : intents.length > 0 ? (
                  <div className="space-y-2">
                    {intents.map((intent) => (
                      <div key={intent.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-medium">{intent.name}</div>
                          <div className="text-sm text-muted-foreground">{intent.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No intents defined</p>
                    <p className="text-sm">Add intents to categorize document purposes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Document
                </CardTitle>
                <CardDescription>
                  Upload documents (PDF, DOCX, TXT) for AI processing and conversion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary hover:bg-muted/50"
                  onClick={() => document.getElementById('doc-import-file')?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-muted/50'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-muted/50'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary', 'bg-muted/50');
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileUpload(file);
                  }}
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium mb-1">Drop file here or click to browse</p>
                  <p className="text-sm text-muted-foreground">Supported: PDF, DOCX, TXT (max 10MB)</p>
                </div>
                <input
                  id="doc-import-file"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = '';
                  }}
                />
                {uploadMutation.isPending && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading and processing...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Import Jobs
                </CardTitle>
                <CardDescription>
                  Track the status of document imports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {importJobsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : importJobs.length > 0 ? (
                  <div className="space-y-3">
                    {importJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{job.sourceFileName}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(job.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {job.status === 'processing' && (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">{job.progress}%</span>
                            </div>
                          )}
                          {job.status === 'completed' && (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {job.status === 'failed' && (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                          {job.status === 'pending' && (
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No import jobs yet</p>
                    <p className="text-sm">Upload a document to start an import</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Review Queue
                  {reviewQueue.length > 0 && (
                    <Badge variant="secondary">{reviewQueue.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Approve or reject AI-generated documents before publishing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewQueueLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : reviewQueue.length > 0 ? (
                  <div className="space-y-4">
                    {reviewQueue.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{item.document.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                v{item.version.version}
                              </Badge>
                              {item.isAiGenerated && (
                                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                  AI Generated
                                </Badge>
                              )}
                              {item.aiConfidence && (
                                <span className="text-xs text-muted-foreground">
                                  {item.aiConfidence}% confidence
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => rejectMutation.mutate({ reviewId: item.id, notes: 'Rejected by admin' })}
                              disabled={rejectMutation.isPending || approveMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(item.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                              )}
                              Approve
                            </Button>
                          </div>
                        </div>
                        <div className="bg-muted rounded p-3 text-sm max-h-40 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-mono text-xs">
                            {item.version.content.substring(0, 500)}
                            {item.version.content.length > 500 && '...'}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No items pending review</p>
                    <p className="text-sm">AI-generated documents will appear here for approval</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Document</DialogTitle>
            <DialogDescription>
              Create a new structured document for AI agents or internal knowledge.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createDocMutation.mutate(data))} className="space-y-4">
              <FormField
                control={createForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Document title" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          const slug = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '');
                          createForm.setValue('slug', slug);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="document-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of the document" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="domainId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select domain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {domains.map((domain) => (
                            <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="intentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intent</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select intent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {intents.map((intent) => (
                            <SelectItem key={intent.id} value={intent.id}>{intent.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDocMutation.isPending}>
                  {createDocMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={editVersionDialogOpen} onOpenChange={setEditVersionDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a new version for "{selectedDoc?.title}"
            </DialogDescription>
          </DialogHeader>
          <Form {...versionForm}>
            <form onSubmit={versionForm.handleSubmit((data) => createVersionMutation.mutate(data))} className="space-y-4">
              <FormField
                control={versionForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (Markdown)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="# Document Title&#10;&#10;Document content in Markdown format..." 
                        className="min-h-[300px] font-mono"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={versionForm.control}
                name="changeLog"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Log</FormLabel>
                    <FormControl>
                      <Input placeholder="What changed in this version?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditVersionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createVersionMutation.isPending}>
                  {createVersionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Version
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
