import { Printer, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallback, useRef } from 'react';

interface PrintDocumentProps {
  title: string;
  content: string;
  category?: string;
  author?: string;
  date?: string;
  className?: string;
}

export function PrintDocument({
  title,
  content,
  category,
  author,
  date,
  className,
}: PrintDocumentProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print this document');
      return;
    }

    const formattedDate = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 2px solid #e5e5e5;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 28px;
              font-weight: 600;
              color: #111;
              margin-bottom: 12px;
            }
            .meta {
              font-size: 14px;
              color: #666;
              display: flex;
              gap: 20px;
              flex-wrap: wrap;
            }
            .meta-item {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .category {
              background: #f0f0f0;
              padding: 4px 12px;
              border-radius: 4px;
              font-weight: 500;
            }
            .content {
              font-size: 16px;
            }
            .content h1, .content h2, .content h3 {
              margin-top: 24px;
              margin-bottom: 12px;
              color: #111;
            }
            .content h1 { font-size: 24px; }
            .content h2 { font-size: 20px; }
            .content h3 { font-size: 18px; }
            .content p {
              margin-bottom: 16px;
            }
            .content ul, .content ol {
              margin-bottom: 16px;
              padding-left: 24px;
            }
            .content li {
              margin-bottom: 8px;
            }
            .content code {
              background: #f5f5f5;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'SF Mono', Menlo, monospace;
              font-size: 14px;
            }
            .content pre {
              background: #f5f5f5;
              padding: 16px;
              border-radius: 8px;
              overflow-x: auto;
              margin-bottom: 16px;
            }
            .content pre code {
              background: none;
              padding: 0;
            }
            .content blockquote {
              border-left: 4px solid #e5e5e5;
              padding-left: 16px;
              color: #666;
              margin-bottom: 16px;
            }
            .content table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .content th, .content td {
              border: 1px solid #e5e5e5;
              padding: 12px;
              text-align: left;
            }
            .content th {
              background: #f5f5f5;
              font-weight: 600;
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
              body {
                padding: 20px;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${escapeHtml(title)}</h1>
            <div class="meta">
              ${category ? `<span class="meta-item"><span class="category">${escapeHtml(category)}</span></span>` : ''}
              ${author ? `<span class="meta-item">By: ${escapeHtml(author)}</span>` : ''}
              <span class="meta-item">Date: ${formattedDate}</span>
            </div>
          </div>
          <div class="content">
            ${formatContentForPrint(content)}
          </div>
          <div class="footer">
            Printed from Nova AI Knowledge Base
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [title, content, category, author, date]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className={className}
    >
      <Printer className="h-4 w-4 mr-2" />
      Print
    </Button>
  );
}

export function PrintButton({
  onClick,
  className,
  variant = 'outline',
  size = 'sm',
}: {
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={className}
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatContentForPrint(content: string): string {
  let formatted = content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
    .replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  if (!formatted.startsWith('<')) {
    formatted = '<p>' + formatted + '</p>';
  }

  return formatted;
}

export function usePrint() {
  const print = useCallback((options: {
    title: string;
    content: string;
    category?: string;
    author?: string;
  }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return false;
    }

    const date = new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${options.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 24px; margin-bottom: 20px; }
            .meta { color: #666; margin-bottom: 30px; }
            .content { font-size: 16px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(options.title)}</h1>
          <div class="meta">
            ${options.category ? `Category: ${escapeHtml(options.category)} | ` : ''}
            ${options.author ? `By: ${escapeHtml(options.author)} | ` : ''}
            ${date}
          </div>
          <div class="content">${formatContentForPrint(options.content)}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
    return true;
  }, []);

  return { print };
}
