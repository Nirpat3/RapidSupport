import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Building2, 
  Briefcase, 
  ArrowRight, 
  LogOut,
  Users,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: string;
  organizationName: string;
  organizationId: string;
  joinedAt: string | null;
}

export default function WorkspaceSelectPage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ['/api/users/me/workspaces'],
    enabled: !!user,
  });

  const handleSelectWorkspace = async (workspace: Workspace) => {
    try {
      await apiRequest('/api/users/me/select-workspace', 'POST', { 
        workspaceId: workspace.id 
      });
      
      if (user?.role === 'admin' || user?.isPlatformAdmin) {
        setLocation('/dashboard');
      } else {
        setLocation('/conversations');
      }
    } catch (error) {
      console.error('Failed to select workspace:', error);
      setLocation('/dashboard');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please log in to continue.</p>
            <Link href="/">
              <Button className="mt-4">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Workspaces Found</h2>
            <p className="text-muted-foreground mb-4">
              You don't have access to any workspaces. Please contact your administrator.
            </p>
            <Button variant="outline" onClick={logout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (workspaces.length === 1) {
    handleSelectWorkspace(workspaces[0]);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Entering workspace...</p>
        </div>
      </div>
    );
  }

  const groupedByOrg = workspaces.reduce((acc, ws) => {
    if (!acc[ws.organizationId]) {
      acc[ws.organizationId] = {
        orgName: ws.organizationName,
        workspaces: []
      };
    }
    acc[ws.organizationId].workspaces.push(ws);
    return acc;
  }, {} as Record<string, { orgName: string; workspaces: Workspace[] }>);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-3xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Select a Workspace</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name}! Choose a workspace to continue.
          </p>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedByOrg).map(([orgId, { orgName, workspaces: orgWorkspaces }]) => (
            <div key={orgId}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {orgName}
                </h2>
              </div>
              <div className="grid gap-3">
                {orgWorkspaces.map(workspace => (
                  <Card 
                    key={workspace.id} 
                    className="hover-elevate cursor-pointer transition-all duration-200"
                    onClick={() => handleSelectWorkspace(workspace)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {workspace.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{workspace.name}</h3>
                            {workspace.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {workspace.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {workspace.role}
                              </Badge>
                              {workspace.joinedAt && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Joined {new Date(workspace.joinedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="gap-1">
                          Enter
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
