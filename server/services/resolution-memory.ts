import { storage } from '../storage';
import OpenAI from 'openai';

const openai = new OpenAI();

export interface ResolutionContext {
  learnings: {
    whatWorked: string[];
    whatFailed: string[];
    whatToAvoid: string[];
    prerequisites: string[];
    tips: string[];
  };
  stationMemory: {
    provenSolutions: Array<{
      pattern: string;
      solution: string;
      successRate: number;
      avoidActions: string[];
    }>;
  };
  orgMemory: Array<{
    pattern: string;
    solution: string;
    successRate: number;
  }>;
}

export class ResolutionMemoryService {

  static async getResolutionContext(
    organizationId: string,
    issueCategory: string,
    issueDescription: string,
    stationId?: string
  ): Promise<ResolutionContext> {
    const context: ResolutionContext = {
      learnings: { whatWorked: [], whatFailed: [], whatToAvoid: [], prerequisites: [], tips: [] },
      stationMemory: { provenSolutions: [] },
      orgMemory: [],
    };

    try {
      const signature = this.generateIssueSignature(issueCategory, issueDescription);
      const [learnings, signatureLearnings] = await Promise.all([
        storage.getResolutionLearnings(organizationId, issueCategory, stationId || undefined),
        storage.getLearningsBySignature(organizationId, signature),
      ]);

      const allLearnings = [...signatureLearnings, ...learnings];
      const seen = new Set<string>();

      for (const l of allLearnings) {
        if (seen.has(l.id)) continue;
        seen.add(l.id);
        switch (l.learningType) {
          case 'what_worked': context.learnings.whatWorked.push(l.content); break;
          case 'what_failed': context.learnings.whatFailed.push(l.content); break;
          case 'what_to_avoid': context.learnings.whatToAvoid.push(l.content); break;
          case 'prerequisite': context.learnings.prerequisites.push(l.content); break;
          case 'tip': context.learnings.tips.push(l.content); break;
        }
      }

      if (stationId) {
        const stationMem = await storage.getStationResolutionMemory(stationId, issueCategory);
        context.stationMemory.provenSolutions = stationMem.map(m => ({
          pattern: m.issuePattern,
          solution: m.provenSolution,
          successRate: m.successRate,
          avoidActions: m.avoidActions || [],
        }));
      }

      const orgMem = await storage.getOrgResolutionMemory(organizationId, issueCategory);
      context.orgMemory = orgMem.map(m => ({
        pattern: m.issuePattern,
        solution: m.provenSolution,
        successRate: m.successRate,
      }));

    } catch (error) {
      console.error('[ResolutionMemory] Error loading context:', error);
    }

    return context;
  }

  static formatContextForAI(context: ResolutionContext): string {
    const parts: string[] = [];

    const hasLearnings = Object.values(context.learnings).some(arr => arr.length > 0);
    const hasStationMemory = context.stationMemory.provenSolutions.length > 0;
    const hasOrgMemory = context.orgMemory.length > 0;

    if (!hasLearnings && !hasStationMemory && !hasOrgMemory) return '';

    parts.push('\n--- RESOLUTION MEMORY (Check this BEFORE suggesting new solutions) ---');

    if (context.learnings.whatWorked.length > 0) {
      parts.push('\nPROVEN SOLUTIONS (What worked before):');
      context.learnings.whatWorked.slice(0, 5).forEach(w => parts.push(`  - ${w}`));
    }

    if (context.learnings.whatFailed.length > 0) {
      parts.push('\nFAILED APPROACHES (Do NOT repeat these):');
      context.learnings.whatFailed.slice(0, 3).forEach(f => parts.push(`  - ${f}`));
    }

    if (context.learnings.whatToAvoid.length > 0) {
      parts.push('\nAVOID (Known pitfalls):');
      context.learnings.whatToAvoid.slice(0, 3).forEach(a => parts.push(`  - ${a}`));
    }

    if (context.learnings.prerequisites.length > 0) {
      parts.push('\nPREREQUISITES (Check first):');
      context.learnings.prerequisites.slice(0, 3).forEach(p => parts.push(`  - ${p}`));
    }

    if (context.learnings.tips.length > 0) {
      parts.push('\nTIPS:');
      context.learnings.tips.slice(0, 3).forEach(t => parts.push(`  - ${t}`));
    }

    if (hasStationMemory) {
      parts.push('\nSTATION-SPECIFIC SOLUTIONS (This location):');
      context.stationMemory.provenSolutions.slice(0, 3).forEach(s => {
        parts.push(`  Pattern: ${s.pattern}`);
        parts.push(`  Solution: ${s.solution} (${s.successRate}% success rate)`);
        if (s.avoidActions.length > 0) {
          parts.push(`  Avoid: ${s.avoidActions.join(', ')}`);
        }
      });
    }

    if (hasOrgMemory && !hasStationMemory) {
      parts.push('\nORGANIZATION-WIDE SOLUTIONS (Other locations):');
      context.orgMemory.slice(0, 3).forEach(m => {
        parts.push(`  Pattern: ${m.pattern}`);
        parts.push(`  Solution: ${m.solution} (${m.successRate}% success rate)`);
      });
    }

    parts.push('\nINSTRUCTION: First try proven solutions above. If those do not apply, suggest new approaches. Never repeat failed approaches.');
    parts.push('--- END RESOLUTION MEMORY ---\n');

    return parts.join('\n');
  }

