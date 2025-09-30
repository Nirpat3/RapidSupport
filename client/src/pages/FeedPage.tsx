import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageCircle, 
  Heart, 
  Eye, 
  AlertCircle,
  Plus,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import type { Post } from "@shared/schema";

type PostWithAuthor = Post & {
  authorName: string;
};

type PostStats = {
  views: number;
  likes: number;
  comments: number;
};

export default function FeedPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  const { data: posts = [], isLoading, error, refetch } = useQuery<PostWithAuthor[]>({
    queryKey: ['/api/feed/posts', activeTab],
    enabled: !!user,
  });

  const isStaff = user?.role === 'admin' || user?.role === 'agent';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const visibilityBadgeColors = {
    internal: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    all_customers: 'bg-green-500/10 text-green-700 dark:text-green-400',
    targeted: 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
  };

  const PostCard = ({ post }: { post: PostWithAuthor }) => {
    // Note: This creates N+1 queries - known performance issue to be optimized
    const { data: stats } = useQuery<PostStats>({
      queryKey: ['/api/feed/posts', post.id, 'stats'],
    });

    const hasAttachments = (post.links?.length || 0) + (post.images?.length || 0) + (post.attachedArticleIds?.length || 0) > 0;

    return (
      <Card className="hover-elevate" data-testid={`post-${post.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10" data-testid={`avatar-${post.id}`}>
              <AvatarFallback className="text-xs">
                {getInitials(post.authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium" data-testid={`post-author-${post.id}`}>
                  {post.authorName}
                </p>
                <span className="text-xs text-muted-foreground">
                  • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${visibilityBadgeColors[post.visibility as keyof typeof visibilityBadgeColors] || ''}`}
                  data-testid={`badge-visibility-${post.id}`}
                >
                  {post.visibility === 'internal' ? 'Staff Only' : 
                   post.visibility === 'all_customers' ? 'All Customers' : 
                   'Targeted'}
                </Badge>
                {post.isUrgent && (
                  <Badge variant="destructive" className="flex items-center gap-1" data-testid={`badge-urgent-${post.id}`}>
                    <AlertCircle className="w-3 h-3" />
                    Urgent
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-wrap" data-testid={`post-content-${post.id}`}>
            {post.content}
          </p>

          {hasAttachments && (
            <div className="flex flex-wrap gap-2">
              {post.links?.map((link: string, idx: number) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid={`link-${post.id}-${idx}`}
                >
                  <LinkIcon className="w-3 h-3" />
                  {link.length > 30 ? link.substring(0, 30) + '...' : link}
                </a>
              ))}
              {post.images?.map((img: string, idx: number) => (
                <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`image-${post.id}-${idx}`}>
                  <ImageIcon className="w-3 h-3" />
                  Image {idx + 1}
                </div>
              ))}
              {post.attachedArticleIds?.map((articleId: string, idx: number) => (
                <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`article-${post.id}-${idx}`}>
                  <FileText className="w-3 h-3" />
                  Article {idx + 1}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2 border-t">
            <button 
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`button-like-${post.id}`}
            >
              <Heart className="w-4 h-4" />
              <span>{stats?.likes || 0}</span>
            </button>
            <button 
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`button-comment-${post.id}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{stats?.comments || 0}</span>
            </button>
            <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid={`views-${post.id}`}>
              <Eye className="w-4 h-4" />
              <span>{stats?.views || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col" data-testid="feed-page">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="feed-title">Feed</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Stay updated with announcements and team updates
            </p>
          </div>
          {isStaff && (
            <Button 
              className="w-full sm:w-auto"
              onClick={() => {
                // TODO: Implement in task 6
                alert('Create post form will be implemented in the next task');
              }}
              data-testid="button-create-post"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>Failed to load posts. Please try again.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Visibility Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full sm:w-auto" data-testid="tabs-filter">
            <TabsTrigger value="all" data-testid="tab-all">All Posts</TabsTrigger>
            {isStaff && <TabsTrigger value="internal" data-testid="tab-internal">Staff Only</TabsTrigger>}
            <TabsTrigger value="urgent" data-testid="tab-urgent">Urgent</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground" data-testid="text-no-posts">
                    No posts yet. {isStaff && "Create the first post!"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-4">
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
