import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, FileText, BookOpen, Tag, Filter, X, Printer, ChevronRight, TrendingUp, Sparkles, LayoutList, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";
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

export default function CustomerPortalKnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'category'>('list');

  // Fetch all articles
  const { data: articles = [], isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ['/api/public/knowledge-base', selectedCategory, selectedTag],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedTag) params.append('tag', selectedTag);
      const url = `/api/public/knowledge-base${params.toString() ? `?${params.toString()}` : ''}`;
      return apiRequest(url, 'GET');
    },
  });

  // Fetch full article content when selected
  const { data: fullArticle } = useQuery<KnowledgeBaseArticle>({
    queryKey: ['/api/public/knowledge-base', selectedArticle?.id],
    enabled: !!selectedArticle?.id,
    queryFn: async () => {
      if (!selectedArticle?.id) throw new Error('No article selected');
      return apiRequest(`/api/public/knowledge-base/${selectedArticle.id}`, 'GET');
    },
  });

  // Get unique categories and tags for filtering
  const { categories, allTags } = useMemo(() => {
    const categoriesSet = new Set<string>();
    const tagsSet = new Set<string>();
    
    articles.forEach(article => {
      categoriesSet.add(article.category);
      article.tags?.forEach(tag => tagsSet.add(tag));
    });
    
    return {
      categories: Array.from(categoriesSet).sort(),
      allTags: Array.from(tagsSet).sort()
    };
  }, [articles]);

  // Filter and sort articles by search query and usage count
  const filteredArticles = useMemo(() => {
    let filtered = articles;
    
    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = articles.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query) ||
        article.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Clone array before sorting to avoid mutating React Query cache
    const sorted = [...filtered];
    
    // Sort by usageCount (most used first), then by title
    sorted.sort((a, b) => {
      const usageA = a.usageCount || 0;
      const usageB = b.usageCount || 0;
      if (usageB !== usageA) {
        return usageB - usageA; // Descending by usage
      }
      return a.title.localeCompare(b.title); // Alphabetical as tiebreaker
    });
    
    return sorted;
  }, [articles, searchQuery, selectedCategory, selectedTag]);

  // Group articles by category for category view
  const articlesByCategory = useMemo(() => {
    const grouped: Record<string, KnowledgeBaseArticle[]> = {};
    
    filteredArticles.forEach(article => {
      if (!grouped[article.category]) {
        grouped[article.category] = [];
      }
      grouped[article.category].push(article);
    });
    
    return grouped;
  }, [filteredArticles]);

  const handlePrint = () => {
    if (fullArticle) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fullArticle.title}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                h1 { color: #333; margin-bottom: 10px; }
                .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                .content { line-height: 1.6; }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              <h1>${fullArticle.title}</h1>
              <div class="meta">
                <strong>Category:</strong> ${fullArticle.category}
                ${fullArticle.tags?.length ? `<br><strong>Tags:</strong> ${fullArticle.tags.join(', ')}` : ''}
              </div>
              <div class="content">${fullArticle.content}</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTag(null);
    setSearchQuery("");
  };

  return (
    <CustomerPortalLayout>
      {/* Hero Section with Dark Background */}
      <div className="bg-gradient-to-b from-muted/80 to-muted/40 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 max-w-4xl text-center">
          {/* Icon */}
          <div className="inline-flex h-16 w-16 sm:h-20 sm:w-20 bg-primary/10 rounded-2xl items-center justify-center mb-6">
            <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>
          
          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" data-testid="title-knowledge-base">
            Knowledge Base
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find answers, browse guides, and explore our comprehensive help center
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for articles, guides, and help..."
                className="pl-12 h-14 text-base shadow-sm"
                data-testid="input-search-articles"
              />
            </div>
          </div>

          {/* Filter and View Toggle Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4" />
              Filter by Category or Tag
              {(selectedCategory || selectedTag) && (
                <Badge variant="secondary" className="ml-1">
                  {(selectedCategory ? 1 : 0) + (selectedTag ? 1 : 0)}
                </Badge>
              )}
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-1 h-8"
                data-testid="button-view-list"
              >
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button
                variant={viewMode === 'category' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('category')}
                className="gap-1 h-8"
                data-testid="button-view-category"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Categories</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {/* Search and Filters Panel (moved below hero) */}
        <div className="mb-8 space-y-4">

          {/* Active Filters Display */}
          {(selectedCategory || selectedTag || searchQuery) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1">
                  Category: {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="ml-1 hover-elevate rounded-full"
                    data-testid="button-clear-category"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedTag && (
                <Badge variant="secondary" className="gap-1">
                  Tag: {selectedTag}
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="ml-1 hover-elevate rounded-full"
                    data-testid="button-clear-tag"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover-elevate rounded-full"
                    data-testid="button-clear-search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 text-xs"
                data-testid="button-clear-all-filters"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Filters Panel */}
          {showFilters && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Categories */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Categories
                    </h3>
                    <div className="space-y-2">
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover-elevate",
                              selectedCategory === category
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted"
                            )}
                            data-testid={`button-category-${category}`}
                          >
                            {category}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No categories available</p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {allTags.length > 0 ? (
                        allTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTag === tag ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer",
                              selectedTag !== tag && "hover-elevate"
                            )}
                            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                            data-testid={`badge-tag-${tag}`}
                          >
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No tags available</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Articles List or Category View */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading articles...</p>
            </div>
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">
                {searchQuery || selectedCategory || selectedTag 
                  ? "Search Results" 
                  : viewMode === 'category' ? 'Browse by Category' : "Popular Articles"}
              </h2>
              {!searchQuery && !selectedCategory && !selectedTag && viewMode === 'list' && (
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Frequently used by AI
                </Badge>
              )}
            </div>
            
            {/* List View */}
            {viewMode === 'list' && (
              <div className="grid gap-4">
                {filteredArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => setSelectedArticle(article)}
                    data-testid={`card-article-${article.id}`}
                  >
                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-2">{article.title}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{article.category}</Badge>
                          {article.usageCount && article.usageCount > 0 && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Sparkles className="h-3 w-3" />
                              {article.usageCount} {article.usageCount === 1 ? 'use' : 'uses'}
                            </Badge>
                          )}
                          {article.tags?.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {article.tags && article.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{article.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {/* Category View */}
            {viewMode === 'category' && (
              <Accordion type="multiple" className="space-y-4" defaultValue={Object.keys(articlesByCategory)}>
                {Object.entries(articlesByCategory).map(([category, categoryArticles]) => (
                  <AccordionItem 
                    key={category} 
                    value={category}
                    className="border rounded-lg px-4"
                    data-testid={`accordion-category-${category}`}
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-semibold text-lg">{category}</span>
                          <Badge variant="secondary" className="ml-2">
                            {categoryArticles.length} {categoryArticles.length === 1 ? 'article' : 'articles'}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <div className="space-y-2">
                        {categoryArticles.map((article) => (
                          <div
                            key={article.id}
                            onClick={() => setSelectedArticle(article)}
                            className="flex items-start gap-3 p-3 rounded-md hover-elevate cursor-pointer group"
                            data-testid={`category-article-${article.id}`}
                          >
                            <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium mb-1 group-hover:text-primary transition-colors">
                                {article.title}
                              </h4>
                              <div className="flex items-center gap-2 flex-wrap">
                                {article.usageCount && article.usageCount > 0 && (
                                  <Badge variant="secondary" className="gap-1 text-xs">
                                    <Sparkles className="h-3 w-3" />
                                    {article.usageCount} {article.usageCount === 1 ? 'use' : 'uses'}
                                  </Badge>
                                )}
                                {article.tags?.slice(0, 2).map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {article.tags && article.tags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{article.tags.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No articles found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory || selectedTag
                  ? "Try adjusting your filters or search query"
                  : "No articles are currently available"}
              </p>
              {(searchQuery || selectedCategory || selectedTag) && (
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                  Clear filters
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Article View Dialog */}
        {selectedArticle && fullArticle && (
          <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-2xl mb-3" data-testid="title-article-view">
                      {fullArticle.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{fullArticle.category}</Badge>
                      {fullArticle.tags?.map((tag, idx) => (
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
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: fullArticle.content || '' }}
                  data-testid="content-article-view"
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}

        {/* Floating Support Chat Widget - Responsive positioning */}
        <ChatWidget className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 !max-w-[min(28rem,calc(100vw-2rem))] max-h-[80vh]" />
      </div>
    </CustomerPortalLayout>
  );
}
