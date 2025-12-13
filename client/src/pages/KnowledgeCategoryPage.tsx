import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, BookOpen, Sparkles, HelpCircle, ExternalLink } from "lucide-react";
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
  const params = useParams<{ category: string }>();
  const categoryName = params.category ? decodeURIComponent(params.category) : "";

  const { data: articles = [], isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ['/api/public/knowledge-base'],
    queryFn: async () => {
      return apiRequest('/api/public/knowledge-base', 'GET');
    },
  });

  const categoryArticles = useMemo(() => {
    return articles
      .filter(article => article.category.toLowerCase() === categoryName.toLowerCase())
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [articles, categoryName]);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-primary/5 via-primary/3 to-background border-b">
        <div className="container max-w-5xl mx-auto px-4 py-8 sm:py-12">
          <Link href="/knowledge-base">
            <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-to-kb">
              <ArrowLeft className="h-4 w-4" />
              Back to Knowledge Base
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="title-category">
              {categoryName}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            {isLoading ? "Loading..." : `${categoryArticles.length} ${categoryArticles.length === 1 ? 'article' : 'articles'} in this category`}
          </p>
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
        ) : categoryArticles.length === 0 ? (
          <Card className="py-12">
            <div className="text-center space-y-4">
              <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                <p className="text-muted-foreground">
                  There are no articles in this category yet.
                </p>
              </div>
              <Link href="/knowledge-base">
                <Button variant="outline" data-testid="button-browse-all">
                  Browse All Categories
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Articles
            </h2>

            <div className="grid gap-4">
              {categoryArticles.map((article) => (
                <a
                  key={article.id}
                  href={`/kb/${article.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  data-testid={`link-article-${article.id}`}
                >
                  <Card className="hover-elevate active-elevate-2 transition-all group">
                    <CardHeader className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
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
          </div>
        )}
      </div>

      <ChatWidget className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 !max-w-[min(28rem,calc(100vw-2rem))] max-h-[80vh]" />
    </div>
  );
}
