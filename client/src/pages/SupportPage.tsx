import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, FileText, BookOpen, Sparkles, HelpCircle, ExternalLink } from "lucide-react";
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

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all enabled articles
  const { data: articles = [], isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ['/api/public/knowledge-base'],
    queryFn: async () => {
      return apiRequest('/api/public/knowledge-base', 'GET');
    },
  });

  // Filter articles by search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    
    const query = searchQuery.toLowerCase();
    return articles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query) ||
      article.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      article.content?.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  // Group articles by category
  const articlesByCategory = useMemo(() => {
    const grouped: Record<string, KnowledgeBaseArticle[]> = {};
    
    filteredArticles.forEach(article => {
      if (!grouped[article.category]) {
        grouped[article.category] = [];
      }
      grouped[article.category].push(article);
    });
    
    // Sort articles within each category alphabetically
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.title.localeCompare(b.title));
    });
    
    return grouped;
  }, [filteredArticles]);

  // Get sorted categories
  const categories = useMemo(() => {
    return Object.keys(articlesByCategory).sort();
  }, [articlesByCategory]);


  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Search */}
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

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search articles, categories, or topics..."
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

      {/* Main Content */}
      <div className="container max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading knowledge base...</p>
            </div>
          </div>
        ) : filteredArticles.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {searchQuery ? 'No results found' : 'No articles available'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? 'Try adjusting your search terms or browse all categories'
                    : 'Check back later for helpful articles and guides'}
                </p>
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  data-testid="button-clear-search-empty"
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Results Summary */}
            {searchQuery && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                <span>
                  Found <strong className="text-foreground">{filteredArticles.length}</strong> {filteredArticles.length === 1 ? 'article' : 'articles'} matching "{searchQuery}"
                </span>
              </div>
            )}

            {/* Category Overview Cards */}
            {!searchQuery && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  Browse by Category
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                  {categories.map((category) => {
                    const articleCount = articlesByCategory[category].length;
                    return (
                      <Card key={category} className="hover-elevate transition-all cursor-pointer group" onClick={() => {
                        const element = document.getElementById(`category-${category}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <Badge variant="secondary" className="ml-auto">
                              {articleCount}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {category}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {articleCount} {articleCount === 1 ? 'article' : 'articles'}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Articles by Category - Accordion */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                {searchQuery ? 'Search Results' : 'All Articles'}
              </h2>

              <Accordion type="multiple" defaultValue={searchQuery ? categories : [categories[0]]} className="space-y-4">
                {categories.map((category) => (
                  <AccordionItem
                    key={category}
                    value={category}
                    id={`category-${category}`}
                    className="border rounded-lg overflow-hidden"
                    data-testid={`accordion-category-${category}`}
                  >
                    <AccordionTrigger className="px-6 py-4 hover:bg-accent/50 data-[state=open]:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3 text-left">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="font-semibold text-lg">{category}</span>
                        <Badge variant="outline" className="ml-2">
                          {articlesByCategory[category].length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="grid gap-3 pt-2">
                        {articlesByCategory[category].map((article) => (
                          <a
                            key={article.id}
                            href={`/kb/${article.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                            data-testid={`link-article-${article.id}`}
                          >
                            <Card className="hover-elevate active-elevate-2 transition-all group">
                              <CardHeader className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                                        {article.title}
                                      </CardTitle>
                                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
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
                                      <Sparkles className="h-3 w-3" />
                                      Popular
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>
                            </Card>
                          </a>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        )}
      </div>

      {/* Floating Support Chat Widget */}
      <ChatWidget className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 !max-w-[min(28rem,calc(100vw-2rem))] max-h-[80vh]" />
    </div>
  );
}
