import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DOMPurify from "isomorphic-dompurify";
import { 
  ArrowLeft, FileText, Printer, Eye, Clock, 
  ThumbsUp, ThumbsDown, Loader2, CheckCircle2, BookOpen,
  Download, FileIcon
} from "lucide-react";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ChatWidget from "@/components/ChatWidget";
import DocumentViewer from "@/components/DocumentViewer";
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
  sourceType?: string;
  fileName?: string;
  fileType?: string;
  hasFile?: boolean;
}

interface FormattedStep {
  number: number;
  title: string;
  content: string;
}

function cleanDocumentMetadata(content: string): string {
  let cleaned = content;
  
  cleaned = cleaned.replace(/^#\s*[^\n]+_\d{10,}\.(docx?|pdf|txt)\s*\n*/im, '');
  
  cleaned = cleaned.replace(/\*\*File Type:\*\*\s*[^\n*]+\s*\n*/gi, '');
  cleaned = cleaned.replace(/\*\*File Size:\*\*\s*[\d.]+\s*(KB|MB|GB|bytes?)\s*\n*/gi, '');
  cleaned = cleaned.replace(/\*\*Word Count:\*\*\s*\d+\s*\n*/gi, '');
  cleaned = cleaned.replace(/application\/vnd\.openxmlformats-officedocument\.[^\s\n]+\s*\n*/gi, '');
  
  cleaned = cleaned.replace(/^---+\s*\n*/gm, '');
  
  cleaned = cleaned.replace(/_\d{10,}\.(docx?|pdf|txt)/gi, '');
  
  cleaned = cleaned.replace(/^(docx?|pdf|txt)\s*\n/gim, '');
  cleaned = cleaned.replace(/^(docx?|pdf|txt)\s*$/gim, '');
  
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/^[\s\n]+/, '');
  
  return cleaned.trim();
}

function convertMarkdownToHtml(text: string): string {
  let html = text;
  
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>');
  
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>');
  
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
  
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listType = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    
    if (numberedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        processedLines.push('<ol class="list-decimal list-inside space-y-2 my-3">');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li class="leading-relaxed">${numberedMatch[2]}</li>`);
    } else if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        processedLines.push('<ul class="list-disc list-inside space-y-2 my-3">');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li class="leading-relaxed">${bulletMatch[1]}</li>`);
    } else {
      if (inList) {
        processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false;
        listType = '';
      }
      
      if (line === '') {
        processedLines.push('<div class="h-3"></div>');
      } else if (!line.startsWith('<h')) {
        processedLines.push(`<p class="leading-relaxed mb-3">${line}</p>`);
      } else {
        processedLines.push(line);
      }
    }
  }
  
  if (inList) {
    processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
  }
  
  return processedLines.join('\n');
}

function formatPlainTextContent(content: string): string {
  let cleaned = cleanDocumentMetadata(content);
  
  if (cleaned.includes('<p>') || cleaned.includes('<div>') || cleaned.includes('<ol>') || cleaned.includes('<ul>')) {
    return cleaned;
  }
  
  const sentenceBreakPatterns = [
    /\.\s+(?=[A-Z])/g,
    /(?<=[.!?])\s*(?=Please\s)/gi,
    /(?<=[.!?])\s*(?=If\s)/gi,
    /(?<=[.!?])\s*(?=Check\s)/gi,
    /(?<=[.!?])\s*(?=Make\s)/gi,
    /(?<=[.!?])\s*(?=Click\s)/gi,
    /(?<=[.!?])\s*(?=Go\s)/gi,
    /(?<=[.!?])\s*(?=The\s)/gi,
    /(?<=[.!?])\s*(?=You\s)/gi,
    /(?<=[.!?])\s*(?=This\s)/gi,
  ];
  
  for (const pattern of sentenceBreakPatterns) {
    cleaned = cleaned.replace(pattern, '.\n\n');
  }
  
  cleaned = cleaned.replace(/:-\s*/g, ':\n\n');
  
  cleaned = cleaned.replace(/(\d+[.)]\s*)/g, '\n$1');
  
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return convertMarkdownToHtml(cleaned);
}

