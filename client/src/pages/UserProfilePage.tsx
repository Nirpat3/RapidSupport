import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FormDescription,
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
  Power, Eye, Edit, EyeOff, Key, Activity, Mail,
  Calendar, Clock, CheckCircle, XCircle, UserCog
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { format } from "date-fns";

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

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

const updatePasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const updateRoleSchema = z.object({
  role: z.enum(["admin", "agent"]),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>;
type UpdateRoleForm = z.infer<typeof updateRoleSchema>;

export default function UserProfilePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const userId = params.id;
  const [activeTab, setActiveTab] = useState("profile");

  const { data: user, isLoading: isLoadingUser } = useQuery<UserData>({
    queryKey: ['/api/users', userId],
    enabled: !!userId,
  });

  const { data: permissions, isLoading: isLoadingPermissions } = useQuery<UserPermission[]>({
    queryKey: ['/api/permissions/user', userId],
    enabled: !!userId,
  });

  const profileForm = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const passwordForm = useForm<UpdatePasswordForm>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const roleForm = useForm<UpdateRoleForm>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      role: "agent",
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        email: user.email,
      });
      roleForm.reset({
        role: user.role as "admin" | "agent",
      });
    }
  }, [user, profileForm, roleForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileForm) => {
      return apiRequest(`/api/users/${userId}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      toast({
        title: "Profile updated",
        description: "User profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to update profile.",
      });
    }
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: UpdatePasswordForm) => {
      return apiRequest(`/api/users/${userId}`, 'PUT', { password: data.newPassword });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password updated",
        description: "User password has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to update password.",
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: UpdateRoleForm) => {
      return apiRequest(`/api/users/${userId}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to update role.",
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 p-6 pb-4 border-b flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation('/user-management')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold" data-testid="text-user-name">{user.name}</h1>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role === 'admin' ? 'Administrator' : 'Agent'}
              </Badge>
              <Badge variant={user.status === 'disabled' ? 'destructive' : 'outline'}>
                {user.status === 'disabled' ? (
                  <><XCircle className="w-3 h-3 mr-1" /> Disabled</>
                ) : (
                  <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                )}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {user.email}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant={user.status === 'disabled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleStatusMutation.mutate()}
            disabled={toggleStatusMutation.isPending}
            data-testid="button-toggle-status"
          >
            {toggleStatusMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Power className="w-4 h-4 mr-2" />
            )}
            {user.status === 'disabled' ? 'Enable' : 'Disable'}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" data-testid="button-delete-user">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{user.name}" and all their permissions. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteUserMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Delete User
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-4 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="role" className="flex items-center gap-2" data-testid="tab-role">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Role</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2" data-testid="tab-password">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">Password</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2" data-testid="tab-activity">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update the user's basic profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} data-testid="input-edit-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'Unknown'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {user.updatedAt ? format(new Date(user.updatedAt), 'PPP p') : 'Never'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Profile
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="role" className="mt-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" />
                  User Role
                </CardTitle>
                <CardDescription>
                  Change the user's role to control their access level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...roleForm}>
                  <form onSubmit={roleForm.handleSubmit((data) => updateRoleMutation.mutate(data))} className="space-y-6">
                    <FormField
                      control={roleForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="max-w-xs" data-testid="select-edit-role">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="agent">Agent</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === 'admin' 
                              ? 'Administrators have full access to all features and can manage other users.'
                              : 'Agents have access to conversations and features based on their permissions.'
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateRoleMutation.isPending}
                        data-testid="button-save-role"
                      >
                        {updateRoleMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Role
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Feature Permissions
                </CardTitle>
                <CardDescription>
                  {user.role === 'admin' 
                    ? 'Administrators have full access to all features'
                    : 'Configure which features this user can access'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user.role === 'admin' && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
                    <p className="text-sm font-medium text-primary flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrators have full access to all features. Permission settings are disabled.
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Set a new password for this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter new password" {...field} data-testid="input-new-password" />
                            </FormControl>
                            <FormDescription>
                              Must be at least 6 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm new password" {...field} data-testid="input-confirm-password" />
                            </FormControl>
                            <FormDescription>
                              Re-enter the password to confirm
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updatePasswordMutation.isPending}
                        data-testid="button-save-password"
                      >
                        {updatePasswordMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="w-4 h-4 mr-2" />
                        )}
                        Update Password
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  User Activity
                </CardTitle>
                <CardDescription>
                  View recent activity and login history for this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Account Status</div>
                        <div className="text-2xl font-bold flex items-center gap-2 mt-1">
                          {user.status === 'disabled' ? (
                            <><XCircle className="w-5 h-5 text-destructive" /> Disabled</>
                          ) : (
                            <><CheckCircle className="w-5 h-5 text-green-500" /> Active</>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Member Since</div>
                        <div className="text-2xl font-bold mt-1">
                          {user.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : 'Unknown'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Role</div>
                        <div className="text-2xl font-bold capitalize mt-1">
                          {user.role === 'admin' ? 'Administrator' : 'Agent'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-4">Account Timeline</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Last Updated</p>
                          <p className="text-sm text-muted-foreground">
                            {user.updatedAt ? format(new Date(user.updatedAt), 'PPP p') : 'Never updated'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">Account Created</p>
                          <p className="text-sm text-muted-foreground">
                            {user.createdAt ? format(new Date(user.createdAt), 'PPP p') : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
