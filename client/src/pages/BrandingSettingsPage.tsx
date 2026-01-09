import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building2, 
  Palette, 
  Image, 
  MessageSquare, 
  Plus, 
  Pencil, 
  ExternalLink,
  Loader2,
  Save,
  Eye,
  Sparkles,
  Copy,
  Check
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  welcomeMessage: string | null;
  aiEnabled: boolean;
  knowledgeBaseEnabled: boolean;
  createdAt: string | null;
}

interface BrandingSettingsPageProps {
  embedded?: boolean;
}

export default function BrandingSettingsPage({ embedded = false }: BrandingSettingsPageProps) {
  const { toast } = useToast();
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ['/api/admin/organizations'],
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: Partial<Organization>) => {
      return apiRequest('/api/admin/organizations', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Organization created",
        description: "The organization has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization.",
        variant: "destructive",
      });
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Organization> }) => {
      return apiRequest(`/api/admin/organizations/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      setIsEditDialogOpen(false);
      setSelectedOrg(null);
      toast({
        title: "Branding updated",
        description: "Organization branding has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization branding.",
        variant: "destructive",
      });
    },
  });

  const handleCopyWidgetUrl = (slug: string) => {
    const widgetUrl = `${window.location.origin}/chat?org=${slug}`;
    navigator.clipboard.writeText(widgetUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
    toast({
      title: "URL copied",
      description: "Widget URL has been copied to clipboard.",
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="branding-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="branding-title">White-Label Branding</h1>
          <p className="text-muted-foreground">Customize chat widget branding for each organization</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-org">
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
            </DialogHeader>
            <CreateOrgForm 
              onSubmit={(data) => createOrgMutation.mutate(data)}
              isPending={createOrgMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations?.map((org) => (
            <Card key={org.id} className="relative" data-testid={`card-org-${org.slug}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  {org.logo ? (
                    <img 
                      src={org.logo} 
                      alt={org.name} 
                      className="w-12 h-12 rounded-lg object-contain bg-muted"
                    />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: org.primaryColor ? `${org.primaryColor}1A` : 'hsl(var(--primary) / 0.1)' }}
                    >
                      <Building2 
                        className="h-6 w-6" 
                        style={{ color: org.primaryColor || 'hsl(var(--primary))' }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{org.name}</CardTitle>
                    <CardDescription className="truncate">{org.slug}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Color Preview */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Colors:</Label>
                  <div className="flex gap-1">
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: org.primaryColor || '#6366f1' }}
                      title="Primary Color"
                    />
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: org.secondaryColor || '#10b981' }}
                      title="Secondary Color"
                    />
                  </div>
                </div>

                {/* Welcome Message Preview */}
                {org.welcomeMessage && (
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Welcome Message:</Label>
                    <p className="text-sm truncate">{org.welcomeMessage}</p>
                  </div>
                )}

                {/* Features */}
                <div className="flex gap-2 flex-wrap">
                  {org.aiEnabled && (
                    <Badge variant="secondary" className="text-xs">AI Enabled</Badge>
                  )}
                  {org.knowledgeBaseEnabled && (
                    <Badge variant="secondary" className="text-xs">KB Enabled</Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={() => handleCopyWidgetUrl(org.slug)}
                  data-testid={`button-copy-url-${org.slug}`}
                >
                  {copiedSlug === org.slug ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Widget URL
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/chat?org=${org.slug}`, '_blank')}
                  data-testid={`button-preview-${org.slug}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Dialog open={isEditDialogOpen && selectedOrg?.id === org.id} onOpenChange={(open) => {
                  setIsEditDialogOpen(open);
                  if (!open) setSelectedOrg(null);
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => setSelectedOrg(org)}
                      data-testid={`button-edit-${org.slug}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Edit Branding - {org.name}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                      <EditBrandingForm
                        organization={org}
                        onSubmit={(data) => updateOrgMutation.mutate({ id: org.id, data })}
                        isPending={updateOrgMutation.isPending}
                      />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}

          {organizations?.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Organizations</h3>
              <p className="text-muted-foreground mb-4">Create your first organization to start customizing branding.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-org">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateOrgForm({ 
  onSubmit, 
  isPending 
}: { 
  onSubmit: (data: Partial<Organization>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    primaryColor: '#6366f1',
    secondaryColor: '#10b981',
  });

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData({ ...formData, name, slug });
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(formData);
    }} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Organization Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Acme Corp"
          required
          data-testid="input-org-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          placeholder="acme-corp"
          required
          data-testid="input-org-slug"
        />
        <p className="text-xs text-muted-foreground">Used in widget URL: /chat?org={formData.slug || 'your-slug'}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              id="primaryColor"
              value={formData.primaryColor}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
              data-testid="input-primary-color"
            />
            <Input
              value={formData.primaryColor}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              placeholder="#6366f1"
              className="flex-1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondaryColor">Secondary Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              id="secondaryColor"
              value={formData.secondaryColor}
              onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
              data-testid="input-secondary-color"
            />
            <Input
              value={formData.secondaryColor}
              onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
              placeholder="#10b981"
              className="flex-1"
            />
          </div>
        </div>
      </div>
      <Button type="submit" className="w-full gap-2" disabled={isPending} data-testid="button-submit-create">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Create Organization
      </Button>
    </form>
  );
}

function EditBrandingForm({ 
  organization, 
  onSubmit, 
  isPending 
}: { 
  organization: Organization;
  onSubmit: (data: Partial<Organization>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo || '',
    primaryColor: organization.primaryColor || '#6366f1',
    secondaryColor: organization.secondaryColor || '#10b981',
    welcomeMessage: organization.welcomeMessage || '',
    aiEnabled: organization.aiEnabled,
    knowledgeBaseEnabled: organization.knowledgeBaseEnabled,
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...formData,
        logo: formData.logo || null,
        welcomeMessage: formData.welcomeMessage || null,
      });
    }} className="space-y-6 pb-4">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Basic Information
        </h3>
        <div className="space-y-2">
          <Label htmlFor="edit-name">Organization Name</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Acme Corp"
            required
            data-testid="input-edit-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-slug">URL Slug</Label>
          <Input
            id="edit-slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="acme-corp"
            required
            data-testid="input-edit-slug"
          />
        </div>
      </div>

      <Separator />

      {/* Visual Branding */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Image className="h-4 w-4" />
          Visual Branding
        </h3>
        <div className="space-y-2">
          <Label htmlFor="edit-logo">Logo URL</Label>
          <Input
            id="edit-logo"
            value={formData.logo}
            onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
            placeholder="https://example.com/logo.png"
            data-testid="input-edit-logo"
          />
          <p className="text-xs text-muted-foreground">Enter a URL to your company logo (recommended size: 64x64px)</p>
          {formData.logo && (
            <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-3">
              <img 
                src={formData.logo} 
                alt="Logo preview" 
                className="w-10 h-10 rounded-lg object-contain bg-background"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="text-sm text-muted-foreground">Logo Preview</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                id="edit-primaryColor"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-12 h-9 p-1 cursor-pointer"
                data-testid="input-edit-primary-color"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                placeholder="#6366f1"
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-secondaryColor">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                id="edit-secondaryColor"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                className="w-12 h-9 p-1 cursor-pointer"
                data-testid="input-edit-secondary-color"
              />
              <Input
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                placeholder="#10b981"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Welcome Message */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Welcome Message
        </h3>
        <div className="space-y-2">
          <Label htmlFor="edit-welcomeMessage">Custom Welcome Message</Label>
          <Textarea
            id="edit-welcomeMessage"
            value={formData.welcomeMessage}
            onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
            placeholder="Welcome to our support! How can we help you today?"
            rows={3}
            data-testid="input-edit-welcome"
          />
          <p className="text-xs text-muted-foreground">This message appears on the chat landing page for customers</p>
        </div>
      </div>

      <Separator />

      {/* Live Preview */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Live Preview
        </h3>
        <div className="p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3 mb-3">
            {formData.logo ? (
              <img 
                src={formData.logo} 
                alt="Logo" 
                className="w-10 h-10 rounded-xl object-contain bg-background"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${formData.primaryColor}1A` }}
              >
                <Sparkles className="h-5 w-5" style={{ color: formData.primaryColor }} />
              </div>
            )}
            <div>
              <h4 className="font-semibold" style={{ color: formData.primaryColor }}>
                {formData.name} Support
              </h4>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {formData.welcomeMessage || 'How can we help you today?'}
          </p>
        </div>
      </div>

      <Button type="submit" className="w-full gap-2" disabled={isPending} data-testid="button-submit-edit">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Branding
      </Button>
    </form>
  );
}