function parseContentIntoSteps(htmlContent: string): { intro: string; steps: FormattedStep[]; outro: string } {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const steps: FormattedStep[] = [];
  let intro = '';
  let outro = '';
  let currentStep: FormattedStep | null = null;
  let stepNumber = 0;
  let foundFirstStep = false;
  let afterLastStep = false;
  
  const stepPatterns = [
    /^(?:step\s*)?(\d+)[.:)\s-]+(.*)$/i,
    /^(\d+)\.\s+(.*)$/,
    /^•\s*(?:step\s*)?(\d+)[.:)\s-]*(.*)$/i,
  ];
  
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() || '';
      if (!text) return;
      
      for (const pattern of stepPatterns) {
        const match = text.match(pattern);
        if (match) {
          if (currentStep) {
            steps.push(currentStep);
          }
          foundFirstStep = true;
          afterLastStep = false;
          stepNumber++;
          currentStep = {
            number: stepNumber,
            title: match[2]?.trim() || `Step ${stepNumber}`,
            content: ''
          };
          return;
        }
      }
      
      if (currentStep) {
        currentStep.content += (currentStep.content ? ' ' : '') + text;
      } else if (!foundFirstStep) {
        intro += (intro ? ' ' : '') + text;
      } else {
        outro += (outro ? ' ' : '') + text;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();
      
      if (tagName === 'ol' || tagName === 'ul') {
        const items = el.querySelectorAll(':scope > li');
        items.forEach((li) => {
          if (currentStep) {
            steps.push(currentStep);
          }
          foundFirstStep = true;
          afterLastStep = false;
          stepNumber++;
          currentStep = {
            number: stepNumber,
            title: '',
            content: li.innerHTML
          };
        });
        if (currentStep) {
          steps.push(currentStep);
          currentStep = null;
          afterLastStep = true;
        }
        return;
      }
      
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        const headingText = el.textContent?.trim() || '';
        
        for (const pattern of stepPatterns) {
          const match = headingText.match(pattern);
          if (match) {
            if (currentStep) {
              steps.push(currentStep);
            }
            foundFirstStep = true;
            afterLastStep = false;
            stepNumber++;
            currentStep = {
              number: stepNumber,
              title: match[2]?.trim() || headingText,
              content: ''
            };
            return;
          }
        }
        
        if (/^step\s*\d*/i.test(headingText) || /^\d+\./.test(headingText)) {
          if (currentStep) {
            steps.push(currentStep);
          }
          foundFirstStep = true;
          afterLastStep = false;
          stepNumber++;
          currentStep = {
            number: stepNumber,
            title: headingText.replace(/^(?:step\s*)?\d+[.:)\s-]*/i, '').trim() || headingText,
            content: ''
          };
          return;
        }
      }
      
      if (tagName === 'p' || tagName === 'div') {
        const text = el.textContent?.trim() || '';
        for (const pattern of stepPatterns) {
          const match = text.match(pattern);
          if (match && text.indexOf(match[0]) === 0) {
            if (currentStep) {
              steps.push(currentStep);
            }
            foundFirstStep = true;
            afterLastStep = false;
            stepNumber++;
            const remainingContent = el.innerHTML.replace(/^[^>]*>?\s*(?:step\s*)?\d+[.:)\s-]*/i, '').trim();
            currentStep = {
              number: stepNumber,
              title: match[2]?.trim() || `Step ${stepNumber}`,
              content: remainingContent || ''
            };
            return;
          }
        }
      }
      
      if (currentStep) {
        if (['p', 'div', 'span', 'br'].includes(tagName)) {
          currentStep.content += (currentStep.content ? '<br/>' : '') + el.innerHTML;
        } else {
          currentStep.content += el.outerHTML;
        }
      } else if (!foundFirstStep) {
        intro += el.outerHTML;
      } else if (afterLastStep) {
        outro += el.outerHTML;
      } else {
        Array.from(node.childNodes).forEach(processNode);
      }
    }
  };
  
  Array.from(tempDiv.childNodes).forEach(processNode);
  
  if (currentStep) {
    steps.push(currentStep);
  }
  
  if (steps.length === 0) {
    return { intro: htmlContent, steps: [], outro: '' };
  }
  
  return { intro, steps, outro };
}

