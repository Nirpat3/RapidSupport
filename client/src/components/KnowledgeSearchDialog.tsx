import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Copy, ExternalLink, BookOpen, Tag, RefreshCw, AlertTriangle, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type KnowledgeBase } from '@shared/schema';

interface KnowledgeSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasteArticle?: (articleContent: string, articleTitle: string) => void;
}

export default function KnowledgeSearchDialog({ 
  open, 
  onOpenChange, 
  onPasteArticle 
}: KnowledgeSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBase | null>(null);
  const { toast } = useToast();

  // Fetch all knowledge base articles
  const { data: articles = [], isLoading, error, refetch } = useQuery<KnowledgeBase[]>({
    queryKey: ['/api/knowledge-base'],
    enabled: open,
  });

  // Filter articles based on search query
  const filteredArticles = articles.filter(article => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = article.title.toLowerCase().includes(query);
    const contentMatch = article.content.toLowerCase().includes(query);
    const categoryMatch = article.category.toLowerCase().includes(query);
    const tagMatch = article.tags?.some(tag => tag.toLowerCase().includes(query));
    
    return titleMatch || contentMatch || categoryMatch || tagMatch;
  });

  // Utility function to strip emojis and ensure plain text
  const stripEmojis = (text: string): string => {
    // Simply return the text as-is since the previous regex was removing legitimate characters
    // We'll let the chat interface handle emoji display properly
    return text;
  };

  const handlePasteArticle = (article: KnowledgeBase) => {
    if (!onPasteArticle) return;
    
    // Strip emojis and format article content for chat message (plain text format)
    const cleanTitle = stripEmojis(article.title);
    const cleanContent = stripEmojis(article.content);
    const formattedContent = `Knowledge Base Article: ${cleanTitle}\n\n${cleanContent}\n\n---\nThis information is from our knowledge base. Please let me know if you need any clarification or have additional questions!`;
    
    onPasteArticle(formattedContent, cleanTitle);
    onOpenChange(false);
    
    toast({
      title: "Article Pasted",
      description: `"${cleanTitle}" has been added to your message.`,
    });
  };

  const handleCopyContent = (article: KnowledgeBase) => {
    navigator.clipboard.writeText(article.content);
    toast({
      title: "Copied to Clipboard",
      description: `Content of "${article.title}" has been copied.`,
    });
  };

  const handleShareLink = (article: KnowledgeBase) => {
    const articleUrl = `${window.location.origin}/kb/${article.id}`;
    
    if (onPasteArticle) {
      // Share link in chat
      const linkMessage = `Here's a helpful article from our knowledge base:\n\n📚 ${article.title}\n${articleUrl}\n\nYou can view, print, or save this article for your reference.`;
      onPasteArticle(linkMessage, article.title);
      onOpenChange(false);
      
      toast({
        title: "Link Shared",
        description: `Article link has been added to your message.`,
      });
    } else {
      // Copy link to clipboard
      navigator.clipboard.writeText(articleUrl);
      toast({
        title: "Link Copied",
        description: `Article link has been copied to clipboard.`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col" data-testid="dialog-knowledge-search">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Knowledge Base Search
          </DialogTitle>
          <DialogDescription>
            Search and share knowledge base articles with customers
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search articles by title, content, category, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-knowledge-search"
          />
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Article List */}
          <div className="w-1/2 flex flex-col">
            <div className="text-sm text-muted-foreground mb-2">
              {isLoading ? 'Loading...' : `${filteredArticles.length} article${filteredArticles.length !== 1 ? 's' : ''} found`}
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-destructive opacity-50 mb-2" />
                    <p className="text-sm text-destructive mb-2">
                      Failed to load knowledge base articles
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetch()}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry
                    </Button>
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading articles...</div>
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground opacity-50 mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">
                      {searchQuery ? 'No articles found' : 'No knowledge base articles available'}
                    </p>
                    {searchQuery && (
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search terms
                      </p>
                    )}
                  </div>
                ) : (
                  filteredArticles.map((article) => (
                    <Card 
                      key={article.id}
                      className={`cursor-pointer transition-colors hover-elevate ${
                        selectedArticle?.id === article.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedArticle(article)}
                      data-testid={`card-article-${article.id}`}
                    >
                      <CardHeader className="p-3">
                        <div className="space-y-2">
                          <CardTitle className="text-sm font-medium line-clamp-2">
                            {article.title}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {article.category}
                            </Badge>
                            {article.sourceType && (
                              <Badge variant="outline" className="text-xs">
                                {article.sourceType}
                              </Badge>
                            )}
                          </div>
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              {article.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs px-1">
                                  {tag}
                                </Badge>
                              ))}
                              {article.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{article.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Article Preview */}
          <div className="w-1/2 flex flex-col border-l pl-4">
            {selectedArticle ? (
              <>
                <div className="space-y-2 mb-4">
                  <h3 className="font-medium">{selectedArticle.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedArticle.category}</Badge>
                    {selectedArticle.sourceType && (
                      <Badge variant="outline">{selectedArticle.sourceType}</Badge>
                    )}
                  </div>
                  {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      {selectedArticle.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs px-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1 mb-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm">
                      {selectedArticle.content}
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleShareLink(selectedArticle)}
                    className="flex-1"
                    data-testid="button-share-link"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Share Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePasteArticle(selectedArticle)}
                    data-testid="button-paste-article"
                    title="Paste full article content"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCopyContent(selectedArticle)}
                    data-testid="button-copy-content"
                    title="Copy content to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="w-12 h-12 text-muted-foreground opacity-50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Select an article to preview and share with customers
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}