import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Store, Plus, Trash2, Pencil, Loader2, Link2 } from "lucide-react";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  supportId: string | null;
  organizationId: string;
  workspaceId: string | null;
  externalSystemId: string | null;
  externalId: string | null;
  externalMetadata: Record<string, any>;
  isActive: boolean;
  createdAt: string | null;
}

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
}

interface FormState {
  name: string;
  slug: string;
  supportId: string;
  workspaceId: string | null;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: "",
  slug: "",
  supportId: "",
  workspaceId: null,
  isActive: true,
};

export default function StoresAdminPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<StoreRow | null>(null);

  const { data: stores = [], isLoading } = useQuery<StoreRow[]>({
    queryKey: ["/api/stores"],
  });

  const { data: workspaces = [] } = useQuery<WorkspaceRow[]>({
    queryKey: ["/api/workspaces"],
  });

  const createMutation = useMutation({
    mutationFn: async (body: any) =>
      apiRequest("POST", "/api/stores", body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({ title: "Store added" });
      closeDialog();
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) =>
      apiRequest("PATCH", `/api/stores/${id}`, body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({ title: "Store updated" });
      closeDialog();
    },
    onError: (err: any) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/stores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({ title: "Store removed" });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err?.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(row: StoreRow) {
    setEditing(row);
    setForm({
      name: row.name,
      slug: row.slug,
      supportId: row.supportId || "",
      workspaceId: row.workspaceId,
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
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload: any = {
      name: form.name,
      workspaceId: form.workspaceId || null,
      isActive: form.isActive,
    };
    if (form.supportId) payload.supportId = form.supportId;
    if (!editing && form.slug) payload.slug = form.slug;

    if (editing) {
      updateMutation.mutate({ id: editing.id, body: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isBusy = createMutation.isPending || updateMutation.isPending;
  const workspaceLabel = (id: string | null) =>
    id ? (workspaces.find(w => w.id === id)?.name || id.slice(0, 8)) : "— any —";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Stores</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Stores are businesses being supported. Add manually below, or let a partner integration push them.
            Pinning a store to a workspace routes its conversations to that workspace's agents.
          </p>
        </div>
        <Button onClick={openCreate} disabled={isBusy}>
          <Plus className="h-4 w-4 mr-2" /> Add store
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading...
            </div>
          ) : stores.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No stores yet. Click "Add store" to create one manually.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Slug</TableHead>
                  <TableHead>Support ID</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.slug}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.supportId || "—"}</TableCell>
                    <TableCell className="text-sm">{workspaceLabel(row.workspaceId)}</TableCell>
                    <TableCell>
                      {row.externalSystemId ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Link2 className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono">{row.externalId}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">manual</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "secondary"}>
                        {row.isActive ? "Active" : "Disabled"}
                      </Badge>
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

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit store" : "Add store"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update store details. Partner-imported stores should have their name synced by the partner, not edited here."
                : "Create a store manually. For partner-imported stores, use the partner's POST /api/partner/stores endpoint instead."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>

            {!editing && (
              <div>
                <Label>Slug (optional)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="Auto-generated from name if blank"
                />
              </div>
            )}

            <div>
              <Label>Support ID (optional)</Label>
              <Input
                value={form.supportId}
                onChange={(e) => setForm({ ...form, supportId: e.target.value })}
                placeholder="ACME-2026-001"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A human-friendly identifier customers can share to verify their store.
              </p>
            </div>

            <div>
              <Label>Pin to workspace (optional)</Label>
              <Select
                value={form.workspaceId || "__none__"}
                onValueChange={(v) => setForm({ ...form, workspaceId: v === "__none__" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any agent in the reseller org" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— any agent in the reseller org —</SelectItem>
                  {workspaces.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                When set, new conversations from this store route only to agents in this workspace.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>Active (accept conversations)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isBusy}>Cancel</Button>
            <Button onClick={onSubmit} disabled={isBusy}>
              {isBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove store?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> and all associated conversations will be affected.
              This cannot be undone.
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
