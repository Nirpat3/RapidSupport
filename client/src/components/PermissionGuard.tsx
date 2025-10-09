import { useEffect } from "react";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldOff, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PermissionGuardProps {
  children: React.ReactNode;
  feature: string;
  requireEdit?: boolean;
}

export function PermissionGuard({ children, feature, requireEdit = false }: PermissionGuardProps) {
  const { user } = useAuth();
  const { canView, canEdit, isHidden, isLoading, isError } = usePermissions();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Determine access level (computed early for hooks)
  const isFeatureHidden = user?.role === 'admin' ? false : isHidden(feature);
  const hasViewAccess = user?.role === 'admin' ? true : canView(feature);
  const hasEditAccess = user?.role === 'admin' ? true : canEdit(feature);

  // Handle all redirects at top level (unconditional hooks)
  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!user) {
      setLocation('/login');
      return;
    }

    // Admins bypass permission checks
    if (user.role === 'admin' || isLoading) return;

    // Redirect users with hidden permission
    if (isFeatureHidden) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this feature.",
      });
      setLocation('/dashboard');
    }
  }, [user, isFeatureHidden, isLoading, setLocation, toast]);

  // Show nothing while redirecting unauthenticated users
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Admins bypass all permission checks
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  // Show loading state while permissions are being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Fail closed: If there was an error loading permissions, deny access
  if (isError) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Permission Error
            </CardTitle>
            <CardDescription>
              Unable to verify your permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              There was an error loading your permissions. Please refresh the page or contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Block access if feature is hidden
  if (isFeatureHidden) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldOff className="w-5 h-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator if you believe you should have access to this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if edit permission is required but user only has view
  if (requireEdit && !hasEditAccess) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldOff className="w-5 h-5" />
              Read-Only Access
            </CardTitle>
            <CardDescription>
              You have read-only access to this feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to request edit permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user can at least view
  if (!hasViewAccess) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldOff className="w-5 h-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to view this feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator if you believe you should have access to this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
