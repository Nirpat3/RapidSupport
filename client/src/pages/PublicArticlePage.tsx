import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, ArrowLeft, BookOpen, Tag } from "lucide-react";
import { format } from "date-fns";

interface PublicArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function PublicArticlePage() {
  const [, params] = useRoute("/kb/:id");
  const articleId = params?.id;

  const { data: article, isLoading, error } = useQuery<PublicArticle>({
    queryKey: [`/api/public/knowledge-base/${articleId}`],
    enabled: !!articleId,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-destructive opacity-50 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
              <p className="text-muted-foreground">
                The knowledge base article you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Print-only header */}
      <div className="hidden print:block p-8 border-b">
        <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Category: {article.category}</span>
          <span>•</span>
          <span>Updated: {format(new Date(article.updatedAt), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Screen-only navigation */}
      <div className="print:hidden border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2"
              data-testid="button-print"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadPDF}
              className="gap-2"
              data-testid="button-download-pdf"
            >
              <Download className="w-4 h-4" />
              Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 print:px-8">
        <article>
          {/* Screen-only header */}
          <header className="mb-8 print:hidden">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
              <Badge variant="secondary">{article.category}</Badge>
              {article.tags && article.tags.length > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {article.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
            <h1 className="text-4xl font-bold mb-4" data-testid="text-article-title">{article.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Last updated: {format(new Date(article.updatedAt), 'MMMM d, yyyy')}</span>
            </div>
          </header>

          {/* Article body */}
          <div className="prose prose-lg max-w-none" data-testid="text-article-content">
            <div className="whitespace-pre-wrap leading-relaxed">
              {article.content}
            </div>
          </div>

          {/* Tags (print version) */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="w-4 h-4" />
                <span>Tags:</span>
                <span>{article.tags.join(', ')}</span>
              </div>
            </div>
          )}
        </article>
      </main>

      {/* Print-only footer */}
      <div className="hidden print:block p-8 border-t mt-8">
        <p className="text-sm text-muted-foreground text-center">
          This article is from our Knowledge Base - {window.location.origin}/kb/{article.id}
        </p>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
    </div>
  );
}
