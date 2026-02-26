import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Megaphone, Plus, Users, Send, CheckCircle2, MoreHorizontal, Loader2 } from "lucide-react";
import type { CommPost, CustomerOrganization } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function StaffAnnouncements() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [targetOrgIds, setTargetOrgIds] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);

  const tags = [
    { name: "Urgent", variant: "destructive" as const },
    { name: "Important", variant: "warning" as const },
    { name: "FYI", variant: "info" as const },
    { name: "Update", variant: "success" as const },
    { name: "Promo", variant: "secondary" as const },
  ];

  const getTagVariant = (tagName: string) => {
    const tag = tags.find(t => t.name === tagName);
    if (!tag) return "outline" as const;
    if (tag.variant === "warning") return "warning" as any;
    if (tag.variant === "info") return "info" as any;
    if (tag.variant === "success") return "success" as any;
    return tag.variant;
  };

  const { data: posts = [], isLoading: postsLoading } = useQuery<CommPost[]>({
    queryKey: ["/api/comm/posts", { type: "announcement" }],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ type: "announcement" });
      return apiRequest(`/api/comm/posts?${searchParams.toString()}`, "GET");
    }
  });

  const { data: readAnalytics } = useQuery<Record<string, { read: number, total: number }>>({
    queryKey: ["/api/comm/announcements/stats"],
    queryFn: async () => apiRequest("/api/comm/announcements/stats", "GET")
  });

  const { data: customerOrgs = [] } = useQuery<CustomerOrganization[]>({
    queryKey: ["/api/customer-organizations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/comm/posts", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comm/posts"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Announcement published" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedTags([]);
    setTargetOrgIds([]);
    setIsPinned(false);
  };

  const handleSubmit = () => {
    if (!title || !content) return;
    createMutation.mutate({
      title,
      content,
      type: "announcement",
      tags: selectedTags,
      isPinned,
      targetOrgIds: targetOrgIds.length > 0 ? targetOrgIds : null,
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">
            Manage formal notices and formal communication to retailers.
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
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input 
                  placeholder="Announcement title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea 
                  placeholder="Write your announcement..." 
                  className="min-h-[150px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge
                      key={tag.name}
                      variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.name)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Targeting</label>
                <ScrollArea className="h-[120px] border rounded-md p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="all-retailers" 
                        checked={targetOrgIds.length === 0}
                        onCheckedChange={(checked) => checked && setTargetOrgIds([])}
                      />
                      <label htmlFor="all-retailers" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        All Retailers
                      </label>
                    </div>
                    {customerOrgs.map((org) => (
                      <div key={org.id} className="flex items-center space-x-2 pl-4">
                        <Checkbox 
                          id={`org-${org.id}`} 
                          checked={targetOrgIds.includes(org.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setTargetOrgIds(prev => [...prev, org.id]);
                            else setTargetOrgIds(prev => prev.filter(id => id !== org.id));
                          }}
                        />
                        <label htmlFor={`org-${org.id}`} className="text-sm font-medium leading-none">
                          {org.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="pinned" 
                  checked={isPinned}
                  onCheckedChange={(checked) => setIsPinned(!!checked)}
                />
                <label htmlFor="pinned" className="text-sm font-medium leading-none">
                  Pin to top
                </label>
              </div>
              <Button 
                className="w-full" 
                onClick={handleSubmit}
                disabled={createMutation.isPending || !title || !content}
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {postsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No announcements yet</h3>
            <p className="text-muted-foreground">Create your first formal notice to retailers.</p>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    {post.isPinned && <Badge variant="secondary">Pinned</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags?.map(tag => (
                      <Badge key={tag} variant={getTagVariant(tag)} className="text-[10px] uppercase">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {post.createdAt ? format(new Date(post.createdAt), 'MMM d, yyyy') : ''}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Targets: {post.organizationId ? 'Specific' : 'Global'}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Read by: {readAnalytics?.[post.id] ? `${readAnalytics[post.id].read}/${readAnalytics[post.id].total}` : '--'}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
