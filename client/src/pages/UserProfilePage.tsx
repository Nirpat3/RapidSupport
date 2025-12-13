import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Shield, User, ArrowLeft, Loader2, Save, Trash2, 
  Power, Eye, Edit, EyeOff 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";

const FEATURES = [
  { id: 'conversations', label: 'Conversations', description: 'View and manage customer conversations' },
  { id: 'activity', label: 'Activity', description: 'View activity notifications' },
  { id: 'dashboard', label: 'Dashboard', description: 'View dashboard analytics' },
  { id: 'customers', label: 'Customers', description: 'Manage customer information' },
  { id: 'ai-agents', label: 'AI Agents', description: 'Manage AI agents' },
  { id: 'ai-dashboard', label: 'Staff AI Dashboard', description: 'View AI staff dashboard' },
  { id: 'ai-training', label: 'AI Training', description: 'Train AI agents' },
  { id: 'ai-takeover', label: 'AI Takeover', description: 'Manage AI takeover' },
  { id: 'knowledge-base', label: 'Knowledge Base', description: 'Manage knowledge base articles' },
  { id: 'file-management', label: 'File Management', description: 'Manage uploaded files' },
  { id: 'analytics', label: 'Analytics', description: 'View analytics and reports' },
  { id: 'feedback', label: 'Feedback', description: 'View customer feedback' },
  { id: 'feed', label: 'Feed', description: 'Manage feed posts' },
  { id: 'settings', label: 'Settings', description: 'Manage settings' },
  { id: 'user-management', label: 'User Management', description: 'Manage user permissions (Admin only)' },
];

type PermissionLevel = 'hidden' | 'view' | 'edit';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface UserPermission {
  id: string;
  userId: string;
  feature: string;
  permission: PermissionLevel;
}

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").or(z.literal("")),
  role: z.enum(["admin", "agent"]),
});

type UpdateUserForm = z.infer<typeof updateUserSchema>;

export default function UserProfilePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const userId = params.id;

  const { data: user, isLoading: isLoadingUser } = useQuery<UserData>({
    queryKey: ['/api/users', userId],
    enabled: !!userId,
  });

  const { data: permissions, isLoading: isLoadingPermissions } = useQuery<UserPermission[]>({
    queryKey: ['/api/permissions/user', userId],
    enabled: !!userId,
  });

  const form = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "agent",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role as "admin" | "agent",
      });
    }
  }, [user, form]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: UpdateUserForm) => {
      const updateData: any = { name: data.name, email: data.email, role: data.role };
      if (data.password) {
        updateData.password = data.password;
      }
      return apiRequest(`/api/users/${userId}`, 'PUT', updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      toast({
        title: "User updated",
        description: "User information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to update user.",
      });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/users/${userId}/toggle-status`, 'PUT', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      toast({
        title: "Status updated",
        description: `User has been ${user?.status === 'disabled' ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user status.",
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/users/${userId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
      setLocation('/user-management');
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to delete user.",
      });
    }
  });

  const setPermissionMutation = useMutation({
    mutationFn: async ({ feature, permission }: { feature: string; permission: PermissionLevel }) => {
      return apiRequest('/api/permissions/set', 'POST', { userId, feature, permission });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/user', userId] });
      toast({
        title: "Permission updated",
        description: "User permission has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update permission.",
      });
    }
  });

  const getPermissionForFeature = (feature: string): PermissionLevel => {
    const permission = permissions?.find(p => p.feature === feature);
    return permission?.permission || 'view';
  };

  const handlePermissionChange = (feature: string, permission: PermissionLevel) => {
    setPermissionMutation.mutate({ feature, permission });
  };

  const getPermissionIcon = (level: PermissionLevel) => {
    switch (level) {
      case 'hidden':
        return <EyeOff className="w-4 h-4" />;
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'edit':
        return <Edit className="w-4 h-4" />;
    }
  };

  const getPermissionColor = (level: PermissionLevel) => {
    switch (level) {
      case 'hidden':
        return 'destructive';
      case 'view':
        return 'secondary';
      case 'edit':
        return 'default';
    }
  };

  const onSubmit = (data: UpdateUserForm) => {
    updateUserMutation.mutate(data);
  };

  if (isLoadingUser || isLoadingPermissions) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <User className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" onClick={() => setLocation('/user-management')} className="mt-4">
          Back to User Management
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation('/user-management')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-user-name">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
            {user.role}
          </Badge>
          <Badge variant={user.status === 'disabled' ? 'destructive' : 'secondary'}>
            {user.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Update user details and credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password (leave blank to keep current)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} data-testid="input-edit-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={updateUserMutation.isPending}
                    data-testid="button-save-user"
                  >
                    {updateUserMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
            
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <h3 className="font-medium">Account Actions</h3>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={user.status === 'disabled' ? 'default' : 'outline'}
                  onClick={() => toggleStatusMutation.mutate()}
                  disabled={toggleStatusMutation.isPending}
                  data-testid="button-toggle-status"
                >
                  {toggleStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4 mr-2" />
                  )}
                  {user.status === 'disabled' ? 'Enable User' : 'Disable User'}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" data-testid="button-delete-user">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the user "{user.name}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteUserMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        {deleteUserMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissions
            </CardTitle>
            <CardDescription>
              {user.role === 'admin' 
                ? 'Admin users have full access to all features by default'
                : 'Configure which features this user can access'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
            {user.role === 'admin' && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-4">
                <p className="text-sm font-medium text-primary">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Admin users have full access to all features
                </p>
              </div>
            )}
            
            {FEATURES.map((feature, index) => (
              <div key={feature.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium" data-testid={`feature-label-${feature.id}`}>{feature.label}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge 
                      variant={getPermissionColor(getPermissionForFeature(feature.id))}
                      className="gap-1"
                    >
                      {getPermissionIcon(getPermissionForFeature(feature.id))}
                      {getPermissionForFeature(feature.id)}
                    </Badge>
                    <Select
                      value={getPermissionForFeature(feature.id)}
                      onValueChange={(value) => handlePermissionChange(feature.id, value as PermissionLevel)}
                      disabled={setPermissionMutation.isPending || user.role === 'admin'}
                    >
                      <SelectTrigger className="w-[130px]" data-testid={`permission-select-${feature.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hidden">
                          <div className="flex items-center gap-2">
                            <EyeOff className="w-4 h-4" />
                            Hidden
                          </div>
                        </SelectItem>
                        <SelectItem value="view">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            View Only
                          </div>
                        </SelectItem>
                        <SelectItem value="edit">
                          <div className="flex items-center gap-2">
                            <Edit className="w-4 h-4" />
                            Edit
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
