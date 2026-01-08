import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, BookOpen, HelpCircle, ExternalLink, Search, FolderOpen, Star, Printer, TrendingUp, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ChatWidget from "@/components/ChatWidget";

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
}

export default function KnowledgeCategoryPage() {
  const [, setLocation] = useLocation();
  
  // Extract category from URL path since we're not using Route component
  const categoryName = (() => {
    const path = window.location.pathname;
    const match = path.match(/\/knowledge-base\/category\/(.+)$/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return "";
  })();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);

  const { data: articles = [], isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ['/api/public/knowledge-base'],
    queryFn: async () => {
      return apiRequest('/api/public/knowledge-base', 'GET');
    },
  });

  // Fetch full article content when one is selected
  const { data: fullArticle, isLoading: isLoadingArticle } = useQuery<KnowledgeBaseArticle>({
    queryKey: ['/api/public/knowledge-base', selectedArticle?.id],
    queryFn: async () => {
      if (!selectedArticle?.id) return null;
      return apiRequest(`/api/public/knowledge-base/${selectedArticle.id}`, 'GET');
    },
    enabled: !!selectedArticle?.id,
  });

  const categoryArticles = useMemo(() => {
    return articles
      .filter(article => article.category.toLowerCase() === categoryName.toLowerCase())
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [articles, categoryName]);

  const filteredCategoryArticles = useMemo(() => {
    if (!searchQuery.trim()) return categoryArticles;
    
    const query = searchQuery.toLowerCase();
    return categoryArticles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      article.content?.toLowerCase().includes(query)
    );
  }, [categoryArticles, searchQuery]);

  const otherCategoryResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return articles
      .filter(article => 
        article.category.toLowerCase() !== categoryName.toLowerCase() &&
        (article.title.toLowerCase().includes(query) ||
         article.category.toLowerCase().includes(query) ||
         article.tags?.some(tag => tag.toLowerCase().includes(query)) ||
         article.content?.toLowerCase().includes(query))
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [articles, categoryName, searchQuery]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach(a => cats.add(a.category));
    return Array.from(cats).sort();
  }, [articles]);

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

  const isSearching = searchQuery.trim().length > 0;
  const totalResults = filteredCategoryArticles.length + otherCategoryResults.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-primary/5 via-primary/3 to-background border-b">
        <div className="container max-w-5xl mx-auto px-4 py-8 sm:py-12">
          <Button
            variant="ghost"
            className="mb-6 gap-2"
            onClick={() => setLocation('/knowledge-base')}
            data-testid="button-back-to-kb"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <FolderOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="title-category">
              {categoryName}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            {isLoading ? "Loading..." : `${categoryArticles.length} ${categoryArticles.length === 1 ? 'article' : 'articles'} in this category`}
          </p>

          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search in ${categoryName} or all categories...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-12 text-base bg-background shadow-sm"
              data-testid="input-search-category"
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
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {isSearching && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                <span>
                  Found <strong className="text-foreground">{totalResults}</strong> {totalResults === 1 ? 'article' : 'articles'} matching "{searchQuery}"
                </span>
              </div>
            )}

            {filteredCategoryArticles.length === 0 && !isSearching ? (
              <Card className="py-12">
                <CardContent className="text-center space-y-4">
                  <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                    <p className="text-muted-foreground">
                      There are no articles in this category yet.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/knowledge-base')}
                    data-testid="button-browse-all"
                  >
                    Browse All Categories
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <section>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {isSearching ? `Results in ${categoryName}` : 'Articles in this category'}
                    </h2>
                    <Badge variant="outline">
                      {filteredCategoryArticles.length}
                    </Badge>
                  </div>

                  {filteredCategoryArticles.length === 0 ? (
                    <Card className="py-8">
                      <CardContent className="text-center text-muted-foreground">
                        No matching articles in this category
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-3">
                      {filteredCategoryArticles.map((article) => (
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
                                <div className="flex items-center gap-2 mb-1">
                                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                                    {article.title}
                                  </CardTitle>
                                </div>
                                {article.tags && article.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {article.tags.map((tag, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {article.usageCount && article.usageCount > 10 && (
                                <Badge variant="outline" className="gap-1 flex-shrink-0">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  Popular
                                </Badge>
                              )}
                              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>

                {isSearching && otherCategoryResults.length > 0 && (
                  <>
                    <Separator />
                    <section>
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          Results from other categories
                        </h2>
                        <Badge variant="outline">
                          {otherCategoryResults.length}
                        </Badge>
                      </div>
                      <div className="grid gap-3">
                        {otherCategoryResults.map((article) => (
                          <Card
                            key={article.id}
                            className="hover-elevate active-elevate-2 transition-all cursor-pointer group"
                            onClick={() => setSelectedArticle(article)}
                            data-testid={`card-other-article-${article.id}`}
                          >
                            <CardHeader className="p-4">
                              <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                                      {article.title}
                                    </CardTitle>
                                  </div>
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
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {!isSearching && allCategories.length > 1 && (
                  <>
                    <Separator />
                    <section>
                      <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        Other Categories
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {allCategories
                          .filter(cat => cat.toLowerCase() !== categoryName.toLowerCase())
                          .map((cat) => (
                            <Button
                              key={cat}
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/knowledge-base/category/${encodeURIComponent(cat)}`)}
                              className="gap-2"
                              data-testid={`button-category-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                            >
                              <FileText className="h-4 w-4" />
                              {cat}
                            </Button>
                          ))}
                      </div>
                    </section>
                  </>
                )}
              </>
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
  );
}
