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
  DialogTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Users,
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Settings,
  Trash2,
  UserPlus,
  Shield,
  Crown,
} from "lucide-react";
import { useState, useMemo } from "react";
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

interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  status: string;
  invitedBy: string | null;
  createdAt: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isPlatformAdmin?: boolean;
}

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

const inviteMemberSchema = z.object({
  userId: z.string().min(1, "User is required"),
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

type CreateWorkspaceForm = z.infer<typeof createWorkspaceSchema>;
type InviteMemberForm = z.infer<typeof inviteMemberSchema>;

interface PlatformAdminPageProps {
  embedded?: boolean;
}

export default function PlatformAdminPage({ embedded = false }: PlatformAdminPageProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  const { data: workspaces, isLoading: workspacesLoading } = useQuery<Workspace[]>({
    queryKey: ['/api/workspaces'],
  });

  const { data: users } = useQuery<UserData[]>({
    queryKey: ['/api/users'],
  });

  const { data: selectedMembers, isLoading: membersLoading } = useQuery<WorkspaceMember[]>({
    queryKey: ['/api/workspaces', selectedWorkspace?.id, 'members'],
    enabled: !!selectedWorkspace,
  });

  const createForm = useForm<CreateWorkspaceForm>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: "",
      description: "",
      slug: "",
    },
  });

  const inviteForm = useForm<InviteMemberForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      userId: "",
      role: "member",
    },
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: CreateWorkspaceForm) => {
      return apiRequest('/api/workspaces', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      toast({ title: "Workspace created", description: "New workspace has been created successfully." });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to create workspace." });
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/workspaces/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      toast({ title: "Workspace deleted", description: "Workspace has been deleted successfully." });
      if (selectedWorkspace) setSelectedWorkspace(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to delete workspace." });
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (data: InviteMemberForm) => {
      return apiRequest(`/api/workspaces/${selectedWorkspace?.id}/members`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', selectedWorkspace?.id, 'members'] });
      toast({ title: "Member added", description: "Member has been added to the workspace." });
      setInviteDialogOpen(false);
      inviteForm.reset();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to add member." });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest(`/api/workspace-members/${memberId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', selectedWorkspace?.id, 'members'] });
      toast({ title: "Member removed", description: "Member has been removed from the workspace." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to remove member." });
    },
  });

  const filteredWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    if (!searchQuery.trim()) return workspaces;
    const query = searchQuery.toLowerCase();
    return workspaces.filter(ws =>
      ws.name.toLowerCase().includes(query) ||
      ws.slug.toLowerCase().includes(query) ||
      ws.description?.toLowerCase().includes(query)
    );
  }, [workspaces, searchQuery]);

  const getUserById = (userId: string) => users?.find(u => u.id === userId);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  const handleNameChange = (name: string) => {
    createForm.setValue('name', name);
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    createForm.setValue('slug', slug);
  };

  if (workspacesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {!embedded && (
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Platform Administration</h1>
              <p className="text-sm text-muted-foreground">Manage workspaces and platform-wide settings</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[250px]"
              />
            </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription>
                  Create a new workspace for a team or organization.
                </DialogDescription>
              </DialogHeader>

              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((d) => createWorkspaceMutation.mutate(d))} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Support"
                            {...field}
                            onChange={(e) => handleNameChange(e.target.value)}
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
                          <Input placeholder="acme-support" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Optional description..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createWorkspaceMutation.isPending}>
                      {createWorkspaceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      )}
      {embedded && (
        <div className="flex items-center justify-end gap-3 mb-6 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription>
                  Create a new workspace for a team or organization.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((d) => createWorkspaceMutation.mutate(d))} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Support"
                            {...field}
                            onChange={(e) => handleNameChange(e.target.value)}
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
                          <Input placeholder="acme-support" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Optional description..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createWorkspaceMutation.isPending}>
                      {createWorkspaceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-1 overflow-auto">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Workspaces
                </CardTitle>
                <CardDescription>{filteredWorkspaces.length} workspaces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredWorkspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    onClick={() => setSelectedWorkspace(workspace)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                      selectedWorkspace?.id === workspace.id
                        ? 'bg-accent border-accent-foreground/20'
                        : 'hover-elevate border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{workspace.name}</div>
                        <div className="text-sm text-muted-foreground truncate">/{workspace.slug}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {workspace.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorkspace(workspace);
                            }}>
                              <Settings className="w-4 h-4 mr-2" />
                              Manage
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteWorkspaceMutation.mutate(workspace.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {workspace.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {workspace.description}
                      </p>
                    )}
                  </div>
                ))}

                {filteredWorkspaces.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No workspaces found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 overflow-auto">
            {selectedWorkspace ? (
              <Card className="h-full">
                <CardHeader className="flex-row items-center justify-between gap-4 pb-3">
                  <div>
                    <CardTitle className="text-lg">{selectedWorkspace.name}</CardTitle>
                    <CardDescription>Workspace settings and members</CardDescription>
                  </div>
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Member</DialogTitle>
                        <DialogDescription>
                          Add a user to {selectedWorkspace.name}
                        </DialogDescription>
                      </DialogHeader>

                      <Form {...inviteForm}>
                        <form onSubmit={inviteForm.handleSubmit((d) => inviteMemberMutation.mutate(d))} className="space-y-4">
                          <FormField
                            control={inviteForm.control}
                            name="userId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>User</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a user" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {users?.filter(u => u.role !== 'customer').map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={inviteForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="owner">Owner</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={inviteMemberMutation.isPending}>
                              {inviteMemberMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Add
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="members">
                    <TabsList className="mb-4">
                      <TabsTrigger value="members">
                        <Users className="w-4 h-4 mr-2" />
                        Members
                      </TabsTrigger>
                      <TabsTrigger value="settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="members">
                      {membersLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : selectedMembers && selectedMembers.length > 0 ? (
                        <div className="space-y-2">
                          {selectedMembers.map((member) => {
                            const user = getUserById(member.userId);
                            return (
                              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{user?.name || 'Unknown User'}</div>
                                    <div className="text-sm text-muted-foreground">{user?.email || member.userId}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={getRoleBadgeVariant(member.role)}>
                                    {member.role}
                                  </Badge>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeMemberMutation.mutate(member.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>No members yet</p>
                          <p className="text-sm">Add members to this workspace</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="settings">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Workspace Name</label>
                          <Input value={selectedWorkspace.name} disabled className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Slug</label>
                          <Input value={selectedWorkspace.slug} disabled className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <Textarea value={selectedWorkspace.description || ''} disabled className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Created</label>
                          <Input value={new Date(selectedWorkspace.createdAt).toLocaleDateString()} disabled className="mt-1" />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a Workspace</h3>
                  <p className="text-muted-foreground">
                    Choose a workspace from the list to view and manage its settings and members.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
