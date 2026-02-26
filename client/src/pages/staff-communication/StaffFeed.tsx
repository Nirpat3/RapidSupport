import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Heart, Share2, Send, Filter, MoreHorizontal, Loader2 } from "lucide-react";
import type { CommPost, User, CustomerOrganization } from "@shared/schema";
import { format } from "date-fns";

export default function StaffFeed() {
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string | null>(null);

  const { data: staffPosts = [], isLoading: staffPostsLoading } = useQuery<CommPost[]>({
    queryKey: ["/api/comm/posts", { type: "workspace_feed" }],
  });

  const { data: retailPosts = [], isLoading: retailPostsLoading } = useQuery<CommPost[]>({
    queryKey: ["/api/comm/posts", { type: "retail_feed" }],
  });

  const { data: customerOrgs = [] } = useQuery<CustomerOrganization[]>({
    queryKey: ["/api/customer-organizations"],
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("/api/comm/posts", "POST", {
        content,
        type: "workspace_feed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comm/posts"] });
      setNewPost("");
      toast({ title: "Post shared" });
    },
  });

  const handlePost = () => {
    if (!newPost.trim()) return;
    createPostMutation.mutate(newPost);
  };

  const filteredRetailPosts = selectedOrgFilter 
    ? retailPosts.filter(p => p.organizationId === selectedOrgFilter)
    : retailPosts;

  const renderPost = (post: CommPost) => (
    <Card key={post.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Post Author</p>
                <p className="text-xs text-muted-foreground">{post.createdAt ? format(new Date(post.createdAt), 'MMM d, h:mm a') : ''}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
            <div className="flex items-center gap-4 pt-2">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>Like</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>Comment</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground ml-auto">
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
          <p className="text-muted-foreground">
            Monitor and interact with social communication across the platform.
          </p>
        </div>
      </div>

      <Tabs defaultValue="above" className="space-y-6">
        <TabsList>
          <TabsTrigger value="above">From Above (Staff & SuperAdmin)</TabsTrigger>
          <TabsTrigger value="retailers">From Retailers</TabsTrigger>
        </TabsList>

        <TabsContent value="above" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Post to Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea 
                  placeholder="What's happening in the workspace?" 
                  className="min-h-[100px] resize-none"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button 
                    className="gap-2" 
                    onClick={handlePost}
                    disabled={createPostMutation.isPending || !newPost.trim()}
                  >
                    {createPostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Post
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="max-w-2xl mx-auto">
            {staffPostsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : staffPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No posts yet.</div>
            ) : (
              staffPosts.map(renderPost)
            )}
          </div>
        </TabsContent>

        <TabsContent value="retailers" className="space-y-6">
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <Badge 
              variant={selectedOrgFilter === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedOrgFilter(null)}
            >
              All Retailers
            </Badge>
            {customerOrgs.map((org) => (
              <Badge
                key={org.id}
                variant={selectedOrgFilter === org.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedOrgFilter(org.id)}
              >
                {org.name}
              </Badge>
            ))}
          </div>

          <div className="max-w-2xl mx-auto">
            {retailPostsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredRetailPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No retailer posts found.</div>
            ) : (
              filteredRetailPosts.map(renderPost)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
