import { useQuery, useMutation } from "@tanstack/react-query";
import { CommLayout } from "./CommLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, Send, Rss } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Post {
  id: string;
  content: string;
  authorId: string;
  authorType: string;
  authorName: string;
  createdAt: string;
  reactions: Record<string, number>;
  userReaction?: string;
  commentCount: number;
}

export default function CommFeed() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("workspace");
  const [newPostContent, setNewPostContent] = useState("");

  const { data: workspacePosts, isLoading: loadingWorkspace } = useQuery<Post[]>({
    queryKey: ["/api/customer-portal/comm/posts", { type: "workspace_feed" }],
  });

  const { data: retailPosts, isLoading: loadingRetail } = useQuery<Post[]>({
    queryKey: ["/api/customer-portal/comm/posts", { type: "retail_feed" }],
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("/api/customer-portal/comm/posts", "POST", {
        content,
        type: "retail_feed",
      });
    },
    onSuccess: () => {
      setNewPostContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts", { type: "retail_feed" }] });
      toast({ title: "Post published" });
    },
  });

  return (
    <CommLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="w-full justify-start mb-4">
          <TabsTrigger value="workspace">From Workspace</TabsTrigger>
          <TabsTrigger value="team">From My Team</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="workspace" className="h-full mt-0">
            <PostList posts={workspacePosts} isLoading={loadingWorkspace} emptyMessage="No posts from workspace yet." />
          </TabsContent>

          <TabsContent value="team" className="h-full mt-0 flex flex-col gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <Textarea 
                      placeholder="Share an update with your team..." 
                      className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className="flex justify-end pt-2">
                      <Button 
                        disabled={!newPostContent.trim() || createPostMutation.isPending}
                        onClick={() => createPostMutation.mutate(newPostContent)}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex-1 overflow-hidden">
              <PostList posts={retailPosts} isLoading={loadingRetail} emptyMessage="No posts from your team yet. Be the first!" />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </CommLayout>
  );
}

function PostList({ posts, isLoading, emptyMessage }: { posts?: Post[]; isLoading: boolean; emptyMessage: string }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i} className="animate-pulse h-32" />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <Rss className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-4 pb-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </ScrollArea>
  );
}

function PostCard({ post }: { post: Post }) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);

  const reactMutation = useMutation({
    mutationFn: async (emoji: string) => {
      return apiRequest(`/api/customer-portal/comm/posts/${post.id}/react`, "POST", { emoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts"] });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{post.authorName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{post.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>
            <span className="text-xs text-muted-foreground capitalize">{post.authorType}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2 pt-2">
        <Separator />
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("gap-2", post.userReaction === "❤️" && "text-red-500")}
            onClick={() => reactMutation.mutate("❤️")}
          >
            <Heart className={cn("h-4 w-4", post.userReaction === "❤️" && "fill-current")} />
            {post.reactions?.["❤️"] || 0}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare className="h-4 w-4" />
            {post.commentCount || 0}
          </Button>
        </div>
        {showComments && (
           <div className="pt-2">
             <FeedCommentSection postId={post.id} />
           </div>
        )}
      </CardFooter>
    </Card>
  );
}

function FeedCommentSection({ postId }: { postId: string }) {
  const [content, setContent] = useState("");
  
  const { data: comments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/customer-portal/comm/posts", postId, "comments"],
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/customer-portal/comm/posts/${postId}/comments`, "POST", { content });
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts"] });
    }
  });

  if (isLoading) {
    return <div className="space-y-2 py-2"><div className="h-8 w-full bg-accent animate-pulse rounded" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {(!comments || comments.length === 0) ? (
          <p className="text-xs text-muted-foreground italic">No comments yet.</p>
        ) : comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[10px]">
                {c.authorName.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="bg-accent/30 p-2 rounded-lg flex-1">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-[10px] font-bold">{c.authorName}</span>
                 <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt))} ago</span>
               </div>
               <p className="text-xs">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea 
          placeholder="Write a comment..." 
          className="min-h-[40px] text-xs resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button size="icon" disabled={!content.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate(content)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
