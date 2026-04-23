import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plug, Plus, Trash2, Pencil, Loader2, RefreshCw, ShieldCheck, Copy, Check,
} from "lucide-react";

interface ExternalSystemDto {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  apiEndpoint: string;
  clientId: string;
  credentialKeys: string[];
  embedSecretFingerprint: string;
  metadata: Record<string, any>;
  isActive: boolean;
  lastHealthCheck: string | null;
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface IntegrationFormState {
  slug: string;
  name: string;
  apiEndpoint: string;
  clientId: string;
  credentialsJson: string; // edited as raw JSON for flexibility
  embedSecret: string;
  isActive: boolean;
}

const emptyForm: IntegrationFormState = {
  slug: "",
  name: "",
  apiEndpoint: "",
  clientId: "",
  credentialsJson: '{\n  "username": "",\n  "password": ""\n}',
  embedSecret: "",
  isActive: true,
};

function generateSecret(): string {
  // 48 base64url chars ≈ 288 bits
  const bytes = new Uint8Array(36);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function PartnerIntegrationsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalSystemDto | null>(null);
  const [form, setForm] = useState<IntegrationFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ExternalSystemDto | null>(null);
  const [copiedField, setCopiedField] = useState<string>("");

  const { data: integrations = [], isLoading } = useQuery<ExternalSystemDto[]>({
    queryKey: ["/api/external-systems"],
  });

  const createMutation = useMutation({
    mutationFn: async (body: any) =>
      apiRequest("POST", "/api/external-systems", body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-systems"] });
      toast({ title: "Integration activated", description: "Partner can now push stores and mint embed tokens." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Failed to activate", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) =>
      apiRequest("PATCH", `/api/external-systems/${id}`, body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-systems"] });
      toast({ title: "Integration updated" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/external-systems/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-systems"] });
      toast({ title: "Integration removed" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, embedSecret: generateSecret() });
    setDialogOpen(true);
  }

  function openEdit(row: ExternalSystemDto) {
    setEditing(row);
    setForm({
      slug: row.slug,
      name: row.name,
      apiEndpoint: row.apiEndpoint,
      clientId: row.clientId,
      // existing secrets aren't returned — leave blank to indicate "no change"
      credentialsJson: JSON.stringify(
        Object.fromEntries(row.credentialKeys.map(k => [k, ""])),
        null, 2,
      ),
      embedSecret: "",
      isActive: row.isActive,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function onSubmit() {
    // Validate credentials JSON
    let credentials: Record<string, string> = {};
    try {
      credentials = JSON.parse(form.credentialsJson);
      if (typeof credentials !== "object" || Array.isArray(credentials)) throw new Error();
    } catch {
      toast({ title: "Invalid credentials JSON", variant: "destructive" });
      return;
    }

    if (editing) {
      // For edit: only send fields that changed + skip secrets if blank
      const patch: any = {
        name: form.name,
        apiEndpoint: form.apiEndpoint,
        clientId: form.clientId,
        isActive: form.isActive,
      };
      // Only include credentials if at least one value was filled in
      const filled = Object.values(credentials).some(v => v && v.length > 0);
      if (filled) patch.credentials = credentials;
      if (form.embedSecret) patch.embedSecret = form.embedSecret;
      updateMutation.mutate({ id: editing.id, body: patch });
    } else {
      if (!form.embedSecret || form.embedSecret.length < 32) {
        toast({ title: "Embed secret must be at least 32 chars", variant: "destructive" });
        return;
      }
      createMutation.mutate({
        slug: form.slug,
        name: form.name,
        apiEndpoint: form.apiEndpoint,
        clientId: form.clientId,
        credentials,
        embedSecret: form.embedSecret,
        isActive: form.isActive,
      });
    }
  }

  function copyToClipboard(field: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 1500);
  }

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plug className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Partner Integrations</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Activate external systems (RapidRMS, Square, Shopify, ...) as sources of store identity.
            Once active, a partner can push stores and mint embed tokens so their customers land in chat
            with store + user context pre-populated.
          </p>
        </div>
        <Button onClick={openCreate} disabled={isBusy}>
          <Plus className="h-4 w-4 mr-2" /> Activate integration
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading...
            </div>
          ) : integrations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No partner integrations yet. Click "Activate integration" to add your first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Slug</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Embed secret</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.slug}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.apiEndpoint}</TableCell>
                    <TableCell className="font-mono text-xs">{row.clientId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-green-600" />
                        <code className="text-xs">{row.embedSecretFingerprint || "—"}</code>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        fields: {row.credentialKeys.join(", ") || "(none)"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "secondary"}>
                        {row.isActive ? "Active" : "Disabled"}
                      </Badge>
                      {row.lastError && (
                        <div className="text-xs text-destructive mt-1 max-w-48 truncate" title={row.lastError}>
                          {row.lastError}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(row)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit integration" : "Activate integration"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update endpoint or credentials. Leave a field blank to keep its current value."
                : "Provide the partner's API endpoint, client ID, and a shared embed secret."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="rapidrms"
                  disabled={!!editing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lowercase identifier used in API calls. Immutable.
                </p>
              </div>
              <div>
                <Label>Display name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="RapidRMS Production"
                />
              </div>
            </div>

            <div>
              <Label>API endpoint</Label>
              <Input
                value={form.apiEndpoint}
                onChange={(e) => setForm({ ...form, apiEndpoint: e.target.value })}
                placeholder="https://api.rapidrms.com"
              />
            </div>

            <div>
              <Label>Client ID</Label>
              <Input
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                placeholder="your-reseller-id-at-the-partner"
              />
            </div>

            <div>
              <Label>Credentials (JSON)</Label>
              <Textarea
                value={form.credentialsJson}
                onChange={(e) => setForm({ ...form, credentialsJson: e.target.value })}
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Key/value pairs (e.g. username + password, or apiKey). Encrypted at rest.
              </p>
            </div>

            <div>
              <Label>Embed secret</Label>
              <div className="flex gap-2">
                <Input
                  value={form.embedSecret}
                  onChange={(e) => setForm({ ...form, embedSecret: e.target.value })}
                  placeholder={editing ? "(unchanged — leave blank to keep current)" : "min 32 chars"}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setForm({ ...form, embedSecret: generateSecret() })}
                  title="Generate new secret"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {form.embedSecret && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard("secret", form.embedSecret)}
                    title="Copy to clipboard"
                  >
                    {copiedField === "secret" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Shared HMAC secret. The partner uses it to mint embed tokens; we verify signatures with it.
                Changing this breaks existing tokens.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>Active (accept partner requests)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isBusy}>Cancel</Button>
            <Button onClick={onSubmit} disabled={isBusy}>
              {isBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save changes" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove integration?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will stop accepting store pushes and embed token mints.
              Existing conversations stay intact. Stores already imported from this integration keep their records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
