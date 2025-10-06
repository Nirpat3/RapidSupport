import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  RefreshCw,
  X,
  Search,
  Hash
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Post } from "@shared/schema";

type PostWithAuthor = Post & {
  authorName: string;
};

type PostStats = {
  views: number;
  likes: number;
  comments: number;
};

const createPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000, "Content must be less than 5000 characters"),
  visibility: z.enum(['internal', 'all_customers', 'targeted']),
  isUrgent: z.boolean().default(false),
  targetedCustomerIds: z.array(z.string()).optional(),
  links: z.string().optional().refine(
    (val) => {
      if (!val) return true;
      const urls = val.split(',').map(l => l.trim()).filter(Boolean);
      return urls.every(url => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      });
    },
    { message: "All links must be valid http or https URLs" }
  ),
  images: z.string().optional().refine(
    (val) => {
      if (!val) return true;
      const urls = val.split(',').map(i => i.trim()).filter(Boolean);
      return urls.every(url => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      });
    },
    { message: "All image URLs must be valid http or https URLs" }
  ),
}).refine((data) => {
  if (data.visibility === 'targeted' && (!data.targetedCustomerIds || data.targetedCustomerIds.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Please select at least one customer for targeted posts",
  path: ["targetedCustomerIds"],
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

type Customer = {
  id: string;
  name: string;
  email: string;
  company?: string;
};

export default function FeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const isStaff = user?.role === 'admin' || user?.role === 'agent';

  // Get all available tags
  const { data: allTags = [] } = useQuery<string[]>({
    queryKey: ['/api/feed/tags'],
  });

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.append('search', searchQuery);
  if (selectedTags.length > 0) {
    selectedTags.forEach(tag => queryParams.append('tags', tag));
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const { data: posts = [], isLoading, error, refetch } = useQuery<PostWithAuthor[]>({
    queryKey: ['/api/feed/posts', activeTab, queryString],
    enabled: !!user,
  });

  const { data: customersResponse, isLoading: customersLoading } = useQuery<{customers: Customer[], total: number}>({
    queryKey: ['/api/customers', { limit: 1000 }],
    enabled: isStaff,
  });

  const customers = customersResponse?.customers || [];

  const form = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: '',
      visibility: 'internal',
      isUrgent: false,
      targetedCustomerIds: [],
      links: '',
      images: '',
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostFormData) => {
      const links = data.links?.split(',').map(l => l.trim()).filter(Boolean);
      const images = data.images?.split(',').map(i => i.trim()).filter(Boolean);
      
      return await apiRequest('/api/feed/posts', 'POST', {
        content: data.content,
        visibility: data.visibility,
        isUrgent: data.isUrgent,
        targetedUserIds: data.visibility === 'targeted' ? data.targetedCustomerIds : undefined,
        links: links?.length ? links : undefined,
        images: images?.length ? images : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed/posts'] });
      toast({
        title: "Post created",
        description: "Your post has been published successfully.",
      });
      setIsCreateDialogOpen(false);
      setSelectedCustomerIds([]);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create post",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePostFormData) => {
    createPostMutation.mutate(data);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const visibilityBadgeColors = {
    internal: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    all_customers: 'bg-green-500/10 text-green-700 dark:text-green-400',
    targeted: 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest(`/api/feed/posts/${postId}/read`, 'POST');
    },
  });

  const PostCard = ({ post }: { post: PostWithAuthor }) => {
    // Note: This creates N+1 queries - known performance issue to be optimized
    const { data: stats } = useQuery<PostStats>({
      queryKey: ['/api/feed/posts', post.id, 'stats'],
    });

    // Mark post as read when it's rendered
    useEffect(() => {
      if (user?.id) {
        markAsReadMutation.mutate(post.id);
      }
    }, [post.id]);

    const hasAttachments = (post.links?.length || 0) + (post.images?.length || 0) + (post.attachedArticleIds?.length || 0) > 0;

    const handleTagClick = (tag: string) => {
      if (!selectedTags.includes(tag)) {
        setSelectedTags([...selectedTags, tag]);
      }
    };

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
                <span className="text-xs text-muted-foreground" title={format(new Date(post.createdAt), 'PPpp')}>
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

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, idx) => (
                <Badge 
                  key={idx}
                  variant="secondary"
                  className="cursor-pointer hover-elevate active-elevate-2 flex items-center gap-1"
                  onClick={() => handleTagClick(tag)}
                  data-testid={`tag-${post.id}-${idx}`}
                >
                  <Hash className="w-3 h-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

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
              onClick={() => setIsCreateDialogOpen(true)}
              data-testid="button-create-post"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          {allTags.length > 0 && (
            <Select
              value={selectedTags[0] || ''}
              onValueChange={(value) => {
                if (value && !selectedTags.includes(value)) {
                  setSelectedTags([...selectedTags, value]);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-48" data-testid="select-tags">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    <div className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {tag}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Active Filters */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {selectedTags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {tag}
                <button
                  onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                  className="ml-1"
                  data-testid={`remove-tag-${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTags([])}
              data-testid="button-clear-filters"
            >
              Clear all
            </Button>
          </div>
        )}

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

      {/* Create Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
            <DialogDescription>
              Share announcements, updates, or important information with your team or customers.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What would you like to share?"
                        className="min-h-32"
                        data-testid="input-post-content"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Write your announcement or update (max 5000 characters). Use #hashtags to categorize your post.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== 'targeted') {
                          form.setValue('targetedCustomerIds', []);
                          setSelectedCustomerIds([]);
                        }
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-visibility">
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="internal">Staff Only</SelectItem>
                        <SelectItem value="all_customers">All Customers</SelectItem>
                        <SelectItem value="targeted">Targeted</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose who can see this post
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('visibility') === 'targeted' && (
                <FormField
                  control={form.control}
                  name="targetedCustomerIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Customers</FormLabel>
                      <FormDescription>
                        Choose which customers should see this post
                      </FormDescription>
                      <FormControl>
                        <ScrollArea className="h-64 rounded-md border p-4">
                          {customersLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          ) : customers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No customers found
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {customers.map((customer: Customer) => (
                                <div key={customer.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={field.value?.includes(customer.id)}
                                    onCheckedChange={(checked) => {
                                      const currentIds = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentIds, customer.id]);
                                        setSelectedCustomerIds([...currentIds, customer.id]);
                                      } else {
                                        const newIds = currentIds.filter(id => id !== customer.id);
                                        field.onChange(newIds);
                                        setSelectedCustomerIds(newIds);
                                      }
                                    }}
                                    data-testid={`checkbox-customer-${customer.id}`}
                                  />
                                  <label
                                    htmlFor={customer.id}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                  >
                                    <div>
                                      <p className="font-medium">{customer.name}</p>
                                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                                      {customer.company && (
                                        <p className="text-xs text-muted-foreground">{customer.company}</p>
                                      )}
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </FormControl>
                      {field.value && field.value.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {field.value.length} customer{field.value.length === 1 ? '' : 's'} selected
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="isUrgent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-urgent"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Mark as Urgent
                      </FormLabel>
                      <FormDescription>
                        Urgent posts will be highlighted and shown in the urgent tab
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="links"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Links (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com, https://example2.com"
                        data-testid="input-links"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Add external links (comma-separated)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URLs (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                        data-testid="input-images"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Add image URLs (comma-separated)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setSelectedCustomerIds([]);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPostMutation.isPending}
                  data-testid="button-submit-post"
                >
                  {createPostMutation.isPending ? "Creating..." : "Create Post"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
