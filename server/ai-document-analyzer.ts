import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DocumentAnalysisResult {
  suggestedTitle?: string;
  category: string;
  tags: string[];
  keywords: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  summary: string;
}

export class AIDocumentAnalyzer {
  /**
   * Analyze a document and extract metadata, tags, keywords, category, and generate FAQs
   */
  static async analyzeDocument(
    content: string,
    title?: string
  ): Promise<DocumentAnalysisResult> {
    try {
      console.log(`[AI Document Analyzer] Starting analysis for document: ${title || 'Untitled'}`);
      console.log(`[AI Document Analyzer] Content length: ${content.length} characters`);

      const prompt = `Analyze the following document and provide structured metadata.

Document Title: ${title || 'Untitled'}

Document Content:
${content.substring(0, 8000)} ${content.length > 8000 ? '...(truncated)' : ''}

Please analyze this document and provide:
1. A suggested title (if the current one seems generic or could be improved)
2. The most appropriate category from: Technical, Billing, Product Info, General, Sales, Support, Troubleshooting
3. 5-8 relevant tags (single words or short phrases)
4. 8-12 important keywords from the content
5. 5-8 FAQs with detailed answers based ONLY on the content provided
6. A brief summary (2-3 sentences)

Respond in JSON format:
{
  "suggestedTitle": "string or null if current title is good",
  "category": "string",
  "tags": ["tag1", "tag2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "faqs": [
    {"question": "Q1?", "answer": "A1"},
    {"question": "Q2?", "answer": "A2"}
  ],
  "summary": "string"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert knowledge base curator and document analyzer. Your job is to:
1. Accurately categorize documents
2. Extract relevant tags and keywords for searchability
3. Generate helpful FAQs that customers would actually ask
4. Provide concise summaries

When generating FAQs:
- Base answers ONLY on the content provided
- Make questions specific and realistic
- Ensure answers are comprehensive but concise
- Cover the most important aspects of the document
- Use customer-friendly language

Always respond with valid JSON only, no additional text.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      const analysis = JSON.parse(responseContent) as DocumentAnalysisResult;

      console.log(`[AI Document Analyzer] Analysis complete`);
      console.log(`[AI Document Analyzer] Category: ${analysis.category}`);
      console.log(`[AI Document Analyzer] Tags: ${analysis.tags.length}`);
      console.log(`[AI Document Analyzer] Keywords: ${analysis.keywords.length}`);
      console.log(`[AI Document Analyzer] FAQs generated: ${analysis.faqs.length}`);

      return analysis;
    } catch (error) {
      console.error('[AI Document Analyzer] Error analyzing document:', error);
      
      // Return fallback analysis if AI fails
      return {
        category: 'General',
        tags: [],
        keywords: [],
        faqs: [],
        summary: 'Document analysis failed. Please review and categorize manually.'
      };
    }
  }

  /**
   * Batch analyze multiple documents
   */
  static async batchAnalyze(
    documents: Array<{ content: string; title?: string }>
  ): Promise<DocumentAnalysisResult[]> {
    const results: DocumentAnalysisResult[] = [];
    
    for (const doc of documents) {
      const analysis = await this.analyzeDocument(doc.content, doc.title);
      results.push(analysis);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }

  /**
   * Suggest which AI agents should handle this document based on category/tags
   */
  static suggestAgentAssignment(analysis: DocumentAnalysisResult): {
    primarySpecialization: string;
    suggestedAgentNames: string[];
  } {
    const categoryToSpecialization: Record<string, string> = {
      'Technical': 'technical',
      'Billing': 'billing',
      'Product Info': 'product',
      'Sales': 'sales',
      'Support': 'support',
      'Troubleshooting': 'technical',
      'General': 'general'
    };

    const primarySpecialization = categoryToSpecialization[analysis.category] || 'general';

    // Map specializations to agent names
    const specializationToAgents: Record<string, string[]> = {
      'technical': ['Technical Support Specialist'],
      'billing': ['Billing Specialist'],
      'sales': ['Sales Assistant'],
      'general': ['General Support Assistant', 'Customer Support Assistant'],
      'support': ['Customer Support Assistant', 'General Support Assistant'],
      'product': ['Sales Assistant', 'Technical Support Specialist']
    };

    const suggestedAgentNames = specializationToAgents[primarySpecialization] || ['General Support Assistant'];

    return {
      primarySpecialization,
      suggestedAgentNames
    };
  }
}
