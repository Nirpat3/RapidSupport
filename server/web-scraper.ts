import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';
import * as dns from 'dns';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

/**
 * Web scraper module for extracting content from URLs for knowledge base import
 * Handles text extraction, metadata parsing, and content validation
 */

interface ScrapedContent {
  title: string;
  description: string;
  content: string;
  url: string;
  metadata: {
    wordCount: number;
    extractedAt: string;
    contentLength: number;
  };
}

interface ScraperOptions {
  maxLength?: number;
  timeout?: number;
  userAgent?: string;
}

export class WebScraper {
  private static readonly DEFAULT_OPTIONS: Required<ScraperOptions> = {
    maxLength: 50000, // 50KB max content
    timeout: 30000,   // 30 second timeout
    userAgent: 'SupportBoard-Bot/1.0 (+https://support-board.com/bot)'
  };

  /**
   * Check if an IP address is private or reserved
   */
  private static isPrivateOrReservedIP(ip: string): boolean {
    // IPv4 private and reserved ranges
    if (ip.match(/^127\./)) return true; // Loopback (127.0.0.0/8)
    if (ip.match(/^10\./)) return true; // Private class A (10.0.0.0/8)
    if (ip.match(/^192\.168\./)) return true; // Private class C (192.168.0.0/16)
    if (ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) return true; // Private class B (172.16.0.0/12)
    if (ip.match(/^169\.254\./)) return true; // Link-local (169.254.0.0/16)
    if (ip.match(/^224\./)) return true; // Multicast (224.0.0.0/4)
    if (ip.match(/^0\./)) return true; // This network (0.0.0.0/8)
    
    // Additional IPv4 reserved ranges
    if (ip.match(/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./)) return true; // CGNAT (100.64.0.0/10)
    if (ip.match(/^198\.(1[89])\./)) return true; // Benchmarking (198.18.0.0/15)
    if (ip.match(/^192\.0\.2\./)) return true; // TEST-NET-1 (192.0.2.0/24)
    if (ip.match(/^198\.51\.100\./)) return true; // TEST-NET-2 (198.51.100.0/24)
    if (ip.match(/^203\.0\.113\./)) return true; // TEST-NET-3 (203.0.113.0/24)
    if (ip.match(/^24[0-9]\./)) return true; // Class E (240.0.0.0/4)
    if (ip.match(/^25[0-5]\./)) return true; // Class E continued
    
    // IPv6 private/reserved ranges
    if (ip === '::1') return true; // Loopback
    if (ip.startsWith('fc00:')) return true; // Unique local (fc00::/7)
    if (ip.startsWith('fd00:')) return true; // Unique local continued
    if (ip.startsWith('fe80:')) return true; // Link-local (fe80::/10)
    if (ip.startsWith('ff00:')) return true; // Multicast (ff00::/8)
    if (ip.startsWith('::')) return true; // Special addresses
    if (ip.startsWith('2001:db8:')) return true; // Documentation (2001:db8::/32)
    if (ip.startsWith('2001:10:')) return true; // ORCHID (2001:10::/28)
    if (ip.startsWith('2001:20:')) return true; // ORCHIDv2 (2001:20::/28)
    
    return false;
  }

  /**
   * Resolve hostname to IP addresses and validate safety
   */
  private static async validateHostname(hostname: string): Promise<void> {
    let ipv4Success = false;
    let ipv6Success = false;
    
    // Try IPv4 resolution
    try {
      const ipv4Addresses = await resolve4(hostname);
      ipv4Success = true;
      for (const ip of ipv4Addresses) {
        if (this.isPrivateOrReservedIP(ip)) {
          throw new Error(`Hostname resolves to private/reserved IP: ${ip}`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('private/reserved')) {
        throw error;
      }
      // IPv4 resolution failed, continue to try IPv6
    }

    // Try IPv6 resolution
    try {
      const ipv6Addresses = await resolve6(hostname);
      ipv6Success = true;
      for (const ip of ipv6Addresses) {
        if (this.isPrivateOrReservedIP(ip)) {
          throw new Error(`Hostname resolves to private/reserved IP: ${ip}`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('private/reserved')) {
        throw error;
      }
      // IPv6 resolution failed
    }

    // Require at least one resolution to succeed
    if (!ipv4Success && !ipv6Success) {
      throw new Error(`Unable to resolve hostname: ${hostname}`);
    }
  }

  /**
   * Validate if URL is safe and accessible for scraping
   */
  static async validateUrl(url: string): Promise<void> {
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Block obvious local/private hostnames
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.localhost')
    ) {
      throw new Error('Local hostnames are not allowed');
    }

    // Check if hostname is an IP address directly
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      if (this.isPrivateOrReservedIP(hostname)) {
        throw new Error('Private/reserved IP addresses are not allowed');
      }
    } else {
      // Resolve hostname and validate IPs
      await this.validateHostname(hostname);
    }
  }

  /**
   * Extract text content from HTML
   */
  private static extractTextFromHtml(html: string): string {
    // Remove script and style elements completely
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML tags but preserve some structure
    let text = cleanHtml
      .replace(/<br\s*\/?>/gi, '\n')           // Convert <br> to newlines
      .replace(/<\/p>/gi, '\n\n')             // Convert </p> to double newlines
      .replace(/<\/div>/gi, '\n')             // Convert </div> to newlines
      .replace(/<\/h[1-6]>/gi, '\n\n')        // Convert heading closings to double newlines
      .replace(/<[^>]+>/g, ' ')               // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ')                // Convert &nbsp; to spaces
      .replace(/&amp;/g, '&')                 // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Clean up whitespace
    text = text
      .replace(/[ \t]+/g, ' ')                // Replace multiple spaces/tabs with single space
      .replace(/\n\s*\n\s*\n+/g, '\n\n')      // Collapse multiple newlines to double newlines
      .replace(/^\s+|\s+$/g, '')              // Trim leading/trailing whitespace
      .trim();

    return text;
  }

  /**
   * Extract title from HTML
   */
  private static extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1]
        .replace(/<[^>]+>/g, '') // Remove any HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    }
    return 'Untitled Page';
  }

