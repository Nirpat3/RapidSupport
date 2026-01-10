import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  FileText, 
  Shield, 
  Cookie, 
  Sparkles, 
  Globe, 
  Building2,
  Loader2,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Archive
} from "lucide-react";

type PolicyType = 'terms' | 'privacy' | 'cookies';
type PolicyStatus = 'draft' | 'published' | 'archived';

interface LegalPolicy {
  id: string;
  organizationId: string | null;
  type: PolicyType;
  region: string;
  title: string;
  content: string;
  summary: string | null;
  version: string;
  effectiveDate: string;
  generatedByAi: boolean;
  aiModel: string | null;
  status: PolicyStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Region {
  code: string;
  name: string;
  regulations: string[];
}

interface PolicyTypeInfo {
  type: PolicyType;
  description: string;
  sections: string[];
}

const POLICY_ICONS: Record<PolicyType, typeof FileText> = {
  terms: FileText,
  privacy: Shield,
  cookies: Cookie
};

const STATUS_CONFIG: Record<PolicyStatus, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: 'Draft', icon: Clock, variant: 'secondary' },
  published: { label: 'Published', icon: CheckCircle, variant: 'default' },
  archived: { label: 'Archived', icon: Archive, variant: 'outline' }
};

export default function LegalPoliciesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"policies" | "generate">("policies");
  const [selectedPolicy, setSelectedPolicy] = useState<LegalPolicy | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: policies = [], isLoading: policiesLoading } = useQuery<LegalPolicy[]>({
    queryKey: ['/api/policies']
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ['/api/policies/regions']
  });

  const { data: policyTypes = [] } = useQuery<PolicyTypeInfo[]>({
    queryKey: ['/api/policies/types']
  });

  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LegalPolicy> }) => {
      return await apiRequest(`/api/policies/${id}`, 'PATCH', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies'] });
      toast({ title: "Policy updated", description: "The policy has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/policies/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies'] });
      toast({ title: "Policy deleted", description: "The policy has been deleted." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  const handlePublish = (policy: LegalPolicy) => {
    updatePolicyMutation.mutate({ id: policy.id, updates: { status: 'published' } });
  };

  const handleArchive = (policy: LegalPolicy) => {
    updatePolicyMutation.mutate({ id: policy.id, updates: { status: 'archived' } });
  };

  const handleDelete = (policy: LegalPolicy) => {
    if (confirm('Are you sure you want to delete this policy?')) {
      deletePolicyMutation.mutate(policy.id);
    }
  };

  const groupedPolicies = policies.reduce((acc, policy) => {
    if (!acc[policy.type]) acc[policy.type] = [];
    acc[policy.type].push(policy);
    return acc;
  }, {} as Record<string, LegalPolicy[]>);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Legal Policies</h1>
        <p className="text-muted-foreground mt-2">
          Generate and manage region-specific terms, privacy policies, and cookie policies using AI.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="mb-6">
          <TabsTrigger value="policies" className="gap-2">
            <FileText className="w-4 h-4" />
            Manage Policies
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Generate New
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          {policiesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : policies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No policies yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Generate your first policy using AI to get started.
                </p>
                <Button onClick={() => setActiveTab("generate")}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Policy
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPolicies).map(([type, typePolicies]) => {
                const Icon = POLICY_ICONS[type as PolicyType] || FileText;
                const typeInfo = policyTypes.find(t => t.type === type);
                return (
                  <Card key={type}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        {typeInfo?.description || type}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {typePolicies.map((policy) => {
                          const region = regions.find(r => r.code === policy.region);
                          const statusConfig = STATUS_CONFIG[policy.status];
                          const StatusIcon = statusConfig.icon;
                          return (
                            <Card key={policy.id} className="hover-elevate">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <Badge variant="outline" className="mb-2">
                                      <Globe className="w-3 h-3 mr-1" />
                                      {region?.name || policy.region}
                                    </Badge>
                                    <CardTitle className="text-base">{policy.title}</CardTitle>
                                  </div>
                                  <Badge variant={statusConfig.variant}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                                {policy.summary && (
                                  <CardDescription className="line-clamp-2">
                                    {policy.summary}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent className="pb-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>v{policy.version}</span>
                                  {policy.generatedByAi && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      AI Generated
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                              <CardFooter className="flex gap-2 pt-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => { setSelectedPolicy(policy); setPreviewOpen(true); }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {policy.status === 'draft' && (
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => handlePublish(policy)}
                                    disabled={updatePolicyMutation.isPending}
                                  >
                                    Publish
                                  </Button>
                                )}
                                {policy.status === 'published' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleArchive(policy)}
                                    disabled={updatePolicyMutation.isPending}
                                  >
                                    Archive
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleDelete(policy)}
                                  disabled={deletePolicyMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="generate">
          <GeneratePolicyForm 
            regions={regions} 
            policyTypes={policyTypes}
            onSuccess={() => setActiveTab("policies")}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPolicy?.title}</DialogTitle>
            <DialogDescription>
              Version {selectedPolicy?.version} | Region: {selectedPolicy?.region}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedPolicy?.content || '') }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GeneratePolicyForm({ 
  regions, 
  policyTypes,
  onSuccess 
}: { 
  regions: Region[]; 
  policyTypes: PolicyTypeInfo[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: 'terms' as PolicyType,
    region: 'global',
    companyName: '',
    websiteUrl: '',
    industry: '',
    additionalContext: ''
  });

  const generateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('/api/policies/generate', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies'] });
      toast({ 
        title: "Policy generated", 
        description: "Your policy has been generated and saved as a draft." 
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Generation failed", 
        description: error.message 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) {
      toast({ variant: "destructive", title: "Missing info", description: "Please enter your company name." });
      return;
    }
    generateMutation.mutate(formData);
  };

  const selectedRegion = regions.find(r => r.code === formData.region);
  const selectedType = policyTypes.find(t => t.type === formData.type);

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Enter details about your company for the policy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Your Company Inc."
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.websiteUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., SaaS, E-commerce, Healthcare"
                value={formData.industry}
                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalContext">Additional Context</Label>
              <Textarea
                id="additionalContext"
                placeholder="Any specific requirements or context for the policy..."
                value={formData.additionalContext}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalContext: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Policy Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Policy Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as PolicyType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {policyTypes.map(pt => {
                      const Icon = POLICY_ICONS[pt.type];
                      return (
                        <SelectItem key={pt.type} value={pt.type}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {pt.description}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {selectedType && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Sections included:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedType.sections.slice(0, 5).map(s => (
                      <li key={s}>{s}</li>
                    ))}
                    {selectedType.sections.length > 5 && (
                      <li>...and {selectedType.sections.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Target Region
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Region</Label>
                <Select
                  value={formData.region}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, region: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(r => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedRegion && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Compliance with:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedRegion.regulations.map(r => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button 
          type="submit" 
          size="lg"
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Policy
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/gim, '<br />');
}
