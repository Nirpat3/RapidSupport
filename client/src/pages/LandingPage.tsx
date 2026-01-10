import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, 
  MessageSquare, 
  Search,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  Users,
  Briefcase,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  welcomeMessage: string | null;
  website: string | null;
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  
  const [customerSignupOpen, setCustomerSignupOpen] = useState(false);
  const [orgSignupOpen, setOrgSignupOpen] = useState(false);
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);

  const { data: organizations = [], isLoading } = useQuery<PublicOrganization[]>({
    queryKey: ['/api/public/organizations'],
  });

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg">Support Board</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("organizations")}>
              Organizations
            </Button>
            <Dialog open={staffLoginOpen} onOpenChange={setStaffLoginOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <LogIn className="w-4 h-4" />
                  Staff Login
                </Button>
              </DialogTrigger>
              <DialogContent>
                <StaffLoginForm 
                  onSuccess={() => {
                    setStaffLoginOpen(false);
                    setLocation("/dashboard");
                  }} 
                />
              </DialogContent>
            </Dialog>
          </nav>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
          </TabsList>

          <TabsContent value="home">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Customer Support Platform</Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Get Support from <span className="text-primary">Any Organization</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Connect with organizations instantly. Whether you need help with a product, 
                service, or have questions - we make customer support simple.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Dialog open={customerSignupOpen} onOpenChange={setCustomerSignupOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2">
                      <UserPlus className="w-5 h-5" />
                      Sign Up as Customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <CustomerSignupForm 
                      organizations={organizations}
                      onSuccess={() => {
                        setCustomerSignupOpen(false);
                        toast({
                          title: "Account created",
                          description: "You can now access the customer portal.",
                        });
                      }} 
                    />
                  </DialogContent>
                </Dialog>
                
                <Dialog open={orgSignupOpen} onOpenChange={setOrgSignupOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" variant="outline" className="gap-2">
                      <Building2 className="w-5 h-5" />
                      Register Your Organization
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <OrganizationSignupForm 
                      onSuccess={() => {
                        setOrgSignupOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['/api/public/organizations'] });
                        toast({
                          title: "Organization registered",
                          description: "Your organization is now set up. Check your email for login details.",
                        });
                      }} 
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="text-center p-6">
                <div className="p-3 rounded-xl bg-emerald-500/10 w-fit mx-auto mb-3">
                  <Clock className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-semibold mb-2">Instant Support</h3>
                <p className="text-sm text-muted-foreground">Get help immediately with AI-powered responses</p>
              </Card>
              <Card className="text-center p-6">
                <div className="p-3 rounded-xl bg-blue-500/10 w-fit mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="font-semibold mb-2">Smart Assistance</h3>
                <p className="text-sm text-muted-foreground">AI agents trained on organization knowledge bases</p>
              </Card>
              <Card className="text-center p-6">
                <div className="p-3 rounded-xl bg-purple-500/10 w-fit mx-auto mb-3">
                  <Shield className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="font-semibold mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">Your conversations are protected and confidential</p>
              </Card>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Popular Organizations</h2>
              <p className="text-muted-foreground">Start chatting with these organizations</p>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted" />
                        <div className="flex-1">
                          <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : organizations.length === 0 ? (
              <Card className="p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to register your organization!</p>
                <Button onClick={() => setOrgSignupOpen(true)}>
                  Register Now
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.slice(0, 6).map(org => (
                  <OrganizationCard key={org.id} org={org} />
                ))}
              </div>
            )}

            {organizations.length > 6 && (
              <div className="text-center mt-8">
                <Button variant="outline" onClick={() => setActiveTab("organizations")}>
                  View All Organizations
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="organizations">
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    All Organizations
                  </h2>
                  <p className="text-muted-foreground">
                    {organizations.length} organization{organizations.length !== 1 ? 's' : ''} registered
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-muted" />
                          <div className="flex-1">
                            <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredOrgs.length === 0 ? (
                <Card className="p-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? "No organizations found" : "No organizations available"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? "Try a different search term" 
                      : "Organizations will appear here once registered"}
                  </p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrgs.map(org => (
                    <OrganizationCard key={org.id} org={org} showLoginButton />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-12">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>Powered by Support Board - Multi-tenant Customer Support Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function OrganizationCard({ org, showLoginButton = false }: { org: PublicOrganization; showLoginButton?: boolean }) {
  return (
    <Card className="hover-elevate transition-all duration-200 h-full">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            {org.logo ? (
              <AvatarImage src={org.logo} alt={org.name} />
            ) : null}
            <AvatarFallback 
              className="text-lg font-semibold"
              style={{ 
                backgroundColor: org.primaryColor ? `${org.primaryColor}20` : undefined,
                color: org.primaryColor || undefined
              }}
            >
              {org.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{org.name}</h3>
            {org.welcomeMessage && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {org.welcomeMessage}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            Chat Available
          </Badge>
          <div className="flex gap-2">
            {showLoginButton && (
              <Link href={`/org/${org.slug}/login`}>
                <Button size="sm" variant="ghost" className="gap-1">
                  <LogIn className="w-3 h-3" />
                  Login
                </Button>
              </Link>
            )}
            <Link href={`/chat/${org.slug}`}>
              <Button size="sm" variant="ghost" className="gap-1">
                Start Chat
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StaffLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return await apiRequest('/api/auth/login', 'POST', credentials);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Login successful",
        description: `Welcome back!`,
      });
      
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter both email and password",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <LogIn className="w-5 h-5" />
          Staff Login
        </DialogTitle>
        <DialogDescription>
          Sign in to access the admin dashboard
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input
            id="staff-email"
            type="email"
            placeholder="you@organization.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loginMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-password">Password</Label>
          <div className="relative">
            <Input
              id="staff-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginMutation.isPending}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </>
  );
}

function CustomerSignupForm({ organizations, onSuccess }: { organizations: PublicOrganization[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const signupMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; company?: string; organizationId?: string }) => {
      return await apiRequest('/api/public/customers/signup', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "You can now log in to the customer portal.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message || "Could not create account",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all required fields",
      });
      return;
    }
    signupMutation.mutate({ 
      name, 
      email, 
      password, 
      company: company || undefined,
      organizationId: selectedOrgId || undefined 
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Customer Sign Up
        </DialogTitle>
        <DialogDescription>
          Create an account to access customer portal features
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name">Full Name *</Label>
          <Input
            id="customer-name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={signupMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-email">Email *</Label>
          <Input
            id="customer-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={signupMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-password">Password *</Label>
          <div className="relative">
            <Input
              id="customer-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={signupMutation.isPending}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-company">Company (optional)</Label>
          <Input
            id="customer-company"
            placeholder="Your company name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={signupMutation.isPending}
          />
        </div>
        {organizations.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="customer-org">Associated Organization (optional)</Label>
            <select
              id="customer-org"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              disabled={signupMutation.isPending}
            >
              <option value="">Select an organization...</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )}
        <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
          {signupMutation.isPending ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </>
  );
}

function OrganizationSignupForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [website, setWebsite] = useState("");
  
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/public/organizations/signup', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Organization registered",
        description: "Your organization has been set up. You can now log in.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Could not register organization",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!orgName || !orgSlug) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Please enter organization name and slug",
        });
        return;
      }
      setStep(2);
      return;
    }
    
    if (!adminName || !adminEmail || !adminPassword) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all admin details",
      });
      return;
    }
    
    signupMutation.mutate({
      organization: {
        name: orgName,
        slug: orgSlug,
        website: website || undefined,
      },
      admin: {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Register Your Organization
        </DialogTitle>
        <DialogDescription>
          Set up your organization to provide customer support
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center justify-center gap-2 my-4">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          <Briefcase className="w-4 h-4" />
        </div>
        <div className={`w-12 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          <Users className="w-4 h-4" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                placeholder="Acme Corporation"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (!orgSlug || orgSlug === generateSlug(orgName)) {
                    setOrgSlug(generateSlug(e.target.value));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/chat/</span>
                <Input
                  id="org-slug"
                  placeholder="acme"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(generateSlug(e.target.value))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will be your organization's unique URL
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-website">Website (optional)</Label>
              <Input
                id="org-website"
                placeholder="https://acme.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        ) : (
          <>
            <div className="p-3 rounded-lg bg-muted/50 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="font-medium">{orgName}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin-name">Admin Name *</Label>
              <Input
                id="admin-name"
                placeholder="John Smith"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                disabled={signupMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email *</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@acme.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={signupMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password *</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={signupMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={signupMutation.isPending}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={signupMutation.isPending}>
                {signupMutation.isPending ? "Registering..." : "Complete Registration"}
              </Button>
            </div>
          </>
        )}
      </form>
    </>
  );
}
