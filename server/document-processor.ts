import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { createRequire } from 'module';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

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

export interface ExtractedImage {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
  description: string;
  displayOrder: number;
  width?: number;
  height?: number;
}

export interface ImageExtractionResult {
  images: ExtractedImage[];
  imageCount: number;
  totalSize: number;
}

export class DocumentProcessor {
  /**
   * Extract text content from various document types
   */
  static async extractText(filePath: string, originalName: string, mimeType: string): Promise<DocumentContent> {
    const fileSize = fs.statSync(filePath).size;
    const ext = originalName.toLowerCase().split('.').pop();
    
    try {
      // Check by extension first as browsers may report inconsistent MIME types
      if (ext === 'txt') {
        return await this.extractTextFromPlainText(filePath, originalName, fileSize);
      }
      
      if (ext === 'pdf') {
        return await this.extractTextFromPDF(filePath, originalName, fileSize);
      }
      
      if (ext === 'docx') {
        return await this.extractTextFromWord(filePath, originalName, fileSize);
      }
      
      if (ext === 'doc') {
        throw new Error('Legacy .doc files are not supported. Please convert to .docx format.');
      }
      
      // Fall back to MIME type if extension doesn't match known types
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
          throw new Error(`Unsupported document type: ${mimeType} (extension: ${ext})`);
      }
    } catch (error) {
      console.error(`Error extracting text from ${originalName}:`, error);
      throw error; // Propagate error instead of returning fallback content
    }
  }

  /**
   * Extract images from documents (PDF or DOCX)
   */
  static async extractImages(filePath: string, originalName: string, mimeType: string, knowledgeBaseId: string): Promise<ImageExtractionResult> {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractImagesFromPDF(filePath, knowledgeBaseId);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractImagesFromWord(filePath, knowledgeBaseId);
        
        default:
          console.log(`Image extraction not supported for type: ${mimeType}`);
          return { images: [], imageCount: 0, totalSize: 0 };
      }
    } catch (error) {
      console.error(`Error extracting images from ${originalName}:`, error);
      return { images: [], imageCount: 0, totalSize: 0 };
    }
  }

  /**
   * Extract images from PDF files using pdf-lib
   */
  private static async extractImagesFromPDF(filePath: string, knowledgeBaseId: string): Promise<ImageExtractionResult> {
    const images: ExtractedImage[] = [];
    let totalSize = 0;
    
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      
      // Create output directory
      const outputDir = this.ensureImageDirectory(knowledgeBaseId);
      
      // Get all pages
      const pages = pdfDoc.getPages();
      let imageIndex = 0;
      
      // Iterate through pages looking for embedded images
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        
        // Access the page's resources to find embedded images
        // pdf-lib doesn't have direct image extraction, so we look at raw objects
        const resources = page.node.Resources();
        
        if (resources) {
          const xObjects = resources.lookup(pdfDoc.context.obj('XObject'));
          
          if (xObjects && xObjects.dict) {
            const entries = xObjects.dict.entries();
            
            for (const [name, ref] of entries) {
              try {
                const xObject = pdfDoc.context.lookup(ref);
                
                if (xObject && xObject.dict) {
                  const subtype = xObject.dict.get(pdfDoc.context.obj('Subtype'));
                  
                  if (subtype && subtype.toString() === '/Image') {
                    // This is an image XObject
                    const width = xObject.dict.get(pdfDoc.context.obj('Width'));
                    const height = xObject.dict.get(pdfDoc.context.obj('Height'));
                    
                    // Get image data - this is complex for PDFs as images may be encoded
                    // For now, we'll note the image exists and create a placeholder description
                    const imgWidth = width ? parseInt(width.toString()) : 0;
                    const imgHeight = height ? parseInt(height.toString()) : 0;
                    
                    // Due to PDF complexity (filters, color spaces, etc.), 
                    // we log image presence but may not extract raw data easily
                    if (imgWidth > 50 && imgHeight > 50) { // Skip tiny images (likely icons)
                      console.log(`Found image in PDF: Page ${pageIndex + 1}, ${imgWidth}x${imgHeight}`);
                      imageIndex++;
                    }
                  }
                }
              } catch (e) {
                // Skip problematic objects
                continue;
              }
            }
          }
        }
      }
      
      // Note: pdf-lib doesn't have easy direct image extraction
      // For full PDF image extraction, consider using external tools like pdf2pic or pdf-image
      // For now, we log what we find and return empty array
      if (imageIndex > 0) {
        console.log(`PDF contains ${imageIndex} images, but pdf-lib doesn't support direct extraction.`);
        console.log(`Consider uploading individual images or using a dedicated PDF image extractor.`);
      }
      
    } catch (error) {
      console.error('Error extracting images from PDF:', error);
    }
    
    return { images, imageCount: images.length, totalSize };
  }

  /**
   * Extract images from Word documents using mammoth's image handler
   */
  private static async extractImagesFromWord(filePath: string, knowledgeBaseId: string): Promise<ImageExtractionResult> {
    const images: ExtractedImage[] = [];
    let totalSize = 0;
    let imageIndex = 0;
    
    // Create output directory
    const outputDir = this.ensureImageDirectory(knowledgeBaseId);
    
    try {
      // Use mammoth's convertToHtml with image handling
      const result = await mammoth.convertToHtml({
        path: filePath
      }, {
        convertImage: mammoth.images.imgElement(async (image: any) => {
          try {
            const imageBuffer = await image.read("base64");
            const contentType = image.contentType || 'image/png';
            
            // Determine file extension
            let extension = 'png';
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
              extension = 'jpg';
            } else if (contentType.includes('gif')) {
              extension = 'gif';
            } else if (contentType.includes('webp')) {
              extension = 'webp';
            }
            
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `image-${timestamp}-${imageIndex}.${extension}`;
            const outputPath = path.join(outputDir, filename);
            
            // Decode and save image
            const buffer = Buffer.from(imageBuffer, 'base64');
            
            // Get image dimensions using sharp
            let width: number | undefined;
            let height: number | undefined;
            let optimizedBuffer = buffer;
            
            try {
              const metadata = await sharp(buffer).metadata();
              width = metadata.width;
              height = metadata.height;
              
              // Skip very small images (likely icons or bullets)
              if (width && height && (width < 50 || height < 50)) {
                console.log(`Skipping small image: ${width}x${height}`);
                return { src: '' };
              }
              
              // Optimize image if it's large
              if (buffer.length > 500 * 1024) { // > 500KB
                optimizedBuffer = await sharp(buffer)
                  .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                  .jpeg({ quality: 85 })
                  .toBuffer();
              }
            } catch (e) {
              console.warn('Could not process image metadata:', e);
            }
            
            // Save image to disk
            fs.writeFileSync(outputPath, optimizedBuffer);
            
            const extractedImage: ExtractedImage = {
              filename,
              originalName: `Document Image ${imageIndex + 1}`,
              mimeType: contentType,
              size: optimizedBuffer.length,
              filePath: `/uploads/knowledge-base-images/${knowledgeBaseId}/${filename}`,
              description: `Image ${imageIndex + 1} from document`,
              displayOrder: imageIndex,
              width,
              height
            };
            
            images.push(extractedImage);
            totalSize += optimizedBuffer.length;
            imageIndex++;
            
            console.log(`Extracted image: ${filename} (${width}x${height}, ${(optimizedBuffer.length / 1024).toFixed(1)}KB)`);
            
            return { src: extractedImage.filePath };
          } catch (e) {
            console.error('Error processing image:', e);
            return { src: '' };
          }
        })
      });
      
      if (result.messages && result.messages.length > 0) {
        console.warn('Mammoth image extraction warnings:', result.messages);
      }
      
    } catch (error) {
      console.error('Error extracting images from Word document:', error);
    }
    
    console.log(`Extracted ${images.length} images from Word document (total: ${(totalSize / 1024).toFixed(1)}KB)`);
    return { images, imageCount: images.length, totalSize };
  }

  /**
   * Ensure the image output directory exists
   */
  private static ensureImageDirectory(knowledgeBaseId: string): string {
    const baseDir = path.join(process.cwd(), 'uploads', 'knowledge-base-images');
    const articleDir = path.join(baseDir, knowledgeBaseId);
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    if (!fs.existsSync(articleDir)) {
      fs.mkdirSync(articleDir, { recursive: true });
    }
    
    return articleDir;
  }

  /**
   * Delete all images for a knowledge base article
   */
  static deleteArticleImages(knowledgeBaseId: string): void {
    const articleDir = path.join(process.cwd(), 'uploads', 'knowledge-base-images', knowledgeBaseId);
    
    if (fs.existsSync(articleDir)) {
      fs.rmSync(articleDir, { recursive: true, force: true });
      console.log(`Deleted image directory for article: ${knowledgeBaseId}`);
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
