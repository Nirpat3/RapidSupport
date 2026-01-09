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
  Bot,
  ChevronLeft,
  FolderKanban,
  Mic,
  ToggleRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
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

interface Department {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  workspaceId: string;
  isDefault: boolean;
  icon: string | null;
  color: string | null;
  displayOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentMember {
  id: string;
  departmentId: string;
  workspaceMemberId: string;
  role: string;
  createdAt: string;
}

interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  status: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const addMemberSchema = z.object({
  workspaceMemberId: z.string().min(1, "Member is required"),
  role: z.enum(["manager", "member"]),
});

type CreateDepartmentForm = z.infer<typeof createDepartmentSchema>;
type AddMemberForm = z.infer<typeof addMemberSchema>;

export default function WorkspaceAdminPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const workspaceIdFromUrl = new URLSearchParams(searchParams).get('ws');
  
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(workspaceIdFromUrl);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [createDeptDialogOpen, setCreateDeptDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: workspaces, isLoading: workspacesLoading } = useQuery<Workspace[]>({
    queryKey: ['/api/workspaces'],
  });

  const { data: users } = useQuery<UserData[]>({
    queryKey: ['/api/users'],
  });

  const selectedWorkspace = workspaces?.find(ws => ws.id === selectedWorkspaceId);

  const { data: departments, isLoading: deptsLoading } = useQuery<Department[]>({
    queryKey: ['/api/workspaces', selectedWorkspaceId, 'departments'],
    enabled: !!selectedWorkspaceId,
  });

  const { data: workspaceMembers } = useQuery<WorkspaceMember[]>({
    queryKey: ['/api/workspaces', selectedWorkspaceId, 'members'],
    enabled: !!selectedWorkspaceId,
  });

  const { data: departmentMembers, isLoading: deptMembersLoading } = useQuery<DepartmentMember[]>({
    queryKey: ['/api/departments', selectedDepartment?.id, 'members'],
    enabled: !!selectedDepartment,
  });

  useEffect(() => {
    if (workspaces && !selectedWorkspaceId && workspaces.length > 0) {
      const defaultWs = workspaces.find(ws => ws.isDefault) || workspaces[0];
      setSelectedWorkspaceId(defaultWs.id);
    }
  }, [workspaces, selectedWorkspaceId]);

