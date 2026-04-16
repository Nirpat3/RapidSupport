import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import {
  Globe, Lock, Users, UserCheck, Building2,
  MessageSquare, Heart, Send, Loader2, Plus
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

interface CommPost {
  id: string;
  content: string;
  visibility: string;
  audience: string;
  authorType: string;
  authorId: string;
  createdAt: string;
  commentCount: number;
  reactionCount?: number;
}

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorType: string;
  createdAt: string;
}

const AUDIENCE_OPTIONS = [
  { value: "org_staff", label: "Staff Only", icon: UserCheck },
  { value: "org_customers", label: "Customers Only", icon: Users },
  { value: "org_all", label: "Everyone", icon: Building2 },
];

function AudienceLabel({ audience }: { audience: string }) {
  const map: Record<string, { label: string; icon: any; cls: string }> = {
    org_staff: { label: "Staff", icon: UserCheck, cls: "text-blue-600" },
    org_customers: { label: "Customers", icon: Users, cls: "text-green-600" },
    org_all: { label: "Everyone", icon: Building2, cls: "text-amber-600" },
    platform: { label: "Platform", icon: Globe, cls: "text-purple-600" },
  };
  const m = map[audience] || map.org_staff;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${m.cls}`}>
      <Icon className="h-3 w-3" />{m.label}
    </span>
  );
}

function PostComments({ postId }: { postId: string }) {
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["/api/comm/posts", postId, "comments"],
    queryFn: () => apiRequest(`/api/comm/posts/${postId}/comments`, "GET"),
  });
  if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;
  if (!comments.length) return <p className="text-xs text-muted-foreground">No comments yet.</p>;
  return (
    <div className="space-y-2">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="text-xs">{(c.authorName || "U")[0]}</AvatarFallback>
          </Avatar>
          <div className="bg-muted rounded-md px-3 py-2 text-xs flex-1">
            <span className="font-medium">{c.authorName || "Staff"}</span>
            <span className="text-muted-foreground ml-2">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
            <p className="mt-1">{c.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StaffCommunity() {
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [postAudience, setPostAudience] = useState("org_staff");
  const [postVisibility, setPostVisibility] = useState<"public" | "private">("public");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [filterAudience, setFilterAudience] = useState("all");

  const { data: posts = [], isLoading } = useQuery<CommPost[]>({
    queryKey: ["/api/comm/posts", "community"],
    queryFn: () => apiRequest("/api/comm/posts?type=community", "GET"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/comm/posts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comm/posts"] });
      setNewPost("");
      toast({ title: postVisibility === "public" ? "Post shared" : "Post saved privately" });
    },
    onError: () => toast({ title: "Failed to create post", variant: "destructive" }),
  });

  const reactMutation = useMutation({
    mutationFn: ({ postId, emoji }: { postId: string; emoji: string }) =>
      apiRequest(`/api/comm/posts/${postId}/react`, "POST", { emoji }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/comm/posts"] }),
  });

  const commentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiRequest(`/api/comm/posts/${postId}/comments`, "POST", { content }),
    onSuccess: (_, { postId }) => {
      setNewComment(prev => ({ ...prev, [postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/comm/posts"] });
    },
    onError: () => toast({ title: "Failed to comment", variant: "destructive" }),
  });

  const handlePost = () => {
    if (!newPost.trim()) return;
    createMutation.mutate({
      content: newPost,
      type: "community",
      audience: postAudience,
      visibility: postVisibility,
    });
  };

  const filteredPosts = filterAudience === "all"
    ? posts
    : posts.filter(p => p.audience === filterAudience);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Community Feed
        </h1>
        <p className="text-muted-foreground mt-1">
          Share updates with staff, customers, or everyone. Posts can be public or private.
        </p>
      </div>

      {/* Composer */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Textarea
            placeholder="Share something with your team, customers, or keep it private..."
            className="min-h-[100px] resize-none text-sm"
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={postAudience} onValueChange={setPostAudience}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={postVisibility} onValueChange={v => setPostVisibility(v as any)}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-green-500" /> Public
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-amber-500" /> Private
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="gap-2 ml-auto"
              onClick={handlePost}
              disabled={!newPost.trim() || createMutation.isPending}
            >
              {createMutation.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Send className="h-3 w-3" />}
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[{ key: "all", label: "All" }, ...AUDIENCE_OPTIONS.map(o => ({ key: o.value, label: o.label }))].map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={filterAudience === f.key ? "default" : "outline"}
            onClick={() => setFilterAudience(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No posts yet. Start the conversation!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-sm">
                      {post.authorType === "superadmin" ? "SA" : post.authorType === "staff" ? "ST" : "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {post.authorType === "superadmin" ? "Platform Admin"
                          : post.authorType === "staff" ? "Staff Member"
                          : "Customer"}
                      </span>
                      <AudienceLabel audience={post.audience || "org_staff"} />
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {post.visibility === "private"
                          ? <><Lock className="h-3 w-3 text-amber-500" /> Private</>
                          : <><Globe className="h-3 w-3 text-green-500" /> Public</>}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
              </CardContent>
              <CardFooter className="pt-0 flex gap-1 flex-wrap">
                <Button
                  size="sm" variant="ghost" className="h-7 text-xs gap-1"
                  onClick={() => reactMutation.mutate({ postId: post.id, emoji: "❤" })}
                >
                  <Heart className="h-3 w-3" />{post.reactionCount || 0}
                </Button>
                <Collapsible
                  open={openComments[post.id]}
                  onOpenChange={open => setOpenComments(prev => ({ ...prev, [post.id]: open }))}
                >
                  <CollapsibleTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                      <MessageSquare className="h-3 w-3" />{post.commentCount || 0}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 w-64 sm:w-full">
                    <PostComments postId={post.id} />
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Comment..."
                        className="min-h-[52px] text-sm"
                        value={newComment[post.id] || ""}
                        onChange={e => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                      />
                      <Button
                        size="sm" className="shrink-0 self-end"
                        disabled={!newComment[post.id]?.trim() || commentMutation.isPending}
                        onClick={() => commentMutation.mutate({ postId: post.id, content: newComment[post.id] })}
                      >
                        Post
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