function ArticleContent({ content }: { content: string }) {
  const formattedContent = formatPlainTextContent(content);
  const { intro, steps, outro } = parseContentIntoSteps(formattedContent);
  
  if (steps.length === 0) {
    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedContent) }}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      {intro && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(intro) }}
        />
      )}
      
      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.number} className="overflow-hidden" data-testid={`step-${step.number}`}>
            <div className="flex">
              <div className="flex-shrink-0 w-14 sm:w-16 bg-primary/10 flex items-start justify-center pt-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {step.number}
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-primary/50" />
                </div>
              </div>
              <CardContent className="flex-1 p-4">
                {step.title && (
                  <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                )}
                {step.content && (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(step.content) }}
                  />
                )}
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
      
      {outro && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground mt-6"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(outro) }}
        />
      )}
    </div>
  );
}

export default function CustomerPortalArticlePage() {
  const [, params] = useRoute("/portal/articles/:id");
  const articleId = params?.id;
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null);

  const { data: article, isLoading, error } = useQuery<KnowledgeBaseArticle>({
    queryKey: ['/api/public/knowledge-base', articleId],
    enabled: !!articleId,
    queryFn: async () => {
      if (!articleId) throw new Error('No article ID');
      return apiRequest(`/api/public/knowledge-base/${articleId}`, 'GET');
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ articleId, helpful }: { articleId: string; helpful: boolean }) => {
      return apiRequest(`/api/public/knowledge-base/${articleId}/feedback`, 'POST', { helpful });
    },
    onSuccess: (_, variables) => {
      setFeedbackGiven(variables.helpful ? 'helpful' : 'not_helpful');
      queryClient.invalidateQueries({ queryKey: ['/api/public/knowledge-base'] });
    },
  });

  const handlePrint = () => {
    if (article) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const formattedDate = new Date(article.updatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        const cleanContent = article.content ? cleanDocumentMetadata(article.content) : '';
        const formattedContent = formatPlainTextContent(cleanContent);
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${article.title} - Nova AI Knowledge Base</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 40px;
                  line-height: 1.6;
                  color: #1a1a1a;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .header {
                  border-bottom: 2px solid #e5e5e5;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                }
                h1 { font-size: 28px; font-weight: 600; color: #111; margin-bottom: 16px; }
                .meta {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 16px;
                  font-size: 14px;
                  color: #666;
                }
                .meta-item { display: flex; align-items: center; gap: 6px; }
                .category {
                  background: #f0f0f0;
                  padding: 4px 12px;
                  border-radius: 4px;
                  font-weight: 500;
                  font-size: 13px;
                }
                .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
                .tag {
                  background: #e5e5e5;
                  padding: 2px 8px;
                  border-radius: 3px;
                  font-size: 12px;
                }
                .content { font-size: 16px; }
                .content h1, .content h2, .content h3 {
                  margin-top: 24px;
                  margin-bottom: 12px;
                  color: #111;
                }
                .content h1 { font-size: 24px; }
                .content h2 { font-size: 20px; }
                .content h3 { font-size: 18px; }
                .content p { margin-bottom: 16px; }
                .content ul, .content ol {
                  margin-bottom: 16px;
                  padding-left: 24px;
                }
                .content li { margin-bottom: 8px; }
                .content code {
                  background: #f5f5f5;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-family: "SF Mono", Menlo, monospace;
                  font-size: 14px;
                }
                .content pre {
                  background: #f5f5f5;
                  padding: 16px;
                  border-radius: 8px;
                  overflow-x: auto;
                  margin-bottom: 16px;
                }
                .content blockquote {
                  border-left: 4px solid #e5e5e5;
                  padding-left: 16px;
                  color: #666;
                  margin-bottom: 16px;
                }
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #e5e5e5;
                  font-size: 12px;
                  color: #999;
                  text-align: center;
                }
                @media print {
                  body { padding: 20px; }
                  .header { page-break-after: avoid; }
                  h1, h2, h3 { page-break-after: avoid; }
                  ul, ol, pre { page-break-inside: avoid; }
                }
                @page {
                  margin: 0.75in;
                  size: auto;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${article.title}</h1>
                <div class="meta">
                  <span class="meta-item"><span class="category">${article.category}</span></span>
                  <span class="meta-item">Updated: ${formattedDate}</span>
                  <span class="meta-item">Views: ${article.usageCount || 0}</span>
                </div>
                ${article.tags && article.tags.length > 0 ? `
                  <div class="tags">
                    ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
              <div class="content">${formattedContent}</div>
              <div class="footer">
                Printed from Nova AI Knowledge Base<br>
                ${window.location.origin}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }
    }
  };

  const handleFeedback = (helpful: boolean) => {
    if (!feedbackGiven && articleId) {
      feedbackMutation.mutate({ articleId, helpful });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getHelpfulnessScore = () => {
    if (!article) return null;
    const helpful = article.helpful || 0;
    const notHelpful = article.notHelpful || 0;
    const total = helpful + notHelpful;
    if (total === 0) return null;
    return Math.round((helpful / total) * 100);
  };

  return (
    <CustomerPortalLayout>
      <div className="min-h-screen">
        <div className="container max-w-4xl mx-auto px-4 py-6 sm:py-8">
          <Link href="/portal/knowledge-base">
            <Button variant="ghost" size="sm" className="mb-6 gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Knowledge Base
            </Button>
          </Link>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error || !article ? (
            <Card className="py-12">
              <CardContent className="text-center space-y-4">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Article Not Found</h3>
                  <p className="text-muted-foreground">
                    The article you're looking for doesn't exist or has been removed.
                  </p>
                </div>
                <Link href="/portal/knowledge-base">
                  <Button variant="outline">Browse Knowledge Base</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold" data-testid="title-article">
                        {article.title}
                      </h1>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="gap-2 flex-shrink-0"
                    data-testid="button-print"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{article.category}</Badge>
                  {article.tags?.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Updated {formatDate(article.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{article.usageCount || 0} views</span>
                  </div>
                  {getHelpfulnessScore() !== null && (
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{getHelpfulnessScore()}% found helpful</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {article.hasFile && article.fileType?.includes('pdf') ? (
                <div className="py-4" data-testid="content-article">
                  <Tabs defaultValue="document" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="document" className="gap-2">
                        <FileIcon className="h-4 w-4" />
                        Original Document
                      </TabsTrigger>
                      <TabsTrigger value="text" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Text Version
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="document">
                      <DocumentViewer
                        fileUrl={`/api/public/knowledge-base/${article.id}/file`}
                        fileName={article.fileName}
                        fileType={article.fileType}
                      />
                    </TabsContent>
                    <TabsContent value="text">
                      <ArticleContent content={article.content || ''} />
                    </TabsContent>
                  </Tabs>
                </div>
              ) : article.hasFile ? (
                <div className="py-4" data-testid="content-article">
                  <Card className="mb-4 bg-muted/30">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <FileIcon className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium">{article.fileName || 'Original Document'}</p>
                            <p className="text-sm text-muted-foreground">
                              Download the original document for the best viewing experience
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `/api/public/knowledge-base/${article.id}/file`;
                            link.download = article.fileName || 'document';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download Original
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <ArticleContent content={article.content || ''} />
                </div>
              ) : (
                <div className="py-4" data-testid="content-article">
                  <ArticleContent content={article.content || ''} />
                </div>
              )}

              <Separator />

              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">Was this article helpful?</p>
                      <p className="text-sm text-muted-foreground">
                        Your feedback helps us improve our documentation
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {feedbackGiven ? (
                        <Badge variant="outline" className="gap-2 py-2 px-4">
                          {feedbackGiven === 'helpful' ? (
                            <><ThumbsUp className="h-4 w-4 text-green-600" /> Thanks for your feedback!</>
                          ) : (
                            <><ThumbsDown className="h-4 w-4 text-amber-600" /> Thanks for your feedback!</>
                          )}
                        </Badge>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleFeedback(true)}
                            disabled={feedbackMutation.isPending}
                            data-testid="button-helpful"
                          >
                            <ThumbsUp className="h-4 w-4" />
                            Yes, helpful
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleFeedback(false)}
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
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <ChatWidget className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 !max-w-[min(28rem,calc(100vw-2rem))] max-h-[80vh]" />
      </div>
    </CustomerPortalLayout>
  );
}
