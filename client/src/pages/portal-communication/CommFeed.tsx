import { useQuery, useMutation } from "@tanstack/react-query";
import { CommLayout } from "./CommLayout";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import {
  Globe, Lock, MessageSquare, Heart, ImagePlus,
  Loader2, Send, Users, ChevronDown
} from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface FeedPost {
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

function PostComments({ postId, isPortal }: { postId: string; isPortal?: boolean }) {
  const base = isPortal ? "/api/customer-portal" : "/api";
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: [`${base}/comm/posts`, postId, "comments"],
    queryFn: () => apiRequest(`${base}/comm/posts/${postId}/comments`, "GET"),
  });
  if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;
  if (!comments.length) return <p className="text-xs text-muted-foreground">Be the first to comment.</p>;
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

export default function CommFeed() {
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"all" | "public" | "mine">("all");

  const { data: posts = [], isLoading } = useQuery<FeedPost[]>({
    queryKey: ["/api/customer-portal/comm/posts", "community"],
    queryFn: () => apiRequest("/api/customer-portal/comm/posts?type=community", "GET"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/customer-portal/comm/posts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts"] });
      setNewPost("");
      toast({ title: visibility === "public" ? "Post shared publicly" : "Post saved privately" });
    },
    onError: () => toast({ title: "Failed to post", variant: "destructive" }),
  });

  const reactMutation = useMutation({
    mutationFn: ({ postId, emoji }: { postId: string; emoji: string }) =>
      apiRequest(`/api/customer-portal/comm/posts/${postId}/react`, "POST", { emoji }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts"] }),
  });

  const commentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiRequest(`/api/customer-portal/comm/posts/${postId}/comments`, "POST", { content }),
    onSuccess: (_, { postId }) => {
      setNewComment(prev => ({ ...prev, [postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts"] });
    },
    onError: () => toast({ title: "Failed to comment", variant: "destructive" }),
  });

  const handlePost = () => {
    if (!newPost.trim()) return;
    createMutation.mutate({ content: newPost, type: "community", visibility });
  };

  const filteredPosts = posts.filter(p => {
    if (activeTab === "public") return p.visibility === "public";
    if (activeTab === "mine") return true; // API already filters by session
    return true;
  });

  return (
    <CommLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Community Feed
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share updates, ask questions, or post privately just for yourself.
          </p>
        </div>

        {/* Composer card */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Textarea
              placeholder="What's on your mind? Share with the community or post privately..."
              className="min-h-[100px] resize-none text-sm"
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Select value={visibility} onValueChange={v => setVisibility(v as any)}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-green-500" />
                      <span>Public — Everyone</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3 w-3 text-amber-500" />
                      <span>Private — Only me</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="gap-2"
                onClick={handlePost}
                disabled={!newPost.trim() || createMutation.isPending}
              >
                {createMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Send className="h-3 w-3" />}
                {visibility === "public" ? "Share" : "Save privately"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "All Posts" },
            { key: "public", label: "Public" },
          ].map(tab => (
            <Button
              key={tab.key}
              size="sm"
              variant={activeTab === tab.key ? "default" : "outline"}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No posts yet. Be the first to share something!</p>
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
                        {post.authorType === "customer" ? "C" : "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {post.authorType === "customer" ? "Community Member" : "Support Team"}
                        </span>
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
                <CardFooter className="pt-0 flex gap-2 flex-wrap">
                  {post.visibility === "public" && (
                    <Button
                      size="sm" variant="ghost" className="h-7 text-xs gap-1"
                      onClick={() => reactMutation.mutate({ postId: post.id, emoji: "❤" })}
                    >
                      <Heart className="h-3 w-3" />
                      {post.reactionCount || 0}
                    </Button>
                  )}
                  {post.visibility === "public" && (
                    <Collapsible
                      open={openComments[post.id]}
                      onOpenChange={open => setOpenComments(prev => ({ ...prev, [post.id]: open }))}
                    >
                      <CollapsibleTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                          <MessageSquare className="h-3 w-3" />{post.commentCount || 0} comments
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-3 w-64 sm:w-full">
                        <PostComments postId={post.id} isPortal />
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
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CommLayout>
  );
}
