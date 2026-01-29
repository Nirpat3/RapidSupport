import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  Mail,
  Link2,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  User,
} from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface StaffInvite {
  id: string;
  token: string;
  email: string;
  name: string | null;
  role: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["agent", "admin"]),
  mustChangePassword: z.boolean(),
});

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().optional(),
  role: z.enum(["agent", "admin"]),
  expiresInDays: z.number().min(1).max(30),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type InviteForm = z.infer<typeof inviteSchema>;

export default function TeamManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);

  const { data: teamMembers = [], isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/users'],
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery<StaffInvite[]>({
    queryKey: ['/api/staff-invites'],
  });

  const createUserForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "agent",
      mustChangePassword: false,
    },
  });

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "agent",
      expiresInDays: 7,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      return apiRequest('/api/users', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Team member created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setCreateUserOpen(false);
      createUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create team member",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteForm) => {
      return apiRequest('/api/staff-invites', 'POST', data);
    },
    onSuccess: (data: any) => {
      toast({ title: "Success", description: "Invite link generated" });
      queryClient.invalidateQueries({ queryKey: ['/api/staff-invites'] });
      setGeneratedInviteUrl(data.inviteUrl);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate invite",
      });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return apiRequest(`/api/staff-invites/${inviteId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Invite revoked" });
      queryClient.invalidateQueries({ queryKey: ['/api/staff-invites'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to revoke invite",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Link copied to clipboard" });
  };

  const getInviteStatus = (invite: StaffInvite) => {
    if (invite.usedAt) return { label: "Used", variant: "default" as const };
    if (new Date(invite.expiresAt) < new Date()) return { label: "Expired", variant: "destructive" as const };
    return { label: "Pending", variant: "secondary" as const };
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's team members and invitations
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={inviteOpen} onOpenChange={(open) => {
            setInviteOpen(open);
            if (!open) {
              setGeneratedInviteUrl(null);
              inviteForm.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Link2 className="w-4 h-4" />
                Generate Invite Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Invite Link</DialogTitle>
                <DialogDescription>
                  Create a self-registration link to send to new team members
                </DialogDescription>
              </DialogHeader>
              
              {generatedInviteUrl ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-sm text-muted-foreground">Invite Link</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input value={generatedInviteUrl} readOnly className="text-sm" />
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedInviteUrl)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => {
                    setGeneratedInviteUrl(null);
                    inviteForm.reset();
                  }}>
                    Generate Another
                  </Button>
                </div>
              ) : (
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit((d) => inviteMutation.mutate(d))} className="space-y-4">
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="new.member@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={inviteForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
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
                    
                    <FormField
                      control={inviteForm.control}
                      name="expiresInDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link expires in</FormLabel>
                          <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 day</SelectItem>
                              <SelectItem value="3">3 days</SelectItem>
                              <SelectItem value="7">7 days</SelectItem>
                              <SelectItem value="14">14 days</SelectItem>
                              <SelectItem value="30">30 days</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full gap-2" disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      Generate Link
                    </Button>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
          
          <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Create a new account for a team member with login credentials
                </DialogDescription>
              </DialogHeader>
              
              <Form {...createUserForm}>
                <form onSubmit={createUserForm.handleSubmit((d) => createUserMutation.mutate(d))} className="space-y-4">
                  <FormField
                    control={createUserForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createUserForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createUserForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min 8 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createUserForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
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
                  
                  <FormField
                    control={createUserForm.control}
                    name="mustChangePassword"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Require password change</FormLabel>
                          <FormDescription>
                            User must change password on first login
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full gap-2" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    Create Account
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Team Members ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2">
            <Mail className="w-4 h-4" />
            Pending Invites ({invites.filter(i => !i.usedAt && new Date(i.expiresAt) > new Date()).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {membersLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : teamMembers.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Team Members Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first team member to get started
              </p>
              <Button onClick={() => setCreateUserOpen(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Team Member
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {teamMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {member.role === 'admin' ? (
                          <Shield className="w-5 h-5 text-primary" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                      <Badge variant={member.status === 'online' ? 'default' : 'outline'}>
                        {member.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          {invitesLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : invites.length === 0 ? (
            <Card className="p-8 text-center">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Invites</h3>
              <p className="text-muted-foreground mb-4">
                Generate invite links to let people self-register
              </p>
              <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2">
                <Link2 className="w-4 h-4" />
                Generate Invite Link
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invites.map((invite) => {
                const status = getInviteStatus(invite);
                const baseUrl = window.location.origin;
                const inviteUrl = `${baseUrl}/join?token=${invite.token}`;
                
                return (
                  <Card key={invite.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {status.label === 'Used' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : status.label === 'Expired' ? (
                            <XCircle className="w-5 h-5 text-destructive" />
                          ) : (
                            <Clock className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{invite.email}</div>
                          <div className="text-sm text-muted-foreground">
                            {invite.name && `${invite.name} - `}
                            Expires {format(new Date(invite.expiresAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={invite.role === 'admin' ? 'default' : 'secondary'}>
                          {invite.role}
                        </Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {status.label === 'Pending' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(inviteUrl)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                        {!invite.usedAt && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteInviteMutation.mutate(invite.id)}
                          >
                            <Trash2 className="w-4 h-4" />
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
      </Tabs>
    </div>
  );
}
