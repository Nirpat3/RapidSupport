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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  FileText,
  Link2,
  Search,
  Plus,
  Loader2,
  Check,
  X,
  Copy,
  Clock,
  Mail,
  User,
  Globe,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  website?: string;
  createdAt: string;
}

interface OrganizationApplication {
  id: string;
  organizationName: string;
  slug: string;
  website?: string;
  industry?: string;
  companySize?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  contactRole?: string;
  useCase?: string;
  expectedVolume?: string;
  currentSolution?: string;
  status: string;
  reviewNotes?: string;
  createdAt: string;
}

interface SetupToken {
  id: string;
  token: string;
  organizationName: string;
  organizationSlug: string;
  contactName: string;
  contactEmail: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

const inviteSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  organizationSlug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase alphanumeric with hyphens only"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid email required"),
  contactRole: z.string().optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function OrganizationManagementPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<OrganizationApplication | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [showSetupUrlDialog, setShowSetupUrlDialog] = useState(false);

  const { data: organizations, isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ['/api/admin/organizations'],
  });

  const { data: applications, isLoading: appsLoading } = useQuery<OrganizationApplication[]>({
    queryKey: ['/api/admin/organization-applications'],
  });

  const { data: setupTokens, isLoading: tokensLoading } = useQuery<SetupToken[]>({
    queryKey: ['/api/admin/organization-setup-tokens'],
  });

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      organizationName: "",
      organizationSlug: "",
      contactName: "",
      contactEmail: "",
      contactRole: "",
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteForm) => {
      return apiRequest('/api/admin/organizations/invite', 'POST', data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organization-setup-tokens'] });
      setInviteDialogOpen(false);
      inviteForm.reset();
      setSetupUrl(data.setupUrl);
      setShowSetupUrlDialog(true);
      toast({ title: "Invitation created", description: "Setup link generated successfully." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to create invitation." });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/organization-applications/${id}/approve`, 'POST', {});
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organization-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organization-setup-tokens'] });
      setApproveDialogOpen(false);
      setSelectedApplication(null);
      setSetupUrl(data.setupUrl);
      setShowSetupUrlDialog(true);
      toast({ title: "Application approved", description: "Setup link generated for the contact." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to approve application." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest(`/api/admin/organization-applications/${id}/reject`, 'POST', { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organization-applications'] });
      setRejectDialogOpen(false);
      setSelectedApplication(null);
      setRejectReason("");
      toast({ title: "Application rejected", description: "The application has been rejected." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to reject application." });
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/organization-setup-tokens/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organization-setup-tokens'] });
      toast({ title: "Token revoked", description: "The setup link has been revoked." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to revoke token." });
    },
  });

  const pendingApplications = useMemo(() => 
    applications?.filter(a => a.status === 'pending') || [], 
    [applications]
  );

  const processedApplications = useMemo(() => 
    applications?.filter(a => a.status !== 'pending') || [], 
    [applications]
  );

  const pendingTokens = useMemo(() => 
    setupTokens?.filter(t => t.status === 'pending') || [], 
    [setupTokens]
  );

  const handleNameChange = (name: string) => {
    inviteForm.setValue('organizationName', name);
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    inviteForm.setValue('organizationSlug', slug);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Link copied to clipboard." });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Approved</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rejected</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Completed</Badge>;
      case 'expired': return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">Expired</Badge>;
      case 'revoked': return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">Revoked</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Organization Management</h1>
              <p className="text-sm text-muted-foreground">Manage organizations, applications, and invitations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="applications" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="applications" className="gap-2">
                <FileText className="w-4 h-4" />
                Applications
                {pendingApplications.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pendingApplications.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-2">
                <Link2 className="w-4 h-4" />
                Setup Links
                {pendingTokens.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pendingTokens.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="organizations" className="gap-2">
                <Building2 className="w-4 h-4" />
                Organizations
              </TabsTrigger>
            </TabsList>

            <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Invite Organization
            </Button>
          </div>

          <TabsContent value="applications" className="space-y-4">
            {appsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingApplications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Pending Applications</h3>
                  <p className="text-muted-foreground">
                    New organization applications will appear here for review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingApplications.map((app) => (
                  <Card key={app.id} className="hover-elevate">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">{app.organizationName}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Globe className="w-3 h-3" />
                            {app.slug}
                            {app.website && (
                              <>
                                <span className="text-muted-foreground">|</span>
                                <a href={app.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                  {app.website.replace(/^https?:\/\//, '')}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </>
                            )}
                          </CardDescription>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{app.contactName}</span>
                            {app.contactRole && <span className="text-xs">({app.contactRole})</span>}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span>{app.contactEmail}</span>
                          </div>
                        </div>
                        <div className="space-y-2 text-muted-foreground">
                          {app.industry && <div>Industry: {app.industry}</div>}
                          {app.companySize && <div>Size: {app.companySize}</div>}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Applied {formatDate(app.createdAt)}
                          </div>
                        </div>
                      </div>
                      {app.useCase && (
                        <div className="text-sm">
                          <span className="font-medium">Use Case:</span>
                          <p className="text-muted-foreground mt-1">{app.useCase}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={() => { setSelectedApplication(app); setApproveDialogOpen(true); }}
                          className="gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => { setSelectedApplication(app); setRejectDialogOpen(true); }}
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {processedApplications.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Processed Applications</h3>
                <div className="space-y-2">
                  {processedApplications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{app.organizationName}</div>
                          <div className="text-sm text-muted-foreground">{app.contactEmail}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(app.status)}
                        <span className="text-sm text-muted-foreground">{formatDate(app.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            {tokensLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !setupTokens || setupTokens.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Setup Links</h3>
                  <p className="text-muted-foreground mb-4">
                    Create invitations to share setup links with organization contacts.
                  </p>
                  <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Invite Organization
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {setupTokens.map((token) => {
                  const isExpired = new Date(token.expiresAt) < new Date();
                  const setupLink = `${window.location.origin}/setup-organization?token=${token.token}`;
                  
                  return (
                    <Card key={token.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{token.organizationName}</span>
                              {getStatusBadge(isExpired && token.status === 'pending' ? 'expired' : token.status)}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3" />
                                {token.contactName} ({token.contactEmail})
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Expires: {formatDate(token.expiresAt)}
                              </div>
                            </div>
                            {token.status === 'pending' && !isExpired && (
                              <div className="mt-3 flex items-center gap-2">
                                <Input 
                                  value={setupLink} 
                                  readOnly 
                                  className="text-xs font-mono bg-muted"
                                />
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => copyToClipboard(setupLink)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {token.status === 'pending' && !isExpired && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => revokeTokenMutation.mutate(token.id)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="organizations" className="space-y-4">
            {orgsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !organizations || organizations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Organizations</h3>
                  <p className="text-muted-foreground">
                    Organizations will appear here once they complete their setup.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {organizations.map((org) => (
                  <Card key={org.id} className="hover-elevate">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{org.name}</CardTitle>
                            <CardDescription>{org.slug}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                          {org.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        Created {formatDate(org.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite New Organization</DialogTitle>
            <DialogDescription>
              Create a setup link to share with the organization contact.
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Acme Inc" 
                        onChange={(e) => handleNameChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="organizationSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="acme-inc" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Smith" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john@acme.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="contactRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Role (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="CEO, CTO, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Link
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Application</AlertDialogTitle>
            <AlertDialogDescription>
              Approving this application will generate a setup link for {selectedApplication?.contactName} to complete their organization setup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedApplication && approveMutation.mutate(selectedApplication.id)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve & Generate Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejecting {selectedApplication?.organizationName}&apos;s application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)"
            className="my-4"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedApplication && rejectMutation.mutate({ id: selectedApplication.id, reason: rejectReason })}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSetupUrlDialog} onOpenChange={setShowSetupUrlDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500" />
              Setup Link Generated
            </DialogTitle>
            <DialogDescription>
              Share this link with the contact person to complete their organization setup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input 
                value={setupUrl || ''} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setupUrl && copyToClipboard(setupUrl)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This link expires in 7 days. The contact will use it to create their organization admin account and complete the setup.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSetupUrlDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
