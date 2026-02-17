import { storage } from '../storage';
import OpenAI from 'openai';

const openai = new OpenAI();

export interface ImageAnalysisResult {
  extractedText: string;
  errorSignature: string;
  errorType: string | null;
  normalizedPattern: string;
  matchedSolution: {
    solution: string;
    steps: any[];
    confidence: number;
    source: 'exact_match' | 'similar_match' | 'ai_generated';
  } | null;
}

export class ImageErrorDetectionService {

  static async analyzeErrorImage(
    imageUrl: string,
    organizationId: string,
    conversationId?: string,
    customerId?: string,
    stationId?: string
  ): Promise<ImageAnalysisResult> {
    try {
      const extractedData = await this.extractTextFromImage(imageUrl);

      if (!extractedData.extractedText) {
        return {
          extractedText: '',
          errorSignature: '',
          errorType: null,
          normalizedPattern: '',
          matchedSolution: null,
        };
      }

      const normalizedPattern = this.normalizeErrorPattern(extractedData.extractedText);
      const errorSignature = this.generateErrorSignature(extractedData.extractedText);

      const [exactMatches, similarMatches] = await Promise.all([
        storage.findMatchingErrorSignatures(organizationId, normalizedPattern),
        storage.findSimilarErrorSignatures(organizationId, errorSignature),
      ]);

      let matchedSolution: ImageAnalysisResult['matchedSolution'] = null;

      if (exactMatches.length > 0 && exactMatches[0].solutionProvided) {
        const match = exactMatches[0];
        matchedSolution = {
          solution: match.solutionProvided!,
          steps: (match.solutionSteps as any[]) || [],
          confidence: match.matchConfidence,
          source: 'exact_match',
        };
        console.log(`[ImageError] Exact match found with ${match.matchConfidence}% confidence`);
      } else if (similarMatches.length > 0 && similarMatches[0].solutionProvided) {
        const match = similarMatches[0];
        matchedSolution = {
          solution: match.solutionProvided!,
          steps: (match.solutionSteps as any[]) || [],
          confidence: Math.max(match.matchConfidence - 15, 30),
          source: 'similar_match',
        };
        console.log(`[ImageError] Similar match found with ~${matchedSolution.confidence}% confidence`);
      }

      if (!matchedSolution) {
        matchedSolution = await this.generateSolutionFromError(
          extractedData.extractedText,
          extractedData.errorType,
          organizationId,
          stationId
        );
      }

      await storage.createImageErrorSignature({
        organizationId,
        imageUrl,
        extractedText: extractedData.extractedText,
        errorSignature,
        errorType: extractedData.errorType,
        normalizedPattern,
        matchedResolutionId: null,
        matchedLearningId: null,
        matchConfidence: matchedSolution?.confidence || 0,
        solutionProvided: matchedSolution?.solution || null,
        solutionSteps: matchedSolution?.steps || null,
        conversationId: conversationId || null,
        customerId: customerId || null,
        stationId: stationId || null,
        wasHelpful: null,
      });

      return {
        extractedText: extractedData.extractedText,
        errorSignature,
        errorType: extractedData.errorType,
        normalizedPattern,
        matchedSolution,
      };

    } catch (error) {
      console.error('[ImageError] Error analyzing image:', error);
      return {
        extractedText: '',
        errorSignature: '',
        errorType: null,
        normalizedPattern: '',
        matchedSolution: null,
      };
    }
  }

  static async extractTextFromImage(imageUrl: string): Promise<{
    extractedText: string;
    errorType: string | null;
    isErrorScreen: boolean;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing error screens, dialog boxes, and technical displays.
Extract ALL text visible in the image, especially:
- Error messages and error codes
- Warning messages
- Status indicators
- Dialog box content
- Stack traces or technical output
- Button labels on error dialogs

Return a JSON object:
{
  "extractedText": "all text found in the image",
  "errorType": "error_dialog|stack_trace|warning|status_screen|receipt_error|blue_screen|connection_error|null",
  "isErrorScreen": true/false,
  "errorCode": "any error code found or null",
  "primaryMessage": "the main error/status message"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image. Extract all visible text and identify if it shows an error, warning, or status screen.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'high' }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        extractedText: result.extractedText || '',
        errorType: result.errorType || null,
        isErrorScreen: result.isErrorScreen || false,
      };

    } catch (error) {
      console.error('[ImageError] Vision API error:', error);
      return { extractedText: '', errorType: null, isErrorScreen: false };
    }
  }

  static async generateSolutionFromError(
    errorText: string,
    errorType: string | null,
    organizationId: string,
    stationId?: string
  ): Promise<ImageAnalysisResult['matchedSolution']> {
    try {
      let contextFromLearnings = '';
      const learnings = await storage.getResolutionLearnings(organizationId, errorType || 'technical', stationId || undefined);
      if (learnings.length > 0) {
        contextFromLearnings = '\n\nRelated past learnings:\n' +
          learnings.slice(0, 5).map(l => `- [${l.learningType}] ${l.content}`).join('\n');
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a technical support specialist. Given an error message extracted from a screenshot, provide a step-by-step solution.
Return a JSON object:
{
  "solution": "Brief description of the solution approach",
  "steps": [
    {"step": 1, "action": "First action to take", "notes": "Any important details"},
    {"step": 2, "action": "Second action", "notes": "Details"}
  ],
  "confidence": 50-90 (how confident you are this will resolve the issue)
}
Be practical and specific. Reference the exact error if you recognize it.`
          },
          {
            role: 'user',
            content: `Error text from screenshot:\n${errorText}\n\nError type: ${errorType || 'unknown'}${contextFromLearnings}`
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        solution: result.solution || 'Unable to determine a specific solution',
        steps: result.steps || [],
        confidence: result.confidence || 50,
        source: 'ai_generated',
      };

    } catch (error) {
      console.error('[ImageError] Solution generation error:', error);
      return null;
    }
  }

  static normalizeErrorPattern(text: string): string {
    return text
      .toLowerCase()
      .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, 'IP_ADDR')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, 'UUID')
      .replace(/\b\d{10,}\b/g, 'LONG_NUM')
      .replace(/\b0x[0-9a-f]+\b/gi, 'HEX_ADDR')
      .replace(/\bat\s+.*\.(js|ts|py|java|cs|cpp):\d+:\d+/g, 'STACK_LINE')
      .replace(/\d{4}[-/]\d{2}[-/]\d{2}[\sT]\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
      .replace(/[^\w\s.:_-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  static generateErrorSignature(text: string): string {
    const keywords = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'please'].includes(w));

    const errorKeywords = keywords.filter(w =>
      ['error', 'fail', 'exception', 'timeout', 'refused', 'denied', 'invalid',
       'not', 'found', 'unable', 'cannot', 'crash', 'disconnect', 'offline',
       'warning', 'critical', 'fatal', 'null', 'undefined', 'missing'].includes(w)
    );

    const uniqueSet = new Set([...errorKeywords, ...keywords]);
    const significantWords = Array.from(uniqueSet).slice(0, 8);
    return significantWords.join('_');
  }
}
