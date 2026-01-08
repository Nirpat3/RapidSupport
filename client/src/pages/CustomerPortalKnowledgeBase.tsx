import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Search, FileText, BookOpen, Printer, TrendingUp, Eye, Clock, 
  ThumbsUp, ThumbsDown, Loader2, X, Filter
} from "lucide-react";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ChatWidget from "@/components/ChatWidget";
import { formatDistanceToNow } from "date-fns";

interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content?: string;
  category: string;
  tags: string[];
  usageCount?: number;
  effectiveness?: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  score?: number;
  helpful?: number;
  notHelpful?: number;
}

export default function CustomerPortalKnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("popular");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'helpful' | 'not_helpful'>>({});

  const { data: articles = [], isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ['/api/public/knowledge-base'],
    queryFn: async () => {
      return apiRequest('/api/public/knowledge-base', 'GET');
    },
  });

  const { data: fullArticle, isLoading: isLoadingArticle } = useQuery<KnowledgeBaseArticle>({
    queryKey: ['/api/public/knowledge-base', selectedArticle?.id],
    enabled: !!selectedArticle?.id,
    queryFn: async () => {
      if (!selectedArticle?.id) throw new Error('No article selected');
      return apiRequest(`/api/public/knowledge-base/${selectedArticle.id}`, 'GET');
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ articleId, helpful }: { articleId: string; helpful: boolean }) => {
      return apiRequest(`/api/public/knowledge-base/${articleId}/feedback`, 'POST', { helpful });
    },
    onSuccess: (_, variables) => {
      setFeedbackGiven(prev => ({
        ...prev,
        [variables.articleId]: variables.helpful ? 'helpful' : 'not_helpful'
      }));
      queryClient.invalidateQueries({ queryKey: ['/api/public/knowledge-base'] });
    },
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach(a => cats.add(a.category));
    return Array.from(cats).sort();
  }, [articles]);

  const popularArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 50);
  }, [articles]);

  const allArticles = useMemo(() => {
    return [...articles].sort((a, b) => a.title.localeCompare(b.title));
  }, [articles]);

  const filteredByCategory = useMemo(() => {
    if (!selectedCategory) return activeTab === 'popular' ? popularArticles : allArticles;
    const source = activeTab === 'popular' ? popularArticles : allArticles;
    return source.filter(a => a.category === selectedCategory);
  }, [selectedCategory, activeTab, popularArticles, allArticles]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return articles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query) ||
      article.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      article.content?.toLowerCase().includes(query)
    ).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  }, [articles, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const displayedArticles = isSearching ? searchResults : filteredByCategory;

  const handlePrint = () => {
    const articleToPrint = fullArticle || selectedArticle;
    if (articleToPrint) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${articleToPrint.title}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
                h1 { color: #111; font-size: 2rem; margin-bottom: 1.5rem; }
                .meta { color: #666; font-size: 0.875rem; margin-bottom: 2rem; }
                .content { color: #333; }
                @media print { body { margin: 0; padding: 1rem; } }
              </style>
            </head>
            <body>
              <h1>${articleToPrint.title}</h1>
              <div class="meta">Category: ${articleToPrint.category}</div>
              <div class="content">${articleToPrint.content || ''}</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }
    }
  };

  const handleFeedback = (articleId: string, helpful: boolean) => {
    if (!feedbackGiven[articleId]) {
      feedbackMutation.mutate({ articleId, helpful });
    }
  };

  const getHelpfulnessScore = (article: KnowledgeBaseArticle) => {
    const helpful = article.helpful || 0;
    const notHelpful = article.notHelpful || 0;
    const total = helpful + notHelpful;
    if (total === 0) return null;
    return Math.round((helpful / total) * 100);
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const ArticleCard = ({ article }: { article: KnowledgeBaseArticle }) => {
    const helpfulnessScore = getHelpfulnessScore(article);
    
    return (
      <Card
        className="hover-elevate active-elevate-2 transition-all cursor-pointer group"
        onClick={() => setSelectedArticle(article)}
        data-testid={`card-article-${article.id}`}
      >
        <CardHeader className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </CardTitle>
              </div>
              {(article.usageCount || 0) > 10 && (
                <Badge variant="outline" className="gap-1 flex-shrink-0 text-amber-600 border-amber-300">
                  <TrendingUp className="h-3 w-3" />
                  Popular
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {article.category}
              </Badge>
              {article.tags?.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Updated {formatDate(article.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{article.usageCount || 0} views</span>
              </div>
              {helpfulnessScore !== null && (
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  <span>{helpfulnessScore}% helpful</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  return (
    <CustomerPortalLayout>
      <div className="min-h-screen">
        <div className="bg-gradient-to-b from-primary/5 via-primary/3 to-background border-b">
          <div className="container max-w-5xl mx-auto px-4 py-12 sm:py-16">
            <div className="text-center space-y-6 mb-8">
              <div className="flex items-center justify-center gap-3">
                <BookOpen className="h-10 w-10 text-primary" />
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" data-testid="title-knowledge-base">
                  Knowledge Base
                </h1>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions and explore our comprehensive guides
              </p>
            </div>

            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search articles, categories, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-14 text-base bg-background shadow-sm"
                data-testid="input-search-knowledge"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchQuery("")}
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container max-w-5xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="flex-shrink-0"
                  data-testid="filter-all"
                >
                  All Categories
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="flex-shrink-0"
                    data-testid={`filter-category-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {isSearching ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary" />
                      Search Results
                    </h2>
                    <Badge variant="outline">{searchResults.length} found</Badge>
                  </div>
                  
                  {searchResults.length === 0 ? (
                    <Card className="py-12">
                      <CardContent className="text-center space-y-4">
                        <Search className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                        <div>
                          <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                          <p className="text-muted-foreground">
                            Try different keywords or browse categories
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {searchResults.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="popular" className="gap-2" data-testid="tab-popular">
                      <TrendingUp className="h-4 w-4" />
                      Popular Articles
                    </TabsTrigger>
                    <TabsTrigger value="all" className="gap-2" data-testid="tab-all">
                      <FileText className="h-4 w-4" />
                      All Articles
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="popular" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        {selectedCategory ? `Popular in ${selectedCategory}` : 'Most Viewed Articles'}
                      </h2>
                      <Badge variant="outline">{filteredByCategory.length} articles</Badge>
                    </div>
                    
                    {filteredByCategory.length === 0 ? (
                      <Card className="py-12">
                        <CardContent className="text-center space-y-4">
                          <FileText className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                          <div>
                            <h3 className="text-xl font-semibold mb-2">No articles in this category</h3>
                            <p className="text-muted-foreground">
                              Try selecting a different category
                            </p>
                          </div>
                          <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                            View All Categories
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {filteredByCategory.map((article) => (
                          <ArticleCard key={article.id} article={article} />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="all" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {selectedCategory ? `Articles in ${selectedCategory}` : 'All Articles'}
                      </h2>
                      <Badge variant="outline">{filteredByCategory.length} articles</Badge>
                    </div>
                    
                    {filteredByCategory.length === 0 ? (
                      <Card className="py-12">
                        <CardContent className="text-center space-y-4">
                          <FileText className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                          <div>
                            <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                            <p className="text-muted-foreground">
                              Try selecting a different category
                            </p>
                          </div>
                          <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                            View All Categories
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {filteredByCategory.map((article) => (
                          <ArticleCard key={article.id} article={article} />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </div>

        {selectedArticle && (
          <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <DialogTitle className="text-2xl" data-testid="title-article-view">
                      {(fullArticle || selectedArticle).title}
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{(fullArticle || selectedArticle).category}</Badge>
                      {(fullArticle || selectedArticle).tags?.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Updated {formatDate((fullArticle || selectedArticle).updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{(fullArticle || selectedArticle).usageCount || 0} views</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="gap-2 flex-shrink-0"
                    data-testid="button-print-article"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </div>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                {isLoadingArticle && !fullArticle ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: (fullArticle || selectedArticle).content || '' }}
                    data-testid="content-article-view"
                  />
                )}
              </ScrollArea>

              <Separator className="my-4" />
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Was this article helpful?
                </div>
                <div className="flex items-center gap-2">
                  {feedbackGiven[selectedArticle.id] ? (
                    <Badge variant="outline" className="gap-1">
                      {feedbackGiven[selectedArticle.id] === 'helpful' ? (
                        <><ThumbsUp className="h-3 w-3" /> Thanks for your feedback!</>
                      ) : (
                        <><ThumbsDown className="h-3 w-3" /> Thanks for your feedback!</>
                      )}
                    </Badge>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleFeedback(selectedArticle.id, true)}
                        disabled={feedbackMutation.isPending}
                        data-testid="button-helpful"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Yes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleFeedback(selectedArticle.id, false)}
                        disabled={feedbackMutation.isPending}
                        data-testid="button-not-helpful"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        No
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <ChatWidget className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 !max-w-[min(28rem,calc(100vw-2rem))] max-h-[80vh]" />
      </div>
    </CustomerPortalLayout>
  );
}
