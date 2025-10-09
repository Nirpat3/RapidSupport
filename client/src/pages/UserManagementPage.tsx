import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Shield, User, Eye, Edit, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

interface UserPermission {
  id: string;
  userId: string;
  feature: string;
  permission: PermissionLevel;
}

interface UserWithPermissions {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  permissions: UserPermission[];
}

export default function UserManagementPage() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: usersWithPermissions, isLoading } = useQuery<UserWithPermissions[]>({
    queryKey: ['/api/permissions/users-with-permissions'],
  });

  const setPermissionMutation = useMutation({
    mutationFn: async ({ userId, feature, permission }: { userId: string; feature: string; permission: PermissionLevel }) => {
      return apiRequest('/api/permissions/set', 'POST', { userId, feature, permission });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/users-with-permissions'] });
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

  const getPermissionForFeature = (userPermissions: UserPermission[], feature: string): PermissionLevel => {
    const permission = userPermissions.find(p => p.feature === feature);
    return permission?.permission || 'view';
  };

  const handlePermissionChange = (userId: string, feature: string, permission: PermissionLevel) => {
    setPermissionMutation.mutate({ userId, feature, permission });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedUserData = usersWithPermissions?.find(u => u.user.id === selectedUser);

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage user roles and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Users List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Staff Members</CardTitle>
            <CardDescription>Select a user to manage permissions</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto space-y-2">
            {usersWithPermissions?.map(({ user }) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors hover-elevate ${
                  selectedUser === user.id ? 'bg-accent border-accent-foreground/20' : 'bg-background'
                }`}
                data-testid={`user-item-${user.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Permissions Grid */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>
              {selectedUserData ? `Permissions for ${selectedUserData.user.name}` : 'Select a User'}
            </CardTitle>
            <CardDescription>
              {selectedUserData 
                ? 'Configure which features this user can access and their permission level'
                : 'Choose a user from the list to manage their permissions'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {selectedUserData ? (
              <div className="space-y-4">
                {selectedUserData.user.role === 'admin' && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-primary">
                      <Shield className="w-4 h-4 inline mr-2" />
                      Admin users have full access to all features by default
                    </p>
                  </div>
                )}
                
                {FEATURES.map((feature, index) => (
                  <div key={feature.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium" data-testid={`feature-label-${feature.id}`}>{feature.label}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={getPermissionColor(getPermissionForFeature(selectedUserData.permissions, feature.id))}
                          className="gap-1"
                        >
                          {getPermissionIcon(getPermissionForFeature(selectedUserData.permissions, feature.id))}
                          {getPermissionForFeature(selectedUserData.permissions, feature.id)}
                        </Badge>
                        <Select
                          value={getPermissionForFeature(selectedUserData.permissions, feature.id)}
                          onValueChange={(value) => handlePermissionChange(selectedUserData.user.id, feature.id, value as PermissionLevel)}
                          disabled={setPermissionMutation.isPending || selectedUserData.user.role === 'admin'}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`permission-select-${feature.id}`}>
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
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a user to view and manage their permissions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