  static async saveResolutionWithLearnings(
    resolutionId: string,
    organizationId: string,
    issueCategory: string,
    issueDescription: string,
    steps: Array<{ action: string; result: string; details?: string; errorMessage?: string; toolUsed?: string }>,
    stationId?: string
  ): Promise<void> {
    try {
      const signature = this.generateIssueSignature(issueCategory, issueDescription);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await storage.createResolutionStep({
          resolutionId,
          stepNumber: i + 1,
          action: step.action,
          result: step.result,
          details: step.details || null,
          errorMessage: step.errorMessage || null,
          toolUsed: step.toolUsed || null,
          timeSpentSeconds: null,
        });

        const learningType = step.result === 'success' ? 'what_worked' :
                             step.result === 'failed' ? 'what_failed' : null;

        if (learningType) {
          await storage.createResolutionLearning({
            organizationId,
            resolutionId,
            issueCategory,
            issueSignature: signature,
            learningType,
            content: `${step.action}: ${step.details || step.errorMessage || step.result}`,
            confidence: step.result === 'success' ? 90 : 70,
            stationId: stationId || null,
            applicableStations: null,
            isGlobal: !stationId,
          });
        }
      }

      const successfulSteps = steps.filter(s => s.result === 'success');
      if (successfulSteps.length > 0 && stationId) {
        const existingMemory = await storage.getStationMemoryByPattern(stationId, signature);
        if (existingMemory.length > 0) {
          const mem = existingMemory[0];
          const newSuccessRate = Math.round(
            ((mem.successRate * mem.timesUsed) + 100) / (mem.timesUsed + 1)
          );
          await storage.updateStationResolutionMemory(mem.id, {
            successRate: newSuccessRate,
            relatedResolutionIds: [...(mem.relatedResolutionIds || []), resolutionId],
          });
          await storage.incrementStationMemoryUsage(mem.id);
        } else {
          const failedActions = steps.filter(s => s.result === 'failed').map(s => s.action);
          await storage.createStationResolutionMemory({
            stationId,
            organizationId,
            issueCategory,
            issuePattern: signature,
            commonCauses: [issueDescription],
            provenSolution: successfulSteps.map(s => s.action).join(' -> '),
            solutionSteps: successfulSteps.map((s, i) => ({ step: i + 1, action: s.action, notes: s.details })),
            avoidActions: failedActions.length > 0 ? failedActions : null,
            prerequisites: null,
            successRate: 100,
            relatedResolutionIds: [resolutionId],
          });
        }
      }

    } catch (error) {
      console.error('[ResolutionMemory] Error saving learnings:', error);
    }
  }

  static async analyzeConversationForLearnings(
    conversationId: string,
    organizationId: string,
    issueCategory: string,
    messages: Array<{ role: string; content: string }>,
    outcome: string,
    stationId?: string
  ): Promise<void> {
    try {
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

      const analysis = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are analyzing a customer support conversation to extract learnings. 
Extract what worked, what didn't work, what to avoid, and any tips for handling similar issues in the future.
Return a JSON object with these fields:
{
  "issueSignature": "brief normalized description of the issue type",
  "whatWorked": ["list of approaches that resolved or helped"],
  "whatFailed": ["list of approaches that did not work"],
  "whatToAvoid": ["things to avoid doing for this type of issue"],
  "prerequisites": ["things to check before attempting solutions"],
  "tips": ["helpful tips for agents handling this type of issue"]
}
Keep each item concise (under 100 chars). Only include items with actual learnings.`
          },
          {
            role: 'user',
            content: `Issue Category: ${issueCategory}\nOutcome: ${outcome}\n\nConversation:\n${conversationText.substring(0, 3000)}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500,
      });

      const result = JSON.parse(analysis.choices[0]?.message?.content || '{}');
      const signature = result.issueSignature || this.generateIssueSignature(issueCategory, conversationText.substring(0, 200));

      const learningTypes: Array<{ type: string; items: string[] }> = [
        { type: 'what_worked', items: result.whatWorked || [] },
        { type: 'what_failed', items: result.whatFailed || [] },
        { type: 'what_to_avoid', items: result.whatToAvoid || [] },
        { type: 'prerequisite', items: result.prerequisites || [] },
        { type: 'tip', items: result.tips || [] },
      ];

      for (const lt of learningTypes) {
        for (const item of lt.items.slice(0, 3)) {
          await storage.createResolutionLearning({
            organizationId,
            issueCategory,
            issueSignature: signature,
            learningType: lt.type,
            content: item,
            confidence: outcome === 'resolved' ? 85 : 60,
            stationId: stationId || null,
            applicableStations: null,
            isGlobal: !stationId,
          });
        }
      }

      console.log(`[ResolutionMemory] Extracted learnings from conversation ${conversationId}`);

    } catch (error) {
      console.error('[ResolutionMemory] Error analyzing conversation:', error);
    }
  }

  static generateIssueSignature(category: string, description: string): string {
    const normalized = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(w => w.length > 2)
      .slice(0, 5)
      .join('_');
    return `${category}_${normalized}`;
  }
}
