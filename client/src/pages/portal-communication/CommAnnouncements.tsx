import { useQuery, useMutation } from "@tanstack/react-query";
import { CommLayout } from "./CommLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Megaphone, CheckCircle2, MessageSquare, Tag } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CommPost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
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

export default function CommAnnouncements() {
  const { toast } = useToast();
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});

  const { data: posts, isLoading } = useQuery<CommPost[]>({
    queryKey: ["/api/customer-portal/comm/posts", { type: "announcement" }],
  });

  const markReadMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest(`/api/customer-portal/comm/posts/${postId}/read`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts"] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      return apiRequest(`/api/customer-portal/comm/posts/${postId}/comments`, "POST", { content });
    },
    onSuccess: (_, { postId }) => {
      setNewComment(prev => ({ ...prev, [postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/posts"] });
      toast({ title: "Comment added" });
    },
  });

  const getTagBadge = (tag: string) => {
    const normalized = tag.toLowerCase();
    if (normalized === "urgent") return <Badge variant="destructive" className="gap-1"><Tag className="h-3 w-3" />Urgent</Badge>;
    if (normalized === "important") return <Badge className="bg-amber-500 hover:bg-amber-600 gap-1 text-white no-default-hover-elevate border-amber-600"><Tag className="h-3 w-3" />Important</Badge>;
    if (normalized === "fyi") return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1 text-white no-default-hover-elevate border-blue-600"><Tag className="h-3 w-3" />FYI</Badge>;
    if (normalized === "update") return <Badge className="bg-green-500 hover:bg-green-600 gap-1 text-white no-default-hover-elevate border-green-600"><Tag className="h-3 w-3" />Update</Badge>;
    if (normalized === "promo" || normalized === "promotion") return <Badge className="bg-purple-500 hover:bg-purple-600 gap-1 text-white no-default-hover-elevate border-purple-600"><Tag className="h-3 w-3" />Promo</Badge>;
    return <Badge variant="secondary" className="gap-1"><Tag className="h-3 w-3" />{tag}</Badge>;
  };

  return (
    <CommLayout>
      <ScrollArea className="h-full pr-4">
        <div className="space-y-6 pb-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse h-48" />
            ))
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-medium">No announcements</h3>
              <p className="text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className={post.isPinned ? "border-primary/50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map(tag => (
                        <span key={tag}>{getTagBadge(tag)}</span>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <CardTitle className="flex items-center gap-2">
                    {post.isPinned && <Megaphone className="h-4 w-4 text-primary shrink-0" />}
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {post.content}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-4 border-t pt-4">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {post.author.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span>{post.author.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!post.hasRead && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-2"
                          onClick={() => markReadMutation.mutate(post.id)}
                          disabled={markReadMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Acknowledge
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="gap-2"
                        onClick={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {post.commentCount || 0} Comments
                      </Button>
                    </div>
                  </div>

                  <Collapsible open={openComments[post.id]}>
                    <CollapsibleContent className="space-y-4 pt-4">
                      <CommentList postId={post.id} />
                      <div className="flex flex-col gap-2 pt-2">
                        <Textarea 
                          placeholder="Add a comment..." 
                          className="min-h-[80px]"
                          value={newComment[post.id] || ""}
                          onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        />
                        <div className="flex justify-end">
                          <Button 
                            size="sm"
                            disabled={!newComment[post.id]?.trim() || addCommentMutation.isPending}
                            onClick={() => addCommentMutation.mutate({ postId: post.id, content: newComment[post.id] })}
                          >
                            Post Comment
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </CommLayout>
  );
}

function CommentList({ postId }: { postId: string }) {
  const { data: comments, isLoading } = useQuery<CommComment[]>({
    queryKey: ["/api/customer-portal/comm/posts", postId, "comments"],
  });

  if (isLoading) return <div className="space-y-2"><div className="h-4 w-full bg-accent animate-pulse rounded" /></div>;

  return (
    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
      {comments?.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs">
              {comment.authorName.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 bg-accent/50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">{comment.authorName}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
