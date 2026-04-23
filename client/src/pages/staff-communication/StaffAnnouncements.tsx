import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Megaphone, Plus, Globe, Users, UserCheck, Building2,
  Send, CheckCircle2, Loader2, Pin, Lock, Unlock, ChevronDown
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import type { CommPost } from "@shared/schema";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  isPlatformAdmin?: boolean;
  organizationId?: string;
}

const AUDIENCE_OPTIONS = [
  { value: "org_staff", label: "Workspace Staff Only", icon: UserCheck, description: "Only agents and admins in your workspace" },
  { value: "org_customers", label: "Customers Only", icon: Users, description: "All customers in your organization" },
  { value: "org_all", label: "Everyone in Workspace", icon: Building2, description: "Both staff and customers" },
];

const PLATFORM_AUDIENCE = { value: "platform", label: "All Organizations (Platform-wide)", icon: Globe, description: "Broadcast to every org's staff and customers" };

const TAGS = [
  { name: "Urgent", color: "destructive" as const },
  { name: "Important", color: "warning" as const },
  { name: "FYI", color: "secondary" as const },
  { name: "Update", color: "default" as const },
  { name: "Promo", color: "secondary" as const },
];

function AudienceBadge({ audience }: { audience: string }) {
  const map: Record<string, { label: string; icon: any; className: string }> = {
    platform: { label: "Platform-wide", icon: Globe, className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    org_staff: { label: "Staff Only", icon: UserCheck, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    org_customers: { label: "Customers", icon: Users, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    org_all: { label: "Everyone", icon: Building2, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  };
  const info = map[audience] || map.org_staff;
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.className}`}>
      <Icon className="h-3 w-3" />
      {info.label}
    </span>
  );
}

export default function StaffAnnouncements() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("org_staff");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [filterAudience, setFilterAudience] = useState("all");

  const { data: currentUser } = useQuery<CurrentUser>({ queryKey: ["/api/auth/me"] });
  const isPlatformAdmin = currentUser?.isPlatformAdmin;

  const { data: posts = [], isLoading } = useQuery<CommPost[]>({
    queryKey: ["/api/comm/posts", { type: "announcement" }],
    queryFn: async () => {
      const params = new URLSearchParams({ type: "announcement" });
      return apiRequest(`/api/comm/posts?${params}`, "GET");
    },
  });

  const { data: readStats = {} } = useQuery<Record<string, { read: number; total: number }>>({
    queryKey: ["/api/comm/announcements/stats"],
    queryFn: () => apiRequest("/api/comm/announcements/stats", "GET"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/comm/posts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comm/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comm/announcements/stats"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Announcement published" });
    },
    onError: () => toast({ title: "Failed to publish", variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      apiRequest(`/api/comm/posts/${id}`, "PATCH", { isPinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/comm/posts"] }),
  });

  const resetForm = () => {
    setTitle(""); setContent(""); setAudience("org_staff");
    setSelectedTags([]); setIsPinned(false);
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    createMutation.mutate({ title, content, type: "announcement", tags: selectedTags, isPinned, audience });
  };

  const filteredPosts = filterAudience === "all" ? posts : posts.filter(p => p.audience === filterAudience);

  const allAudienceOptions = isPlatformAdmin
    ? [...AUDIENCE_OPTIONS, PLATFORM_AUDIENCE]
    : AUDIENCE_OPTIONS;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Announcements
          </h1>
          <p className="text-muted-foreground mt-1">
            Send targeted announcements to staff, customers, or platform-wide.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input placeholder="Announcement title" value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Audience *</label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allAudienceOptions.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <div className="font-medium">{opt.label}</div>
                              <div className="text-xs text-muted-foreground">{opt.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {audience === "platform" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    This will broadcast to ALL organizations on the platform.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Content *</label>
                <Textarea
                  placeholder="Write your announcement..."
                  className="min-h-[140px]"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(tag => (
                    <Badge
                      key={tag.name}
                      variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedTags(prev =>
                        prev.includes(tag.name) ? prev.filter(t => t !== tag.name) : [...prev, tag.name]
                      )}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="pinned" checked={isPinned} onCheckedChange={c => setIsPinned(!!c)} />
                <label htmlFor="pinned" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                  <Pin className="h-3 w-3" /> Pin to top
                </label>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleSubmit}
                disabled={createMutation.isPending || !title.trim() || !content.trim()}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publish Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: posts.length, color: "text-foreground" },
          { label: "Staff Only", value: posts.filter(p => p.audience === "org_staff").length, color: "text-blue-600" },
          { label: "Customers", value: posts.filter(p => p.audience === "org_customers" || p.audience === "org_all").length, color: "text-green-600" },
          { label: "Platform-wide", value: posts.filter(p => p.audience === "platform").length, color: "text-purple-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "All" },
          { value: "org_staff", label: "Staff" },
          { value: "org_customers", label: "Customers" },
          { value: "org_all", label: "Everyone" },
          ...(isPlatformAdmin ? [{ value: "platform", label: "Platform-wide" }] : []),
        ].map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={filterAudience === f.value ? "default" : "outline"}
            onClick={() => setFilterAudience(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No announcements yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => {
            const stats = readStats[post.id];
            return (
              <Card key={post.id} className={post.isPinned ? "border-primary/30" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.isPinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                      <CardTitle className="text-base">{post.title}</CardTitle>
                      <AudienceBadge audience={post.audience || "org_staff"} />
                    </div>
                    <div className="flex items-center gap-2">
                      {post.tags && post.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => pinMutation.mutate({ id: post.id, isPinned: !post.isPinned })}
                      >
                        <Pin className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {format(new Date(post.createdAt!), "MMM d, yyyy 'at' h:mm a")}
                    {post.authorType === "superadmin" && (
                      <span className="ml-2 text-purple-500 font-medium">• Platform Admin</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                  {stats && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span>{stats.read} / {stats.total} read</span>
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: stats.total > 0 ? `${(stats.read / stats.total) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
