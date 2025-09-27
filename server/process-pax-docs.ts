import fs from 'fs';
import path from 'path';
import { DocumentProcessor } from './document-processor';
import { storage } from './storage';

async function processPaxDocuments() {
  const attachedAssetsDir = './attached_assets';
  const paxFiles = [
    'How to resolve Batch Close RBOUT OF BALANCE Error for Elavon Processor_1758912872356.docx',
    'How to Setup PAX for BOFA_1758912872356.docx', 
    'How to setup Pax_1758912872356.docx',
    'How to Troubleshooting for PAX-BOFA_1758912872356.docx',
    'How to verify PAX & iPAD connectivity_1758912872356.docx'
  ];

  console.log('Processing PAX documentation files...');
  
  // Admin user ID for created articles
  const adminUserId = '46d6565f-cee8-4ad4-acb9-5c40c78dc2d0';

  for (const fileName of paxFiles) {
    const filePath = path.join(attachedAssetsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${fileName}`);
      continue;
    }

    try {
      const stats = fs.statSync(filePath);
      const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      console.log(`Processing: ${fileName}`);
      
      // Validate document before processing
      DocumentProcessor.validateDocument(filePath, mimeType);
      
      // Extract text content using DocumentProcessor
      const documentContent = await DocumentProcessor.extractText(filePath, fileName, mimeType);
      
      // Format content for knowledge base
      const content = DocumentProcessor.formatForKnowledgeBase(documentContent);
      
      console.log(`Successfully extracted text from ${fileName}: ${documentContent.metadata?.wordCount || 0} words`);

      // Clean up the title
      const cleanTitle = fileName
        .replace(/\.[^/.]+$/, '') // Remove file extension
        .replace(/_\d+$/, '') // Remove timestamp
        .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add spaces before capitals

      // Create knowledge base article
      const articleData = {
        title: cleanTitle,
        content,
        category: 'Payment Terminal Configuration',
        tags: ['PAX', 'Payment Terminal', 'Configuration', 'Troubleshooting', 'BOFA', 'iPad'],
        priority: 75, // High priority for technical documentation
        isActive: true,
        sourceType: 'file' as const,
        fileName: fileName,
        fileType: mimeType,
        fileSize: stats.size,
        filePath: filePath,
        assignedAgentIds: [],
        createdBy: adminUserId,
      };

      const article = await storage.createKnowledgeBase(articleData);
      console.log(`✓ Created knowledge base article: ${article.id} - "${cleanTitle}"`);
      
    } catch (error) {
      console.error(`Error processing ${fileName}:`, error);
    }
  }
  
  console.log('\n✅ PAX documentation processing complete!');
  console.log('Your PAX documentation files have been added to the knowledge base.');
}

// Run the script
processPaxDocuments().catch(console.error);