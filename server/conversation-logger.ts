/**
 * Conversation Tracing & Logging System
 * Captures detailed conversation flow between customers, AI, and staff
 */

export interface ConversationTrace {
  timestamp: string;
  conversationId: string;
  customerId?: string;
  phase: 'request' | 'ai_processing' | 'ai_response' | 'staff_action' | 'error';
  actor: 'customer' | 'ai' | 'staff';
  action: string;
  details: any;
  duration?: number;
}

export interface AIProcessingTrace extends ConversationTrace {
  phase: 'ai_processing';
  details: {
    customerMessage: string;
    intentClassification?: {
      intent: string;
      confidence: number;
      reasoning: string;
    };
    knowledgeSearch?: {
      query: string;
      resultsCount: number;
      topResults?: Array<{
        title: string;
        score: number;
        relevance: number;
      }>;
    };
    agentSelected?: {
      agentId: string;
      agentName: string;
      specializations: string[];
    };
    responseGeneration?: {
      prompt: string;
      responseLength: number;
      confidence: number;
      format: string;
      requiresHumanTakeover: boolean;
    };
    qualityScores?: {
      qualityScore: number;
      toneScore: number;
      relevanceScore: number;
      completenessScore: number;
    };
  };
}

export interface AIResponseTrace extends ConversationTrace {
  phase: 'ai_response';
  details: {
    response: string;
    confidence: number;
    requiresHumanTakeover: boolean;
    suggestedActions: string[];
    knowledgeUsed?: string[];
    format: 'regular' | 'steps';
  };
}

class ConversationLogger {
  private traces: ConversationTrace[] = [];
  private activeConversations = new Map<string, {
    startTime: number;
    messageCount: number;
    traces: ConversationTrace[];
  }>();

  /**
   * Start tracking a conversation
   */
  startConversation(conversationId: string, customerId?: string) {
    this.activeConversations.set(conversationId, {
      startTime: Date.now(),
      messageCount: 0,
      traces: []
    });
    
    this.log({
      timestamp: new Date().toISOString(),
      conversationId,
      customerId,
      phase: 'request',
      actor: 'customer',
      action: 'conversation_started',
      details: { conversationId, customerId }
    });
  }

  /**
   * Log customer message
   */
  logCustomerMessage(conversationId: string, message: string, customerId?: string) {
    const trace: ConversationTrace = {
      timestamp: new Date().toISOString(),
      conversationId,
      customerId,
      phase: 'request',
      actor: 'customer',
      action: 'message_sent',
      details: { message, length: message.length }
    };
    
    this.log(trace);
    
    const conv = this.activeConversations.get(conversationId);
    if (conv) {
      conv.messageCount++;
    }
  }

  /**
   * Log AI processing steps
   */
  logAIProcessing(conversationId: string, details: AIProcessingTrace['details']) {
    const trace: AIProcessingTrace = {
      timestamp: new Date().toISOString(),
      conversationId,
      phase: 'ai_processing',
      actor: 'ai',
      action: 'processing_message',
      details
    };
    
    this.log(trace);
  }

  /**
   * Log AI response
   */
  logAIResponse(conversationId: string, details: AIResponseTrace['details'], duration?: number) {
    const trace: AIResponseTrace = {
      timestamp: new Date().toISOString(),
      conversationId,
      phase: 'ai_response',
      actor: 'ai',
      action: 'response_generated',
      details,
      duration
    };
    
    this.log(trace);
  }

  /**
   * Log staff action
   */
  logStaffAction(conversationId: string, staffId: string, action: string, details: any) {
    const trace: ConversationTrace = {
      timestamp: new Date().toISOString(),
      conversationId,
      phase: 'staff_action',
      actor: 'staff',
      action,
      details: { staffId, ...details }
    };
    
    this.log(trace);
  }

  /**
   * Log error
   */
  logError(conversationId: string, error: Error, context: any) {
    const trace: ConversationTrace = {
      timestamp: new Date().toISOString(),
      conversationId,
      phase: 'error',
      actor: 'ai',
      action: 'error_occurred',
      details: {
        error: error.message,
        stack: error.stack,
        context
      }
    };
    
    this.log(trace);
  }

  /**
   * Core logging function
   */
  private log(trace: ConversationTrace) {
    // Store in memory
    this.traces.push(trace);
    
    // Store in conversation-specific array
    const conv = this.activeConversations.get(trace.conversationId);
    if (conv) {
      conv.traces.push(trace);
    }
    
    // Console output with color coding
    this.consoleLog(trace);
    
    // Keep only last 1000 traces in memory
    if (this.traces.length > 1000) {
      this.traces = this.traces.slice(-1000);
    }
  }

