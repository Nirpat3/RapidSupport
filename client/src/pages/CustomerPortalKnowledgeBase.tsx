import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, BookOpen, Printer, HelpCircle, TrendingUp, Star, FolderOpen, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";
import { apiRequest } from "@/lib/queryClient";
import ChatWidget from "@/components/ChatWidget";
import { useLocation } from "wouter";

interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content?: string;
  category: string;
  tags: string[];
  usageCount?: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  score?: number;
  effectiveness?: number;
}

export default function CustomerPortalKnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [, setLocation] = useLocation();

  const { data: articles = [], isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ['/api/public/knowledge-base'],
    queryFn: async () => {
      return apiRequest('/api/public/knowledge-base', 'GET');
    },
  });

  const { data: popularArticles = [] } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ['/api/public/knowledge-base/popular'],
    queryFn: async () => {
      return apiRequest('/api/public/knowledge-base/popular?limit=6', 'GET');
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

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return articles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query) ||
      article.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      article.content?.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  const articlesByCategory = useMemo(() => {
    const grouped: Record<string, KnowledgeBaseArticle[]> = {};
    
    articles.forEach(article => {
      if (!grouped[article.category]) {
        grouped[article.category] = [];
      }
      grouped[article.category].push(article);
    });
    
    return grouped;
  }, [articles]);

  const categories = useMemo(() => {
    return Object.entries(articlesByCategory)
      .map(([name, arts]) => ({
        name,
        count: arts.length,
        popularArticle: arts.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0]
      }))
      .sort((a, b) => b.count - a.count);
  }, [articlesByCategory]);

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

  const navigateToCategory = (categoryName: string) => {
    setLocation(`/knowledge-base/category/${encodeURIComponent(categoryName)}`);
  };

  const isSearching = searchQuery.trim().length > 0;

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
                placeholder="Search articles across all categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-14 text-base bg-background shadow-sm"
                data-testid="input-search-knowledge"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                  data-testid="button-clear-search"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container max-w-5xl mx-auto px-4 py-8 sm:py-12">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading knowledge base...</p>
              </div>
            </div>
          ) : isSearching ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                <span>
                  Found <strong className="text-foreground">{filteredArticles.length}</strong> {filteredArticles.length === 1 ? 'article' : 'articles'} matching "{searchQuery}"
                </span>
              </div>

              {filteredArticles.length === 0 ? (
                <Card className="py-12">
                  <CardContent className="text-center space-y-4">
                    <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">No results found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search terms or browse categories below
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setSearchQuery('')} data-testid="button-clear-search-empty">
                      Clear Search
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {filteredArticles.map((article) => (
                    <Card
                      key={article.id}
                      className="hover-elevate active-elevate-2 transition-all cursor-pointer group"
                      onClick={() => setSelectedArticle(article)}
                      data-testid={`card-search-result-${article.id}`}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors mb-1">
                              {article.title}
                            </CardTitle>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="outline" className="text-xs">
                                {article.category}
                              </Badge>
                              {article.tags?.slice(0, 2).map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {article.usageCount && article.usageCount > 10 && (
                            <Badge variant="outline" className="gap-1 flex-shrink-0">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              Popular
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {popularArticles.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {popularArticles.map((article) => (
                      <Card
                        key={article.id}
                        className="hover-elevate active-elevate-2 transition-all cursor-pointer group h-full"
                        onClick={() => setSelectedArticle(article)}
                        data-testid={`card-faq-${article.id}`}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-start gap-3">
                            <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-medium group-hover:text-primary transition-colors line-clamp-2">
                                {article.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  {article.category}
                                </Badge>
                                {article.usageCount && (
                                  <span className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {article.usageCount} views
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center gap-2 mb-6">
                  <FolderOpen className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-semibold">Browse by Category</h2>
                </div>
                <p className="text-muted-foreground mb-6 -mt-4">
                  Select a category to explore all related articles
                </p>
                
                {categories.length === 0 ? (
                  <Card className="py-12">
                    <CardContent className="text-center space-y-4">
                      <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                      <div>
                        <h3 className="text-xl font-semibold mb-2">No categories available</h3>
                        <p className="text-muted-foreground">
                          Check back later for helpful articles and guides
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <Card
                        key={category.name}
                        className="hover-elevate active-elevate-2 transition-all cursor-pointer group"
                        onClick={() => navigateToCategory(category.name)}
                        data-testid={`card-category-${category.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <CardHeader className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                                  {category.name}
                                </CardTitle>
                              </div>
                              <CardDescription className="text-sm mb-3">
                                {category.count} {category.count === 1 ? 'article' : 'articles'} available
                              </CardDescription>
                              {category.popularArticle && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  Popular: {category.popularArticle.title}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="secondary" className="text-sm font-semibold">
                                {category.count}
                              </Badge>
                              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {articles.length > 0 && (
                <section>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-6 w-6 text-primary" />
                      <h2 className="text-2xl font-semibold">All Articles</h2>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {articles.length} total
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {articles.slice(0, 10).map((article) => (
                      <Card
                        key={article.id}
                        className="hover-elevate active-elevate-2 transition-all cursor-pointer group"
                        onClick={() => setSelectedArticle(article)}
                        data-testid={`card-article-${article.id}`}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors mb-1">
                                {article.title}
                              </CardTitle>
                              <div className="flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="text-xs">
                                  {article.category}
                                </Badge>
                                {article.tags?.slice(0, 2).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                    {articles.length > 10 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        Browse categories above to see all {articles.length} articles
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {selectedArticle && (
          <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-2xl mb-3" data-testid="title-article-view">
                      {(fullArticle || selectedArticle).title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{(fullArticle || selectedArticle).category}</Badge>
                      {(fullArticle || selectedArticle).tags?.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
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
            </DialogContent>
          </Dialog>
        )}

        <ChatWidget className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 !max-w-[min(28rem,calc(100vw-2rem))] max-h-[80vh]" />
      </div>
    </CustomerPortalLayout>
  );
}
