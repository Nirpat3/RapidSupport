import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Code2,
  Key,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Shield,
  Globe,
  Smartphone,
  FileCode,
  BookOpen,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface EmbedConfig {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  hasEmbedSecret: boolean;
  embedSecretCreatedAt: string | null;
  embedWidgetUrl: string;
  embedEndpoints: {
    exchangeToken: string;
    initSession: string;
    resumeSession: string;
    config: string;
  };
}

export default function ApiIntegrationPage() {
  const { toast } = useToast();
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string>("");
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [showSecretDialog, setShowSecretDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
  });

  const { data: embedConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery<EmbedConfig>({
    queryKey: ['/api/admin/organizations', selectedOrgId, 'embed-config'],
    queryFn: () => apiRequest(`/api/admin/organizations/${selectedOrgId}/embed-config`, 'GET'),
    enabled: !!selectedOrgId,
  });

  const generateSecretMutation = useMutation({
    mutationFn: (orgId: string) => apiRequest(`/api/admin/organizations/${orgId}/embed-secret`, 'POST'),
    onSuccess: (data) => {
      setGeneratedSecret(data.secret);
      setShowSecretDialog(true);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations', selectedOrgId, 'embed-config'] });
      toast({
        title: "Secret Generated",
        description: "Your embed secret has been generated. Copy it now - it won't be shown again.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate embed secret. Please try again.",
        variant: "destructive",
      });
    },
  });

  const revokeSecretMutation = useMutation({
    mutationFn: (orgId: string) => apiRequest(`/api/admin/organizations/${orgId}/embed-secret`, 'DELETE'),
    onSuccess: () => {
      setShowRevokeDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations', selectedOrgId, 'embed-config'] });
      toast({
        title: "Secret Revoked",
        description: "The embed secret has been revoked. All existing tokens will no longer work.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke embed secret. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedText(label);
      setTimeout(() => setCopiedText(""), 2000);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const getBaseUrl = () => {
    return window.location.origin;
  };

  const webEmbedCode = embedConfig ? `<!-- Support Chat Widget -->
<script 
  src="${getBaseUrl()}/embed/widget.js"
  data-org="${embedConfig.organizationSlug}"
  async>
</script>` : '';

  const preAuthEmbedCode = embedConfig ? `<!-- Pre-authenticated Support Chat Widget -->
<script 
  src="${getBaseUrl()}/embed/widget.js"
  data-org="${embedConfig.organizationSlug}"
  data-customer-token="{{CUSTOMER_TOKEN}}"
  async>
</script>` : '';

  const serverSideNodeCode = `// Node.js - Generate Customer Token
const crypto = require('crypto');

function createCustomerToken(customer, embedSecret, orgSlug) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    email: customer.email,
    name: customer.name,
    externalId: customer.id, // Your system's user ID
    company: customer.company || undefined,
    phone: customer.phone || undefined,
    orgSlug: orgSlug,
    iat: now,
    exp: now + 3600, // Token expires in 1 hour
  };
  
  const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const encodedHeader = base64url(header);
  const encodedPayload = base64url(payload);
  
  const signature = crypto
    .createHmac('sha256', embedSecret)
    .update(\`\${encodedHeader}.\${encodedPayload}\`)
    .digest('base64url');
  
  return \`\${encodedHeader}.\${encodedPayload}.\${signature}\`;
}

// Usage:
const token = createCustomerToken(
  { email: 'user@example.com', name: 'John Doe', id: 'user123' },
  process.env.EMBED_SECRET,
  '${embedConfig?.organizationSlug || 'your-org-slug'}'
);`;

  const serverSidePythonCode = `# Python - Generate Customer Token
import hmac
import hashlib
import base64
import json
import time
import os

def create_customer_token(customer, embed_secret, org_slug):
    header = {'alg': 'HS256', 'typ': 'JWT'}
    now = int(time.time())
    
    payload = {
        'email': customer['email'],
        'name': customer['name'],
        'externalId': customer.get('id'),
        'company': customer.get('company'),
        'phone': customer.get('phone'),
        'orgSlug': org_slug,
        'iat': now,
        'exp': now + 3600,
    }
    
    def base64url_encode(data):
        return base64.urlsafe_b64encode(
            json.dumps(data).encode()
        ).rstrip(b'=').decode()
    
    encoded_header = base64url_encode(header)
    encoded_payload = base64url_encode(payload)
    
    signature = hmac.new(
        embed_secret.encode(),
        f"{encoded_header}.{encoded_payload}".encode(),
        hashlib.sha256
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b'=').decode()
    
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

# Usage:
token = create_customer_token(
    {'email': 'user@example.com', 'name': 'John Doe', 'id': 'user123'},
    os.environ['EMBED_SECRET'],
    '${embedConfig?.organizationSlug || 'your-org-slug'}'
)`;

  const mobileReactNativeCode = `// React Native - Embed Widget using WebView
import { WebView } from 'react-native-webview';

function SupportChat({ customerToken }) {
  const orgSlug = '${embedConfig?.organizationSlug || 'your-org-slug'}';
  const baseUrl = '${getBaseUrl()}';
  
  // Generate this token on your backend server
  const chatUrl = customerToken 
    ? \`\${baseUrl}/chat/\${orgSlug}?token=\${customerToken}\`
    : \`\${baseUrl}/chat/\${orgSlug}\`;
  
  return (
    <WebView
      source={{ uri: chatUrl }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
    />
  );
}`;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">API & Integrations</h1>
              <p className="text-sm text-muted-foreground">Embed support chat in your website or mobile app</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Select Organization
              </CardTitle>
              <CardDescription>
                Choose the organization you want to configure embed integration for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedOrgId && (
            <Tabs defaultValue="credentials" className="space-y-4">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="credentials" className="gap-2">
                  <Key className="h-4 w-4" />
                  <span className="hidden sm:inline">Credentials</span>
                </TabsTrigger>
                <TabsTrigger value="web" className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Web</span>
                </TabsTrigger>
                <TabsTrigger value="mobile" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="hidden sm:inline">Mobile</span>
                </TabsTrigger>
                <TabsTrigger value="docs" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Docs</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="credentials" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Embed Secret
                    </CardTitle>
                    <CardDescription>
                      Your secret key is used to sign customer tokens for pre-authenticated embed sessions.
                      Keep this secret secure and never expose it in client-side code.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {configLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading configuration...
                      </div>
                    ) : embedConfig?.hasEmbedSecret ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
                          <Key className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium">Secret Active</p>
                            <p className="text-sm text-muted-foreground">
                              Created: {embedConfig.embedSecretCreatedAt 
                                ? new Date(embedConfig.embedSecretCreatedAt).toLocaleDateString()
                                : 'Unknown'}
                            </p>
                          </div>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => generateSecretMutation.mutate(selectedOrgId)}
                            disabled={generateSecretMutation.isPending}
                          >
                            {generateSecretMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Rotate Secret
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => setShowRevokeDialog(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revoke Secret
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <div className="flex-1">
                            <p className="font-medium">No Secret Configured</p>
                            <p className="text-sm text-muted-foreground">
                              Generate a secret to enable pre-authenticated customer embed sessions.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => generateSecretMutation.mutate(selectedOrgId)}
                          disabled={generateSecretMutation.isPending}
                        >
                          {generateSecretMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Key className="h-4 w-4 mr-2" />
                          )}
                          Generate Embed Secret
                        </Button>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <Label>Organization Slug</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={embedConfig?.organizationSlug || ''} 
                          readOnly 
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(embedConfig?.organizationSlug || '', 'Organization Slug')}
                        >
                          {copiedText === 'Organization Slug' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="web" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Embed (Anonymous Users)</CardTitle>
                    <CardDescription>
                      Add this script to your website to enable support chat for anonymous visitors.
                      No server-side code required.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm">
                        <code>{webEmbedCode}</code>
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(webEmbedCode, 'Embed Code')}
                      >
                        {copiedText === 'Embed Code' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pre-Authenticated Embed (Logged-in Users)</CardTitle>
                    <CardDescription>
                      For users already logged into your application, generate a customer token on your server
                      and pass it to the widget. This allows seamless identity verification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm">
                        <code>{preAuthEmbedCode}</code>
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(preAuthEmbedCode, 'Pre-Auth Embed Code')}
                      >
                        {copiedText === 'Pre-Auth Embed Code' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        Server-Side Token Generation
                      </h4>

                      <Tabs defaultValue="nodejs" className="w-full">
                        <TabsList>
                          <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                          <TabsTrigger value="python">Python</TabsTrigger>
                        </TabsList>
                        <TabsContent value="nodejs">
                          <div className="relative">
                            <ScrollArea className="h-[300px]">
                              <pre className="p-4 rounded-lg bg-muted text-sm">
                                <code>{serverSideNodeCode}</code>
                              </pre>
                            </ScrollArea>
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(serverSideNodeCode, 'Node.js Code')}
                            >
                              {copiedText === 'Node.js Code' ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                        <TabsContent value="python">
                          <div className="relative">
                            <ScrollArea className="h-[300px]">
                              <pre className="p-4 rounded-lg bg-muted text-sm">
                                <code>{serverSidePythonCode}</code>
                              </pre>
                            </ScrollArea>
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(serverSidePythonCode, 'Python Code')}
                            >
                              {copiedText === 'Python Code' ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mobile" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      React Native Integration
                    </CardTitle>
                    <CardDescription>
                      Embed the support chat in your React Native mobile app using WebView.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <ScrollArea className="h-[250px]">
                        <pre className="p-4 rounded-lg bg-muted text-sm">
                          <code>{mobileReactNativeCode}</code>
                        </pre>
                      </ScrollArea>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(mobileReactNativeCode, 'React Native Code')}
                      >
                        {copiedText === 'React Native Code' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Native iOS & Android</CardTitle>
                    <CardDescription>
                      For native mobile apps, use a WebView component to load the chat interface.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border">
                        <h4 className="font-medium mb-2">Chat URL</h4>
                        <div className="flex gap-2">
                          <Input 
                            value={`${getBaseUrl()}/chat/${embedConfig?.organizationSlug || 'your-org'}`}
                            readOnly 
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(
                              `${getBaseUrl()}/chat/${embedConfig?.organizationSlug || 'your-org'}`,
                              'Chat URL'
                            )}
                          >
                            {copiedText === 'Chat URL' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Load this URL in a WKWebView (iOS) or WebView (Android).
                          Append <code className="bg-muted px-1 rounded">?token=YOUR_TOKEN</code> for pre-authenticated users.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="docs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 rounded-lg border space-y-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          1
                        </div>
                        <h4 className="font-medium">Generate Secret</h4>
                        <p className="text-sm text-muted-foreground">
                          Create an embed secret in the Credentials tab. Store it securely on your server.
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border space-y-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          2
                        </div>
                        <h4 className="font-medium">Embed Widget</h4>
                        <p className="text-sm text-muted-foreground">
                          Add the embed script to your website. For logged-in users, generate tokens server-side.
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border space-y-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          3
                        </div>
                        <h4 className="font-medium">Start Chatting</h4>
                        <p className="text-sm text-muted-foreground">
                          Your users can now chat with your support team directly from your app.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Authentication Flows</h4>
                      
                      <div className="space-y-3">
                        <div className="p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Anonymous</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Simple Embed</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Users start anonymous and can optionally provide their name/email during chat.
                            No secret key required.
                          </p>
                        </div>

                        <div className="p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>Pre-Authenticated</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Token-Based Embed</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Your server generates a signed JWT token with the user's identity.
                            The widget validates this token and automatically identifies the user.
                            Requires embed secret.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">API Endpoints</h4>
                      
                      <div className="space-y-2">
                        {embedConfig?.embedEndpoints && Object.entries(embedConfig.embedEndpoints).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-mono text-sm">{value}</p>
                              <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(`${getBaseUrl()}${value}`, key)}
                            >
                              {copiedText === key ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Security Best Practices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Keep secrets server-side</p>
                          <p className="text-sm text-muted-foreground">
                            Never expose your embed secret in client-side JavaScript or mobile app code.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Use short-lived tokens</p>
                          <p className="text-sm text-muted-foreground">
                            Customer tokens expire after 1 hour by default. Generate fresh tokens for each session.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Rotate secrets regularly</p>
                          <p className="text-sm text-muted-foreground">
                            Use the "Rotate Secret" feature periodically. Old tokens will stop working immediately.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">HTTPS only</p>
                          <p className="text-sm text-muted-foreground">
                            Always serve your website over HTTPS when using the embed widget.
                          </p>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {!selectedOrgId && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Select an Organization</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Choose an organization above to view and manage its API integration settings,
                  embed codes, and documentation.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showSecretDialog} onOpenChange={setShowSecretDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Embed Secret Generated
            </DialogTitle>
            <DialogDescription>
              Copy this secret now. For security reasons, it will not be displayed again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <code className="text-sm break-all">{generatedSecret}</code>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Store this secret securely in your server environment variables.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (generatedSecret) {
                  copyToClipboard(generatedSecret, 'Secret');
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Secret
            </Button>
            <Button variant="outline" onClick={() => setShowSecretDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Embed Secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately invalidate all existing customer tokens.
              Users with active sessions will be disconnected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeSecretMutation.mutate(selectedOrgId)}
              disabled={revokeSecretMutation.isPending}
            >
              {revokeSecretMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Revoke Secret
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
