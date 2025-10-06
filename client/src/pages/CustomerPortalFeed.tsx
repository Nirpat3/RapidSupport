import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Building2, AlertCircle, LogOut, ThumbsUp, MessageSquare, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ThemeToggle from "@/components/ThemeToggle";

type Customer = {
  id: string;
  name: string;
  email: string;
  company?: string;
};

type Post = {
  id: string;
  content: string;
  visibility: string;
  isUrgent: boolean;
  links?: string[];
  images?: string[];
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
  likes: number;
  comments: number;
};

export default function CustomerPortalFeed() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get current customer info
  const { data: customerResponse, isLoading: customerLoading } = useQuery<{ customer: Customer }>({
    queryKey: ['/api/portal/auth/me'],
    retry: false,
  });

  const customer = customerResponse?.customer;

  // Get feed posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['/api/feed/posts', 'customer'],
    enabled: !!customer,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/portal/auth/logout', 'POST', {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/portal/login");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "Please try again",
      });
    },
  });

  // Redirect to login if not authenticated
  if (!customerLoading && !customer) {
    setLocation("/portal/login");
    return null;
  }

  if (customerLoading || postsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-portal-title">Customer Portal</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-customer-name">
                  {customer?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Updates & Announcements</h2>
          <p className="text-muted-foreground">
            Stay informed with the latest news and updates from our team
          </p>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No posts available yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later for updates and announcements
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id} data-testid={`card-post-${post.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar>
                        <AvatarFallback>
                          {post.author.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold" data-testid={`text-author-${post.id}`}>
                          {post.author.name}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-time-${post.id}`}>
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {post.isUrgent && (
                      <Badge variant="destructive" className="flex-shrink-0" data-testid={`badge-urgent-${post.id}`}>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap" data-testid={`text-content-${post.id}`}>
                    {post.content}
                  </p>

                  {post.images && post.images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {post.images.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`Post image ${index + 1}`}
                          className="rounded-md w-full h-auto"
                          data-testid={`img-post-${post.id}-${index}`}
                        />
                      ))}
                    </div>
                  )}

                  {post.links && post.links.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {post.links.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                          data-testid={`link-post-${post.id}-${index}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {link}
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
                <Separator />
                <CardFooter className="pt-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1" data-testid={`text-likes-${post.id}`}>
                      <ThumbsUp className="h-4 w-4" />
                      <span>{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1" data-testid={`text-comments-${post.id}`}>
                      <MessageSquare className="h-4 w-4" />
                      <span>{post.comments}</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
