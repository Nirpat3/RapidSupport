import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Building2, Eye, EyeOff, MessageSquare, ArrowLeft, UserPlus } from "lucide-react";
import { Link } from "wouter";

interface OrgCustomerLoginPageProps {
  orgSlug: string;
}

interface OrganizationBranding {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  welcomeMessage: string | null;
}

export default function OrgCustomerLoginPage({ orgSlug }: OrgCustomerLoginPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const { data: org, isLoading: orgLoading, isError } = useQuery<OrganizationBranding>({
    queryKey: ['/api/public/organizations', orgSlug],
  });

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(`portalRememberedEmail_${orgSlug}`);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, [orgSlug]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string; organizationId?: string }) => {
      return await apiRequest('/api/portal/auth/login', 'POST', credentials);
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome to the customer portal.",
      });
      setLocation("/portal");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; company?: string; organizationId?: string }) => {
      return await apiRequest('/api/public/customers/signup', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "You can now log in with your credentials.",
      });
      setIsSignup(false);
      setName("");
      setCompany("");
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
    
    if (isSignup) {
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
        organizationId: org?.id 
      });
      return;
    }
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter both email and password",
      });
      return;
    }
    
    if (rememberMe) {
      localStorage.setItem(`portalRememberedEmail_${orgSlug}`, email);
    } else {
      localStorage.removeItem(`portalRememberedEmail_${orgSlug}`);
    }
    
    loginMutation.mutate({ email, password, organizationId: org?.id });
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Organization Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The organization "{orgSlug}" doesn't exist or is no longer active.
            </p>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPending = loginMutation.isPending || signupMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-16 w-16">
                {org.logo ? (
                  <AvatarImage src={org.logo} alt={org.name} />
                ) : null}
                <AvatarFallback 
                  className="text-2xl font-semibold"
                  style={{ 
                    backgroundColor: org.primaryColor ? `${org.primaryColor}20` : undefined,
                    color: org.primaryColor || undefined
                  }}
                >
                  {org.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">{org.name}</CardTitle>
            <CardDescription>
              {isSignup ? "Create your customer account" : "Sign in to your customer account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company (optional)</Label>
                    <Input
                      id="company"
                      placeholder="Your company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isSignup ? "Create a password" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              {!isSignup && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label 
                    htmlFor="remember-me" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending 
                  ? (isSignup ? "Creating account..." : "Signing in...")
                  : (isSignup ? "Create Account" : "Sign In")
                }
              </Button>
            </form>
            
            <div className="mt-4 pt-4 border-t text-center">
              {isSignup ? (
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button 
                    onClick={() => setIsSignup(false)} 
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button 
                    onClick={() => setIsSignup(true)} 
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Link href={`/chat/${orgSlug}`}>
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat Without Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