  /**
   * Extract meta description from HTML
   */
  private static extractDescription(html: string): string {
    // Try meta description first
    const descMatch = html.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]*)['"]/i);
    if (descMatch && descMatch[1]) {
      return descMatch[1].trim();
    }

    // Try Open Graph description
    const ogDescMatch = html.match(/<meta[^>]*property=['"]og:description['"][^>]*content=['"]([^'"]*)['"]/i);
    if (ogDescMatch && ogDescMatch[1]) {
      return ogDescMatch[1].trim();
    }

    // Try Twitter description
    const twitterDescMatch = html.match(/<meta[^>]*name=['"]twitter:description['"][^>]*content=['"]([^'"]*)['"]/i);
    if (twitterDescMatch && twitterDescMatch[1]) {
      return twitterDescMatch[1].trim();
    }

    return 'No description available';
  }

  /**
   * Scrape content from a URL
   */
  static async scrapeUrl(url: string, options: ScraperOptions = {}): Promise<ScrapedContent> {
    const opts = { 
      ...this.DEFAULT_OPTIONS, 
      ...options,
      maxLength: Math.max(options.maxLength || this.DEFAULT_OPTIONS.maxLength, 2000000) // Increase to 2MB
    };
    
    // Validate URL first (now async)
    await this.validateUrl(url);

    try {
      console.log(`Starting web scraping for: ${url}`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

      // Fetch the URL content with limited redirects
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': opts.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'manual', // Handle redirects manually for security
      });

      clearTimeout(timeoutId);

      // Handle redirects manually (up to 5 redirects)
      let finalResponse = response;
      let redirectCount = 0;
      let currentUrl = url;
      const maxRedirects = 5;

      // Original request headers
      const originalHeaders = {
        'User-Agent': opts.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      };

      while ((finalResponse.status === 301 || finalResponse.status === 302 || finalResponse.status === 307 || finalResponse.status === 308) && redirectCount < maxRedirects) {
        const location = finalResponse.headers.get('location');
        if (!location) {
          throw new Error('Redirect location header missing');
        }

        // Resolve relative URLs against current URL
        const redirectUrl = new URL(location, currentUrl).toString();
        
        // Validate redirect URL
        await this.validateUrl(redirectUrl);
        
        console.log(`Following redirect ${redirectCount + 1}: ${redirectUrl}`);
        
        const redirectController = new AbortController();
        const redirectTimeoutId = setTimeout(() => redirectController.abort(), opts.timeout);
        
        finalResponse = await fetch(redirectUrl, {
          signal: redirectController.signal,
          headers: originalHeaders, // Use original request headers, NOT response headers
          redirect: 'manual',
        });
        
        clearTimeout(redirectTimeoutId);
        currentUrl = redirectUrl; // Update base URL for next redirect
        redirectCount++;
      }

      if (!finalResponse.ok) {
        throw new Error(`HTTP ${finalResponse.status}: ${finalResponse.statusText}`);
      }

      // Check content type
      const contentType = finalResponse.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new Error(`Unsupported content type: ${contentType}. Only HTML content is supported.`);
      }

      // Check content length before reading
      const contentLength = finalResponse.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > opts.maxLength) {
        throw new Error(`Content too large: ${contentLength} bytes (max: ${opts.maxLength})`);
      }

      // Stream the response with size limit
      const reader = finalResponse.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];
      let totalSize = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          totalSize += value.length;
          if (totalSize > opts.maxLength) {
            throw new Error(`Content too large: exceeded ${opts.maxLength} bytes during streaming`);
          }

          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Combine chunks and decode
      const fullBuffer = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      const html = new TextDecoder('utf-8').decode(fullBuffer);

      // Extract information
      const title = this.extractTitle(html);
      const description = this.extractDescription(html);
      const content = this.extractTextFromHtml(html);

      if (!content || content.length < 50) {
        throw new Error('No meaningful content found on the page');
      }

      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      console.log(`Successfully scraped ${url}: ${wordCount} words extracted`);

      return {
        title,
        description,
        content,
        url,
        metadata: {
          wordCount,
          extractedAt: new Date().toISOString(),
          contentLength: content.length,
        }
      };
    } catch (error) {
      console.error(`Web scraping failed for ${url}:`, error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout: ${url} took longer than ${opts.timeout}ms to respond`);
        }
        throw error;
      }
      
      throw new Error(`Failed to scrape URL: ${error}`);
    }
  }

  /**
   * Format scraped content for knowledge base storage
   */
  static formatForKnowledgeBase(scrapedContent: ScrapedContent): string {
    const { title, description, content, url, metadata } = scrapedContent;
    
    return `# ${title}

**Source:** ${url}
**Description:** ${description}
**Scraped:** ${new Date(metadata.extractedAt).toLocaleDateString()}
**Word Count:** ${metadata.wordCount}

---

${content}

---
*This content was automatically extracted from ${url} on ${new Date(metadata.extractedAt).toLocaleDateString()}*`;
  }
}