import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, RefreshCw, Trash2, CheckCircle, XCircle, Clock, Shield, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface CustomDomainData {
  id: string;
  domain: string;
  subdomain?: string;
  domainType: string;
  sslStatus: string;
  sslExpiresAt?: string;
  dnsVerified: boolean;
  dnsVerifiedAt?: string;
  dnsRecords?: { type: string; name: string; value: string }[];
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
}

export default function CustomDomainsPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<CustomDomainData | null>(null);
  const [formData, setFormData] = useState({
    domain: '',
    subdomain: '',
    domainType: 'chat',
  });

  const { data: domains, isLoading, refetch } = useQuery<CustomDomainData[]>({
    queryKey: ['/api/admin/custom-domains'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('/api/admin/custom-domains', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-domains'] });
      toast({ title: "Domain added successfully" });
      setIsCreateOpen(false);
      setFormData({ domain: '', subdomain: '', domainType: 'chat' });
    },
    onError: () => {
      toast({ title: "Failed to add domain", variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/custom-domains/${id}/verify`, { method: 'POST' });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-domains'] });
      toast({ title: "DNS verification started" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/custom-domains/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-domains'] });
      toast({ title: "Domain removed" });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/custom-domains/${id}/primary`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-domains'] });
      toast({ title: "Primary domain updated" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const getSSLStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500">SSL Active</Badge>;
      case 'pending': return <Badge variant="secondary">SSL Pending</Badge>;
      case 'expired': return <Badge variant="destructive">SSL Expired</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getDNSStatusIcon = (verified: boolean) => {
    return verified 
      ? <CheckCircle className="h-4 w-4 text-emerald-500" />
      : <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const defaultDnsRecords = [
    { type: 'CNAME', name: 'support', value: 'proxy.novaai.app' },
    { type: 'TXT', name: '_verification', value: 'nova-verify=abc123xyz' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Domains</h1>
          <p className="text-muted-foreground">Configure custom domains for your chat widgets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Domain</DialogTitle>
                <DialogDescription>Configure a custom domain for white-label support</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Domain</Label>
                  <Input
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="support.yourcompany.com"
                  />
                </div>
                <div>
                  <Label>Subdomain (Optional)</Label>
                  <Input
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                    placeholder="support"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to use the root domain
                  </p>
                </div>
                <div>
                  <Label>Domain Type</Label>
                  <Select value={formData.domainType} onValueChange={(value) => setFormData({ ...formData, domainType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat">Chat Widget</SelectItem>
                      <SelectItem value="portal">Customer Portal</SelectItem>
                      <SelectItem value="kb">Knowledge Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.domain}
                >
                  Add Domain
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DNS Configuration</CardTitle>
          <CardDescription>Add these DNS records to your domain registrar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {defaultDnsRecords.map((record, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="font-mono">{record.type}</Badge>
                  <span className="text-sm font-mono">{record.name}</span>
                  <span className="text-sm text-muted-foreground">→</span>
                  <span className="text-sm font-mono">{record.value}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(record.value)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !domains || domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No custom domains</h3>
            <p className="text-muted-foreground mb-4">Add a custom domain to white-label your support experience</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <Card key={domain.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${domain.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Globe className={`h-5 w-5 ${domain.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{domain.domain}</h3>
                        {domain.isPrimary && <Badge>Primary</Badge>}
                        {getSSLStatusBadge(domain.sslStatus)}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-sm">
                          {getDNSStatusIcon(domain.dnsVerified)}
                          <span className={domain.dnsVerified ? 'text-emerald-600' : 'text-yellow-600'}>
                            {domain.dnsVerified ? 'DNS Verified' : 'DNS Pending'}
                          </span>
                        </div>
                        <Badge variant="outline">{domain.domainType}</Badge>
                      </div>
                      {domain.sslExpiresAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <Shield className="h-3 w-3 inline mr-1" />
                          SSL expires {format(new Date(domain.sslExpiresAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!domain.dnsVerified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyMutation.mutate(domain.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Verify DNS
                      </Button>
                    )}
                    {domain.isActive && !domain.isPrimary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrimaryMutation.mutate(domain.id)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(domain.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
