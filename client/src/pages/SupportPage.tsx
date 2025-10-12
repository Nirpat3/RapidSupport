import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, ExternalLink, BookOpen, MessageCircleQuestion, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import ChatWidget from "@/components/ChatWidget";

interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
}

interface SearchResult {
  response: string;
  sources: {
    id: string;
    title: string;
    category: string;
    relevanceScore: number;
  }[];
  confidence: number;
}

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);

  // Search query
  const { data: searchResult, isLoading: isSearching } = useQuery<SearchResult>({
    queryKey: ['/api/public/support/search', searchQuery],
    enabled: submitted && searchQuery.trim().length > 0,
    queryFn: async () => {
      const response = await apiRequest('/api/public/support/search', 'POST', {
        question: searchQuery,
      });
      return response;
    },
  });

  // Fetch full article when selected
  const { data: fullArticle } = useQuery<KnowledgeBaseArticle>({
    queryKey: ['/api/public/knowledge-base', selectedArticle?.id],
    enabled: !!selectedArticle?.id,
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSubmitted(true);
      setSelectedArticle(null);
    }
  };

  const suggestedSearches = [
    "How do I reset my password?",
    "What payment methods do you accept?",
    "How to upgrade my account?",
    "Cancellation policy",
  ];

  // Hero page - before search
  if (!submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-semibold" data-testid="title-support">Support Center</h1>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                How can we help you?
              </h2>
            </div>

            {/* Search Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Ask a question..."
                  className="pl-11 h-12 text-base rounded-lg"
                  data-testid="input-support-search"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="h-12 px-6 rounded-lg shrink-0"
                data-testid="button-ask-ai"
              >
                <MessageCircleQuestion className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ask AI</span>
              </Button>
            </div>

            {/* Suggested Searches */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedSearches.map((suggestion, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setSubmitted(true);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid={`button-suggestion-${idx}`}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Widget - Fixed position bottom-right */}
        <ChatWidget className="fixed bottom-6 right-6 z-50" />
      </div>
    );
  }

  // Results page - after search
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with search */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubmitted(false);
                setSearchQuery("");
                setSelectedArticle(null);
              }}
              data-testid="button-back"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Support
            </Button>
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Search..."
                  className="pl-10 h-10"
                  data-testid="input-search-header"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                size="sm"
                className="h-10 shrink-0"
                data-testid="button-ask-ai-header"
              >
                <MessageCircleQuestion className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">Ask AI</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Results */}
      <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {isSearching ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Searching knowledge base...</p>
            </div>
          </div>
        ) : searchResult ? (
          <div className="space-y-6">
            {/* AI Response */}
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">AI Answer</span>
                    {searchResult.confidence !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(searchResult.confidence)}% confidence
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-ai-response">
                    {searchResult.response}
                  </p>
                </div>
              </div>
            </Card>

            {/* Sources */}
            {searchResult.sources && searchResult.sources.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Related Articles</h3>
                <div className="grid gap-3">
                  {searchResult.sources.map((source) => (
                    <Card
                      key={source.id}
                      className="p-4 hover-elevate cursor-pointer"
                      onClick={() => setSelectedArticle({ id: source.id } as KnowledgeBaseArticle)}
                      data-testid={`card-source-${source.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1">{source.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {source.category}
                            </Badge>
                            {source.relevanceScore && (
                              <span className="text-xs text-muted-foreground">
                                {Math.round(source.relevanceScore * 100)}% relevant
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No results found. Try a different search.</p>
          </div>
        )}
      </div>

      {/* Article Modal/Drawer */}
      {selectedArticle && fullArticle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold" data-testid="title-article">{fullArticle.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{fullArticle.category}</Badge>
                  {fullArticle.tags?.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedArticle(null)}
                data-testid="button-close-article"
              >
                ✕
              </Button>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: fullArticle.content }}
                data-testid="content-article"
              />
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
}
