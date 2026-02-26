import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, LogIn, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return await apiRequest('/api/auth/login', 'POST', credentials);
    },
    onSuccess: (data: any) => {
      if (data.requiresTwoFactor) {
        setRequires2fa(true);
        setTempToken(data.tempToken);
        toast({
          title: "Two-factor authentication",
          description: "Please enter the code from your authenticator app",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else {
        const role = data.user?.role;
        const isAdmin = role === 'admin' || data.user?.isPlatformAdmin;
        setLocation(isAdmin ? '/dashboard' : '/conversations');
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

  const verify2faMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/auth/2fa/verify', 'POST', {
        tempToken,
        code: twoFactorCode
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else {
        const role = data.user?.role;
        const isAdmin = role === 'admin' || data.user?.isPlatformAdmin;
        setLocation(isAdmin ? '/dashboard' : '/conversations');
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Invalid 2FA code",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requires2fa) {
      verify2faMutation.mutate();
      return;
    }
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please enter both email and password",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          onClick={() => setLocation('/')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <LogIn className="w-6 h-6" />
              {requires2fa ? "Two-Factor Authentication" : "Staff Login"}
            </CardTitle>
            <CardDescription>
              {requires2fa 
                ? "Enter the 6-digit code from your authenticator app" 
                : "Sign in to access the Nova AI platform"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!requires2fa ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      disabled={loginMutation.isPending}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={loginMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="2fa-code">Authenticator Code</Label>
                  <Input
                    id="2fa-code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    autoFocus
                    disabled={verify2faMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code from your app.
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={loginMutation.isPending || verify2faMutation.isPending}
              >
                {loginMutation.isPending || verify2faMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {requires2fa ? "Verifying..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {requires2fa ? "Verify & Sign In" : "Sign In"}
                  </>
                )}
              </Button>

              {requires2fa && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setRequires2fa(false);
                    setTwoFactorCode("");
                  }}
                >
                  Back to Login
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button 
            variant="ghost" 
            className="p-0 h-auto underline"
            onClick={() => setLocation('/')}
          >
            Contact your organization admin
          </Button>
        </p>
      </div>
    </div>
  );
}
