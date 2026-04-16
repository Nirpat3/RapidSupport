import { useQuery, useMutation } from "@tanstack/react-query";
import { CommLayout } from "./CommLayout";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Megaphone, CheckCircle2, MessageSquare, Globe, Building2, Pin, Loader2 } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

interface CommPost {
  id: string;
  title?: string;
  content: string;
  tags?: string[];
  isPinned: boolean;
  audience: string;
  authorType: string;
  createdAt: string;
  hasRead: boolean;
  commentCount: number;
}

interface CommComment {
  id: string;
  content: string;
  authorId: string;
  authorType: string;
  createdAt: string;
  authorName: string;
}

function TagBadge({ tag }: { tag: string }) {
  const t = tag.toLowerCase();
  if (t === "urgent") return <Badge variant="destructive" className="text-xs">{tag}</Badge>;
  if (t === "important") return <Badge className="text-xs bg-amber-500 text-white border-amber-600">{tag}</Badge>;
  if (t === "fyi") return <Badge className="text-xs bg-blue-500 text-white border-blue-600">{tag}</Badge>;
  if (t === "update") return <Badge className="text-xs bg-green-500 text-white border-green-600">{tag}</Badge>;
  return <Badge variant="secondary" className="text-xs">{tag}</Badge>;
}

function PostComments({ postId }: { postId: string }) {
  const { data: comments = [], isLoading } = useQuery<CommComment[]>({
    queryKey: ["/api/customer-portal/comm/posts", postId, "comments"],
    queryFn: () => apiRequest(`/api/customer-portal/comm/posts/${postId}/comments`, "GET"),
  });
  if (isLoading) return <div className="text-xs text-muted-foreground py-2">Loading...</div>;
  if (!comments.length) return <div className="text-xs text-muted-foreground py-2">No comments yet.</div>;
  return (
    <div className="space-y-2">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="text-xs">{(c.authorName || "U")[0]}</AvatarFallback>
          </Avatar>
          <div className="bg-muted rounded-md px-3 py-2 text-xs flex-1">
            <span className="font-medium">{c.authorName || "User"}</span>
            <span className="text-muted-foreground ml-2">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
            <p className="mt-1">{c.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommAnnouncements() {
  const { toast } = useToast();
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});

  const { data: posts = [], isLoading } = useQuery<CommPost[]>({
    queryKey: ["/api/customer-portal/comm/posts", "announcement"],
    queryFn: () => apiRequest("/api/customer-portal/comm/posts?type=announcement", "GET"),
  });

  const markReadMutation = useMutation({
    mutationFn: (postId: string) => apiRequest(`/api/customer-portal/comm/posts/${postId}/read`, "POST"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts"] }),
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiRequest(`/api/customer-portal/comm/posts/${postId}/comments`, "POST", { content }),
    onSuccess: (_, { postId }) => {
      setNewComment(prev => ({ ...prev, [postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts"] });
      toast({ title: "Comment added" });
    },
  });

  const platformPosts = posts.filter(p => p.audience === "platform" || p.authorType === "superadmin");
  const orgPosts = posts.filter(p => p.audience !== "platform" && p.authorType !== "superadmin");

  const renderPost = (post: CommPost) => (
    <Card key={post.id} className={post.isPinned ? "border-primary/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${post.authorType === "superadmin" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-primary/10"}`}>
            {post.authorType === "superadmin"
              ? <Globe className="h-4 w-4 text-purple-500" />
              : <Megaphone className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {post.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
              {post.title && <span className="font-semibold text-sm">{post.title}</span>}
              {(post.authorType === "superadmin" || post.audience === "platform") && (
                <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200">
                  Platform Notice
                </Badge>
              )}
              {post.tags?.map(tag => <TagBadge key={tag} tag={tag} />)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {post.authorType === "superadmin" ? "Platform" : "Support Team"}
              {" · "}{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </CardContent>
      <CardFooter className="flex items-center gap-2 pt-0 flex-wrap">
        {!post.hasRead ? (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => markReadMutation.mutate(post.id)}>
            <CheckCircle2 className="h-3 w-3" /> Mark as read
          </Button>
        ) : (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Read
          </span>
        )}
        <Collapsible
          open={openComments[post.id]}
          onOpenChange={open => setOpenComments(prev => ({ ...prev, [post.id]: open }))}
        >
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
              <MessageSquare className="h-3 w-3" />{post.commentCount || 0} comments
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 w-full">
            <PostComments postId={post.id} />
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                className="min-h-[60px] text-sm"
                value={newComment[post.id] || ""}
                onChange={e => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
              />
              <Button size="sm" className="shrink-0 self-end"
                disabled={!newComment[post.id]?.trim() || addCommentMutation.isPending}
                onClick={() => addCommentMutation.mutate({ postId: post.id, content: newComment[post.id] })}>
                Post
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardFooter>
    </Card>
  );

  return (
    <CommLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Announcements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Notices from your support team and platform updates.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {platformPosts.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                  <Globe className="h-4 w-4" /> Platform Notices
                </div>
                {platformPosts.map(renderPost)}
              </section>
            )}
            {orgPosts.length > 0 && (
              <section className="space-y-3">
                {platformPosts.length > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" /> From Your Support Team
                  </div>
                )}
                {orgPosts.map(renderPost)}
              </section>
            )}
            {posts.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No announcements yet. Check back soon!</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </CommLayout>
  );
}
