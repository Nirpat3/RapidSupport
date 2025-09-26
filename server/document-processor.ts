import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { createRequire } from 'module';

// Create require for ES modules
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

interface PDFData {
  numpages: number;
  numrender: number;
  info: Record<string, any>;
  metadata: Record<string, any>;
  text: string;
  version: string;
}

export interface DocumentContent {
  text: string;
  title?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    fileSize: number;
    fileName: string;
    mimeType: string;
  };
}

export class DocumentProcessor {
  /**
   * Extract text content from various document types
   */
  static async extractText(filePath: string, originalName: string, mimeType: string): Promise<DocumentContent> {
    const fileSize = fs.statSync(filePath).size;
    
    try {
      switch (mimeType) {
        case 'text/plain':
          return await this.extractTextFromPlainText(filePath, originalName, fileSize);
        
        case 'application/pdf':
          return await this.extractTextFromPDF(filePath, originalName, fileSize);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractTextFromWord(filePath, originalName, fileSize);
        
        case 'application/msword':
          throw new Error('Legacy .doc files are not supported. Please convert to .docx format.');
        
        default:
          throw new Error(`Unsupported document type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`Error extracting text from ${originalName}:`, error);
      throw error; // Propagate error instead of returning fallback content
    }
  }

  /**
   * Extract text from plain text files
   */
  private static async extractTextFromPlainText(filePath: string, originalName: string, fileSize: number): Promise<DocumentContent> {
    const text = fs.readFileSync(filePath, 'utf-8');
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    return {
      text: text.trim(),
      title: path.basename(originalName, path.extname(originalName)),
      metadata: {
        fileSize,
        fileName: originalName,
        mimeType: 'text/plain',
        wordCount,
      }
    };
  }

  /**
   * Extract text from PDF files using pdf-parse
   */
  private static async extractTextFromPDF(filePath: string, originalName: string, fileSize: number): Promise<DocumentContent> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF contains no extractable text (might be image-based)');
    }
    
    const wordCount = data.text.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    // Clean up the extracted text while preserving structure
    const cleanText = data.text
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace
      .replace(/\n\s*\n\s*\n+/g, '\n\n'); // Collapse 3+ newlines to 2, preserve single newlines
    
    return {
      text: cleanText,
      title: path.basename(originalName, '.pdf'),
      metadata: {
        pageCount: data.numpages,
        fileSize,
        fileName: originalName,
        mimeType: 'application/pdf',
        wordCount,
      }
    };
  }

  /**
   * Extract text from Word documents using mammoth
   */
  private static async extractTextFromWord(filePath: string, originalName: string, fileSize: number): Promise<DocumentContent> {
    const result = await mammoth.extractRawText({ path: filePath });
    
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('Word document contains no extractable text');
    }
    
    const wordCount = result.value.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    // Log any warnings from mammoth
    if (result.messages && result.messages.length > 0) {
      console.warn(`Mammoth warnings for ${originalName}:`, result.messages);
    }
    
    return {
      text: result.value.trim(),
      title: path.basename(originalName, path.extname(originalName)),
      metadata: {
        fileSize,
        fileName: originalName,
        mimeType: originalName.endsWith('.docx') 
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/msword',
        wordCount,
      }
    };
  }

  /**
   * Format extracted content for knowledge base
   */
  static formatForKnowledgeBase(content: DocumentContent): string {
    const { text, metadata } = content;
    
    if (!metadata) {
      return text;
    }
    
    const header = [
      `# ${metadata.fileName}`,
      '',
      `**File Type:** ${metadata.mimeType}`,
      `**File Size:** ${(metadata.fileSize / 1024).toFixed(1)} KB`,
    ];
    
    if (metadata.pageCount) {
      header.push(`**Pages:** ${metadata.pageCount}`);
    }
    
    if (metadata.wordCount) {
      header.push(`**Word Count:** ${metadata.wordCount.toLocaleString()}`);
    }
    
    header.push('', '---', '');
    
    return header.join('\n') + text;
  }

  /**
   * Validate document before processing
   */
  static validateDocument(filePath: string, mimeType: string, maxSizeBytes: number = 10 * 1024 * 1024): void {
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist');
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('File is empty');
    }
    
    if (stats.size > maxSizeBytes) {
      throw new Error(`File size exceeds limit of ${maxSizeBytes / 1024 / 1024}MB`);
    }
    
    const supportedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }
  }
}