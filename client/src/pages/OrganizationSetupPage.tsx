import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Building2,
  Loader2,
  Check,
  AlertCircle,
  User,
  Mail,
  Lock,
  Globe,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";

interface TokenInfo {
  valid: boolean;
  organizationName: string;
  organizationSlug: string;
  contactName: string;
  contactEmail: string;
}

const setupSchema = z.object({
  adminName: z.string().min(1, "Name is required"),
  adminEmail: z.string().email("Valid email required"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  welcomeMessage: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
}).refine(data => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetupForm = z.infer<typeof setupSchema>;

export default function OrganizationSetupPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);

  const form = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      adminName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
      welcomeMessage: "",
      supportEmail: "",
      website: "",
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    setToken(tokenParam);

    if (tokenParam) {
      validateToken(tokenParam);
    } else {
      setTokenError("No setup token provided");
      setIsValidating(false);
    }
  }, []);

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/public/organization-setup/${tokenValue}`);
      const data = await response.json();

      if (!response.ok) {
        setTokenError(data.error || "Invalid setup link");
        setIsValidating(false);
        return;
      }

      setTokenInfo(data);
      form.setValue('adminName', data.contactName);
      form.setValue('adminEmail', data.contactEmail);
      setIsValidating(false);
    } catch (error) {
      setTokenError("Failed to validate setup link");
      setIsValidating(false);
    }
  };

  const setupMutation = useMutation({
    mutationFn: async (data: SetupForm) => {
      const response = await fetch(`/api/public/organization-setup/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          welcomeMessage: data.welcomeMessage || undefined,
          supportEmail: data.supportEmail || undefined,
          website: data.website || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete setup');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSetupComplete(true);
      toast({ title: "Success", description: "Your organization has been set up successfully!" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to complete setup." });
    },
  });

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Validating setup link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invalid Setup Link</h2>
            <p className="text-muted-foreground mb-6">{tokenError}</p>
            <Button onClick={() => setLocation("/")} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Setup Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Your organization <strong>{tokenInfo?.organizationName}</strong> has been created successfully.
              You can now log in with your admin credentials.
            </p>
            <Button onClick={() => setLocation("/login")} className="gap-2">
              <User className="w-4 h-4" />
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Complete Your Organization Setup</h1>
          <p className="text-muted-foreground">
            Set up <strong>{tokenInfo?.organizationName}</strong> on Nova AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Create your admin account and configure your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => setupMutation.mutate(data))} className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="font-medium">{tokenInfo?.organizationName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      URL: {tokenInfo?.organizationSlug}.novaai.com
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Admin Account
                    </h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="adminName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John Smith" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="adminEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="john@company.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      <FormField
                        control={form.control}
                        name="adminPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="Min 8 characters" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="Confirm password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Organization Settings (Optional)
                    </h3>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="welcomeMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Welcome Message</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Hello! How can we help you today?"
                                rows={3}
                              />
                            </FormControl>
                            <FormDescription>
                              This message will be shown to customers when they start a conversation.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="supportEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Support Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="support@company.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://company.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={setupMutation.isPending}>
                  {setupMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Complete Setup
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
