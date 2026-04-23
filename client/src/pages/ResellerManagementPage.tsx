import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Users, Plus, Search, ArrowUpRight, Settings2,
  Globe, Mail, Trash2, UserPlus, UserMinus, AlertTriangle,
  ChevronRight, ShieldCheck, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface Reseller {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  status: string;
  resellerTier: number;
  resellerSupportEmail?: string;
  parentOrganizationId?: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  resellerAssignedAt?: string;
}

interface ResellerStats {
  totalCustomers: number;
  totalConversations: number;
  escalated: number;
}

function CreateResellerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", slug: "", resellerSupportEmail: "", resellerTier: 1 });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("/api/resellers", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      toast({ title: "Reseller created", description: "New reseller organization has been set up." });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Reseller</DialogTitle>
          <DialogDescription>Set up a new first-line support partner organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Organization Name</Label>
            <Input
              placeholder="Acme Reseller Ltd."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: handleSlug(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input
              placeholder="acme-reseller"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Support Email</Label>
            <Input
              type="email"
              placeholder="support@acme.com"
              value={form.resellerSupportEmail}
              onChange={e => setForm(f => ({ ...f, resellerSupportEmail: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Reseller Tier</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={form.resellerTier}
              onChange={e => setForm(f => ({ ...f, resellerTier: Number(e.target.value) }))}
            >
              <option value={1}>Tier 1 — Primary Reseller</option>
              <option value={2}>Tier 2 — Sub-Reseller</option>
              <option value={3}>Tier 3 — Regional Partner</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name}>
            {createMutation.isPending ? "Creating..." : "Create Reseller"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignCustomerDialog({
  resellerId,
  open,
  onClose,
}: { resellerId: string; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: allCustomers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const filtered = (allCustomers || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const assignMutation = useMutation({
    mutationFn: (customerId: string) =>
      apiRequest(`/api/resellers/${resellerId}/customers`, "POST", { customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers", resellerId, "customers"] });
      toast({ title: "Customer assigned", description: "Customer has been assigned to this reseller." });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Customer</DialogTitle>
          <DialogDescription>Select a customer to assign to this reseller for first-line support.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading customers...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No customers found</p>
            ) : filtered.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                onClick={() => assignMutation.mutate(c.id)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{c.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                </div>
                {assignMutation.isPending && <span className="text-xs text-muted-foreground">Assigning...</span>}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResellerCard({
  reseller,
  onSelect,
}: { reseller: Reseller; onSelect: () => void }) {
  const { data: stats } = useQuery<ResellerStats>({
    queryKey: ["/api/resellers", reseller.id, "stats"],
  });

  return (
    <Card className="cursor-pointer" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{reseller.name}</CardTitle>
              <CardDescription className="text-xs">/{reseller.slug}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={reseller.status === "active" ? "default" : "secondary"}>
              {reseller.status}
            </Badge>
            <Badge variant="outline" className="text-xs">Tier {reseller.resellerTier}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold">{stats?.totalCustomers ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Customers</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats?.totalConversations ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Conversations</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-amber-600">{stats?.escalated ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Escalated</p>
          </div>
        </div>
        {reseller.resellerSupportEmail && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            {reseller.resellerSupportEmail}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResellerDetail({ reseller, onBack }: { reseller: Reseller; onBack: () => void }) {
  const { toast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/resellers", reseller.id, "customers"],
  });

  const { data: stats } = useQuery<ResellerStats>({
    queryKey: ["/api/resellers", reseller.id, "stats"],
  });

  const removeMutation = useMutation({
    mutationFn: (customerId: string) =>
      apiRequest(`/api/resellers/${reseller.id}/customers/${customerId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers", reseller.id, "customers"] });
      toast({ title: "Customer removed", description: "Customer unassigned from reseller." });
    },
  });

  const filtered = (customers || []).filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{reseller.name}</h2>
          <Badge variant={reseller.status === "active" ? "default" : "secondary"}>{reseller.status}</Badge>
          <Badge variant="outline">Tier {reseller.resellerTier}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Assigned Customers", value: stats?.totalCustomers ?? 0, icon: Users, color: "text-blue-600" },
          { label: "Total Conversations", value: stats?.totalConversations ?? 0, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Escalated", value: stats?.escalated ?? 0, icon: AlertTriangle, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`${color} bg-current/10 rounded-md p-2`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search assigned customers..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Customer
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-8">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No customers assigned to this reseller yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setAssignOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign First Customer
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-md border bg-card">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{c.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                  {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                </div>
                {c.resellerAssignedAt && (
                  <span className="text-xs text-muted-foreground">
                    Since {format(new Date(c.resellerAssignedAt), "MMM d, yyyy")}
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeMutation.mutate(c.id)}
                  disabled={removeMutation.isPending}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AssignCustomerDialog
        resellerId={reseller.id}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
      />
    </div>
  );
}

export default function ResellerManagementPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [search, setSearch] = useState("");

  const { data: resellers, isLoading } = useQuery<Reseller[]>({
    queryKey: ["/api/resellers"],
  });

  const filtered = (resellers || []).filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedReseller) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <ResellerDetail reseller={selectedReseller} onBack={() => setSelectedReseller(null)} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Reseller Management</h1>
          <p className="text-muted-foreground mt-1">
            Resellers provide first-line support to their assigned customers. If unresolved, they escalate to your team.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Reseller
        </Button>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="flex items-start gap-3 pt-4">
          <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">How reseller support works</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              When a customer assigned to a reseller starts a conversation, it routes to the reseller's agents first.
              If the reseller cannot resolve the issue, they escalate it to your team with a note. Escalated conversations
              appear in your inbox with an escalation badge.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search resellers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-40 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">No resellers yet</p>
          <p className="text-xs mt-1">Add your first reseller partner to start delegating first-line support.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Reseller
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => (
            <ResellerCard key={r.id} reseller={r} onSelect={() => setSelectedReseller(r)} />
          ))}
        </div>
      )}

      <CreateResellerDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