  /**
   * Pretty console logging
   */
  private consoleLog(trace: ConversationTrace) {
    const colors = {
      request: '\x1b[36m',      // Cyan
      ai_processing: '\x1b[33m', // Yellow
      ai_response: '\x1b[32m',   // Green
      staff_action: '\x1b[35m',  // Magenta
      error: '\x1b[31m',         // Red
      reset: '\x1b[0m'
    };

    const color = colors[trace.phase];
    const emoji = {
      request: '📩',
      ai_processing: '🤖',
      ai_response: '💬',
      staff_action: '👤',
      error: '❌'
    }[trace.phase];

    console.log(`${color}${emoji} [${trace.timestamp}] [${trace.conversationId.slice(0, 8)}...] ${trace.action}${colors.reset}`);
    
    // Log detailed info for AI processing
    if (trace.phase === 'ai_processing') {
      const details = (trace as AIProcessingTrace).details;
      if (details.intentClassification) {
        console.log(`  ├─ Intent: ${details.intentClassification.intent} (${details.intentClassification.confidence}% confidence)`);
        console.log(`  ├─ Reasoning: ${details.intentClassification.reasoning}`);
      }
      if (details.knowledgeSearch) {
        console.log(`  ├─ Knowledge Search: ${details.knowledgeSearch.resultsCount} results found`);
        if (details.knowledgeSearch.topResults && details.knowledgeSearch.topResults.length > 0) {
          details.knowledgeSearch.topResults.forEach((result, i) => {
            console.log(`  │  └─ ${i + 1}. ${result.title} (score: ${result.score.toFixed(2)})`);
          });
        }
      }
      if (details.agentSelected) {
        console.log(`  ├─ Agent: ${details.agentSelected.agentName}`);
        console.log(`  ├─ Specializations: ${details.agentSelected.specializations.join(', ')}`);
      }
      if (details.responseGeneration) {
        console.log(`  ├─ Response Length: ${details.responseGeneration.responseLength} chars`);
        console.log(`  ├─ Confidence: ${details.responseGeneration.confidence}%`);
        console.log(`  ├─ Format: ${details.responseGeneration.format}`);
        console.log(`  └─ Human Takeover: ${details.responseGeneration.requiresHumanTakeover ? 'YES' : 'NO'}`);
      }
    }
    
    // Log AI response summary
    if (trace.phase === 'ai_response') {
      const details = (trace as AIResponseTrace).details;
      console.log(`  ├─ Response Preview: ${details.response.substring(0, 100)}...`);
      console.log(`  ├─ Confidence: ${details.confidence}%`);
      console.log(`  ├─ Format: ${details.format}`);
      console.log(`  └─ Duration: ${trace.duration}ms`);
    }
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(conversationId: string) {
    const conv = this.activeConversations.get(conversationId);
    if (!conv) {
      return null;
    }

    const duration = Date.now() - conv.startTime;
    const traces = conv.traces;
    
    return {
      conversationId,
      duration,
      messageCount: conv.messageCount,
      traceCount: traces.length,
      phases: {
        requests: traces.filter(t => t.phase === 'request').length,
        aiProcessing: traces.filter(t => t.phase === 'ai_processing').length,
        aiResponses: traces.filter(t => t.phase === 'ai_response').length,
        staffActions: traces.filter(t => t.phase === 'staff_action').length,
        errors: traces.filter(t => t.phase === 'error').length
      },
      traces
    };
  }

  /**
   * Get all traces for a conversation
   */
  getConversationTraces(conversationId: string): ConversationTrace[] {
    const conv = this.activeConversations.get(conversationId);
    return conv ? conv.traces : [];
  }

  /**
   * Get recent traces across all conversations
   */
  getRecentTraces(limit: number = 50): ConversationTrace[] {
    return this.traces.slice(-limit);
  }

  /**
   * Clear traces for a conversation
   */
  clearConversation(conversationId: string) {
    this.activeConversations.delete(conversationId);
  }

  /**
   * Print conversation flow diagram
   */
  printConversationFlow(conversationId: string) {
    const conv = this.activeConversations.get(conversationId);
    if (!conv) {
      console.log(`No conversation found: ${conversationId}`);
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log(`CONVERSATION FLOW: ${conversationId}`);
    console.log('='.repeat(80) + '\n');

    conv.traces.forEach((trace, index) => {
      const emoji = {
        request: '📩',
        ai_processing: '🤖',
        ai_response: '💬',
        staff_action: '👤',
        error: '❌'
      }[trace.phase];

      console.log(`${index + 1}. ${emoji} [${trace.phase.toUpperCase()}] ${trace.action}`);
      console.log(`   Time: ${trace.timestamp}`);
      console.log(`   Details: ${JSON.stringify(trace.details, null, 2)}`);
      if (trace.duration) {
        console.log(`   Duration: ${trace.duration}ms`);
      }
      console.log('');
    });

    console.log('='.repeat(80) + '\n');
  }
}

// Singleton instance
export const conversationLogger = new ConversationLogger();