  const createDeptForm = useForm<CreateDepartmentForm>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "Building2",
      color: "#6366f1",
    },
  });

  const addMemberForm = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      workspaceMemberId: "",
      role: "member",
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: async (data: CreateDepartmentForm) => {
      return apiRequest('/api/departments', 'POST', {
        ...data,
        workspaceId: selectedWorkspaceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', selectedWorkspaceId, 'departments'] });
      toast({ title: "Department created", description: "New department has been created successfully." });
      setCreateDeptDialogOpen(false);
      createDeptForm.reset();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to create department." });
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/departments/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', selectedWorkspaceId, 'departments'] });
      toast({ title: "Department deleted", description: "Department has been deleted successfully." });
      if (selectedDepartment) setSelectedDepartment(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to delete department." });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberForm) => {
      return apiRequest(`/api/departments/${selectedDepartment?.id}/members`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments', selectedDepartment?.id, 'members'] });
      toast({ title: "Member added", description: "Member has been added to the department." });
      setAddMemberDialogOpen(false);
      addMemberForm.reset();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to add member." });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest(`/api/department-members/${memberId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments', selectedDepartment?.id, 'members'] });
      toast({ title: "Member removed", description: "Member has been removed from the department." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to remove member." });
    },
  });

  // Mutation to update workspace features
  const updateWorkspaceFeaturesMutation = useMutation({
    mutationFn: async ({ workspaceId, features }: { workspaceId: string; features: Record<string, boolean> }) => {
      return apiRequest(`/api/workspaces/${workspaceId}/features`, 'PATCH', { features });
    },
    onSuccess: (_data, variables) => {
      // Invalidate all related queries to ensure UI stays in sync
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-features'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-features', variables.workspaceId] });
      toast({ title: "Feature updated", description: "Workspace feature has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to update feature." });
    },
  });

  // Helper to check if voice chat is enabled for the selected workspace
  const isVoiceChatEnabled = () => {
    if (!selectedWorkspace) return false;
    return selectedWorkspace.settings?.features?.voiceChat === true;
  };

  // Toggle voice chat feature
  const handleVoiceChatToggle = (enabled: boolean) => {
    if (!selectedWorkspaceId) return;
    updateWorkspaceFeaturesMutation.mutate({
      workspaceId: selectedWorkspaceId,
      features: { voiceChat: enabled },
    });
  };

  const filteredDepartments = useMemo(() => {
    if (!departments) return [];
    if (!searchQuery.trim()) return departments;
    const query = searchQuery.toLowerCase();
    return departments.filter(dept =>
      dept.name.toLowerCase().includes(query) ||
      dept.description?.toLowerCase().includes(query)
    );
  }, [departments, searchQuery]);

  const getWorkspaceMemberUser = (workspaceMemberId: string) => {
    const member = workspaceMembers?.find(m => m.id === workspaceMemberId);
    if (!member) return null;
    return users?.find(u => u.id === member.userId);
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'manager' ? 'default' : 'secondary';
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
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/platform-admin')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Workspace Admin</h1>
              {selectedWorkspace && (
                <Badge variant="outline">{selectedWorkspace.name}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Manage departments and staff assignments</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={selectedWorkspaceId || ''}
            onValueChange={(value) => {
              setSelectedWorkspaceId(value);
              setSelectedDepartment(null);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces?.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  {ws.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>

          <Dialog open={createDeptDialogOpen} onOpenChange={setCreateDeptDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedWorkspaceId}>
                <Plus className="w-4 h-4 mr-2" />
                New Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
                <DialogDescription>
                  Create a new department within {selectedWorkspace?.name}
                </DialogDescription>
              </DialogHeader>

              <Form {...createDeptForm}>
                <form onSubmit={createDeptForm.handleSubmit((d) => createDeptMutation.mutate(d))} className="space-y-4">
                  <FormField
                    control={createDeptForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Technical Support" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createDeptForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Handle technical issues and troubleshooting" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createDeptForm.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} className="h-10 w-20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDeptDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createDeptMutation.isPending}>
                      {createDeptMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {!selectedWorkspaceId ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a Workspace</h3>
              <p className="text-muted-foreground">
                Choose a workspace from the dropdown to manage its departments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 h-full overflow-auto">
            {/* Workspace Features Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ToggleRight className="w-5 h-5" />
                  Workspace Features
                </CardTitle>
                <CardDescription>
                  Enable or disable add-on features for this workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mic className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Voice Chat</div>
                      <div className="text-sm text-muted-foreground">
                        Allow customers to use voice conversations with AI assistants
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={isVoiceChatEnabled()}
                    onCheckedChange={handleVoiceChatToggle}
                    disabled={updateWorkspaceFeaturesMutation.isPending}
                    data-testid="switch-voice-chat"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Departments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 overflow-auto">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Departments
                  </CardTitle>
                  <CardDescription>
                    {deptsLoading ? 'Loading...' : `${filteredDepartments.length} departments`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {deptsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredDepartments.length > 0 ? (
                    filteredDepartments.map((dept) => (
                      <div
                        key={dept.id}
                        onClick={() => setSelectedDepartment(dept)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                          selectedDepartment?.id === dept.id
                            ? 'bg-accent border-accent-foreground/20'
                            : 'hover-elevate border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: dept.color || '#6366f1' }}
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{dept.name}</div>
                              {dept.description && (
                                <div className="text-sm text-muted-foreground truncate">
                                  {dept.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDeptMutation.mutate(dept.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No departments found</p>
                      <p className="text-sm">Create your first department</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 overflow-auto">
              {selectedDepartment ? (
                <Card className="h-full">
                  <CardHeader className="flex-row items-center justify-between gap-4 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedDepartment.color || '#6366f1' }}
                      />
                      <div>
                        <CardTitle className="text-lg">{selectedDepartment.name}</CardTitle>
                        <CardDescription>{selectedDepartment.description || 'No description'}</CardDescription>
                      </div>
                    </div>
                    <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Staff
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Staff Member</DialogTitle>
                          <DialogDescription>
                            Add a workspace member to {selectedDepartment.name}
                          </DialogDescription>
                        </DialogHeader>

                        <Form {...addMemberForm}>
                          <form onSubmit={addMemberForm.handleSubmit((d) => addMemberMutation.mutate(d))} className="space-y-4">
                            <FormField
                              control={addMemberForm.control}
                              name="workspaceMemberId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Member</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a member" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {workspaceMembers?.map((member) => {
                                        const user = users?.find(u => u.id === member.userId);
                                        return (
                                          <SelectItem key={member.id} value={member.id}>
                                            {user?.name || 'Unknown'} ({user?.email || member.userId})
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={addMemberForm.control}
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
                                      <SelectItem value="manager">Manager</SelectItem>
                                      <SelectItem value="member">Member</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={addMemberMutation.isPending}>
                                {addMemberMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Add
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>

                  <CardContent>
                    <Tabs defaultValue="staff">
                      <TabsList className="mb-4">
                        <TabsTrigger value="staff">
                          <Users className="w-4 h-4 mr-2" />
                          Staff
                        </TabsTrigger>
                        <TabsTrigger value="ai-agents">
                          <Bot className="w-4 h-4 mr-2" />
                          AI Agents
                        </TabsTrigger>
                        <TabsTrigger value="settings">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="staff">
                        {deptMembersLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : departmentMembers && departmentMembers.length > 0 ? (
                          <div className="space-y-2">
                            {departmentMembers.map((member) => {
                              const user = getWorkspaceMemberUser(member.workspaceMemberId);
                              return (
                                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                      <Users className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                      <div className="font-medium">{user?.name || 'Unknown User'}</div>
                                      <div className="text-sm text-muted-foreground">{user?.email || ''}</div>
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
                            <p>No staff members</p>
                            <p className="text-sm">Add staff members to this department</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="ai-agents">
                        <div className="text-center py-8 text-muted-foreground">
                          <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>AI Agent configuration</p>
                          <p className="text-sm">Assign AI agents to handle this department's conversations</p>
                          <Button variant="outline" className="mt-4" onClick={() => setLocation('/ai-configuration')}>
                            Configure AI Agents
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="settings">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Department Name</label>
                            <Input value={selectedDepartment.name} disabled className="mt-1" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Slug</label>
                            <Input value={selectedDepartment.slug} disabled className="mt-1" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <Textarea value={selectedDepartment.description || ''} disabled className="mt-1" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Color</label>
                            <div className="flex items-center gap-2 mt-1">
                              <div
                                className="w-8 h-8 rounded border"
                                style={{ backgroundColor: selectedDepartment.color || '#6366f1' }}
                              />
                              <Input value={selectedDepartment.color || '#6366f1'} disabled className="flex-1" />
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center py-12">
                    <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Select a Department</h3>
                    <p className="text-muted-foreground">
                      Choose a department to view and manage its staff and settings.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
