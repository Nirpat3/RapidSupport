import type { RouteContext } from './types';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth';
import { quantumOptimizer, type RoutingContext, type AgentCapability } from '../quantum-optimizer';
import { storage } from '../storage';
import type { User, AiAgent, KnowledgeBase } from '@shared/schema';

const routingContextSchema = z.object({
  customerId: z.string(),
  customerIntent: z.string(),
  customerSentiment: z.number().min(-1).max(1),
  conversationHistory: z.array(z.string()).default([]),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.string().optional(),
  preferredLanguage: z.string().optional(),
  organizationId: z.string().optional(),
  workspaceId: z.string().optional()
});

const knowledgeQuerySchema = z.object({
  query: z.string().min(1),
  articleIds: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  workspaceId: z.string().optional(),
  customerContext: z.object({
    previousQueries: z.array(z.string()).default([]),
    resolvedIssues: z.array(z.string()).default([])
  }).optional()
});

const aiLearningOptimizationSchema = z.object({
  feedbackEntries: z.array(z.object({
    queryId: z.string(),
    response: z.string(),
    wasHelpful: z.boolean(),
    confidence: z.number().min(0).max(100),
    humanCorrection: z.string().optional(),
    category: z.string()
  }))
});

export function registerQuantumRoutes({ app }: RouteContext) {
  /**
   * Quantum-Inspired Customer Routing Optimization
   * POST /api/quantum/optimize-routing
   * Uses real agent data with proper tenant scoping
   */
  app.post('/api/quantum/optimize-routing', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const context = routingContextSchema.parse(req.body) as RoutingContext & { organizationId?: string; workspaceId?: string };
      const user = req.user as User;
      
      // Determine organization scope - use request or fall back to user's organization
      const organizationId = context.organizationId || user.organizationId || undefined;
      
      // Get all AI agents and filter by organization
      const allAgents = await storage.getAllAiAgents();
      const agents = organizationId 
        ? allAgents.filter((a: AiAgent) => a.organizationId === organizationId || !a.organizationId)
        : allAgents;
      
      // Get human agents from same organization
      const allUsers = await storage.getAllUsers();
      const agentUsers = allUsers.filter((u: User) => 
        (u.role === 'agent' || u.role === 'admin') &&
        (!organizationId || u.organizationId === organizationId)
      );
      
      // Build agent capabilities with real data where available
      const availableAgents: AgentCapability[] = [];
      
      // Add AI agents with real metrics from session data
      for (const agent of agents) {
        // Get real session data for this AI agent
        const agentSessions = await storage.getAiAgentSessionsByAgent(agent.id);
        
        // Count active sessions as current workload
        const activeSessions = agentSessions.filter((s: any) => s.status === 'active');
        const currentWorkload = activeSessions.length;
        
        // Calculate average confidence as performance proxy (0-100 scale converted to 0-5)
        let avgConfidence = 80; // Default if no sessions
        if (agentSessions.length > 0) {
          const totalConfidence = agentSessions.reduce((sum: number, s: any) => sum + (s.avgConfidence || 80), 0);
          avgConfidence = totalConfidence / agentSessions.length;
        }
        const satisfactionScore = avgConfidence / 20; // Convert 0-100 to 0-5 scale
        
        // Use agent's auto-takeover threshold as a proxy for resolution speed
        const avgResolutionTime = agent.autoTakeoverThreshold > 0 
          ? Math.max(2, 10 - agent.autoTakeoverThreshold / 10) // Lower threshold = faster response
          : 5;
        
        availableAgents.push({
          agentId: agent.id,
          agentName: agent.name,
          skills: agent.specializations || [],
          languages: ['en'],
          currentWorkload,
          maxWorkload: 100, // AI agents can handle many concurrent sessions
          averageResolutionTime: avgResolutionTime,
          customerSatisfactionScore: Math.min(5, Math.max(0, satisfactionScore)),
          specializations: agent.specializations || [],
          isAvailable: agent.isActive,
          isAI: true
        });
      }
      
      // Add human agents with real workload data
      for (const userAgent of agentUsers) {
        // Get real workload from storage
        const workloadData = await storage.getAgentWorkload(userAgent.id);
        const currentWorkload = workloadData?.activeConversations || 0;
        const maxWorkload = workloadData?.maxCapacity || 20;
        
        // Get real performance stats from storage (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const performanceStats = await storage.getAgentPerformanceStats(
          userAgent.id, 
          thirtyDaysAgo, 
          new Date()
        );
        
        // Calculate average satisfaction from performance stats
        let avgSatisfaction = 4.0;
        let avgResolution = 10;
        if (performanceStats.length > 0) {
          const totalRatings = performanceStats.reduce((sum, s) => sum + (s.averageRating || 0), 0);
          avgSatisfaction = totalRatings / performanceStats.length;
          const totalResolution = performanceStats.reduce((sum, s) => sum + (s.avgHandleTimeMinutes || 10), 0);
          avgResolution = totalResolution / performanceStats.length;
        }
        
        // Check availability based on user status
        const isAvailable = userAgent.status === 'online';
        
        availableAgents.push({
          agentId: userAgent.id,
          agentName: userAgent.name,
          skills: ['general-support', 'customer-service'],
          languages: ['en'],
          currentWorkload,
          maxWorkload,
          averageResolutionTime: avgResolution,
          customerSatisfactionScore: avgSatisfaction,
          specializations: [],
          isAvailable,
          isAI: false
        });
      }

      const result = quantumOptimizer.optimizeCustomerRouting(context, availableAgents);
      
      const rankedAgents = result.solution
        .sort((a, b) => b.score - a.score)
        .map((agentScore, index) => {
          const agent = availableAgents.find(a => a.agentId === agentScore.agentId);
          return {
            rank: index + 1,
            agentId: agentScore.agentId,
            agentName: agent?.agentName || 'Unknown',
            isAI: agent?.isAI || false,
            score: Math.round(agentScore.score * 100) / 100,
            factors: agentScore.factors,
            confidence: Math.round(agentScore.score * 100)
          };
        });

      res.json({
        success: true,
        tenantScope: {
          organizationId: organizationId || null,
          agentCount: availableAgents.length,
          aiAgentCount: agents.length,
          humanAgentCount: agentUsers.length
        },
        optimization: {
          recommendedAgent: rankedAgents[0] || null,
          alternativeAgents: rankedAgents.slice(1, 4),
          allRankings: rankedAgents
        },
        metrics: {
          iterations: result.iterations,
          optimizationScore: Math.round(result.score * 100) / 100,
          quantumMetrics: result.quantumMetrics
        }
      });
    } catch (error) {
      console.error('Quantum routing optimization error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to optimize routing' });
    }
  });

  /**
   * Quantum-Inspired Knowledge Retrieval Optimization
   * POST /api/quantum/optimize-knowledge
   * Uses real KB articles with tenant scoping and proper content analysis
   */
  app.post('/api/quantum/optimize-knowledge', requireAuth, async (req, res) => {
    try {
      const { query, articleIds, customerContext, organizationId, workspaceId } = knowledgeQuerySchema.parse(req.body);
      const user = req.user as User;
      
      // Determine organization scope
      const scopedOrgId = organizationId || user.organizationId || undefined;
      
      let articles: Array<{ id: string; title: string; content: string; relevanceScore: number; category: string }> = [];
      
      if (articleIds && articleIds.length > 0) {
        const fetchedArticles = await storage.getKnowledgeBaseArticles(articleIds);
        // Filter by organization scope
        const scopedArticles = scopedOrgId
          ? fetchedArticles.filter((a: KnowledgeBase) => a.organizationId === scopedOrgId || !a.organizationId)
          : fetchedArticles;
          
        articles = scopedArticles
          .filter((article): article is KnowledgeBase => article !== undefined && article.isActive)
          .map((article: KnowledgeBase) => ({
            id: article.id,
            title: article.title,
            content: article.content.substring(0, 1000), // More content for better matching
            relevanceScore: (article.effectiveness || 50) / 100, // Use actual effectiveness metric
            category: article.category || 'General'
          }));
      } else {
        const allArticles = await storage.getAllKnowledgeBase();
        const queryLower = query.toLowerCase();
        
        // Filter by organization scope and active status
        const scopedArticles = scopedOrgId
          ? allArticles.filter((a: KnowledgeBase) => 
              a.isActive && (a.organizationId === scopedOrgId || !a.organizationId))
          : allArticles.filter((a: KnowledgeBase) => a.isActive);
        
        articles = scopedArticles
          .map((article: KnowledgeBase) => {
            // Calculate initial relevance based on actual usage and effectiveness
            const titleMatch = article.title.toLowerCase().includes(queryLower) ? 0.3 : 0;
            const contentMatch = article.content.toLowerCase().includes(queryLower) ? 0.2 : 0;
            const usageBoost = Math.min(0.2, (article.usageCount || 0) / 100);
            const effectivenessScore = (article.effectiveness || 50) / 100 * 0.3;
            
            return {
              id: article.id,
              title: article.title,
              content: article.content.substring(0, 1000),
              relevanceScore: titleMatch + contentMatch + usageBoost + effectivenessScore,
              category: article.category || 'General'
            };
          })
          .filter((a: { relevanceScore: number }) => a.relevanceScore > 0.1)
          .slice(0, 50); // Limit for performance
      }

      const result = quantumOptimizer.optimizeKnowledgeRetrieval(query, articles, customerContext);

      res.json({
        success: true,
        tenantScope: {
          organizationId: scopedOrgId || null,
          articlesProcessed: articles.length
        },
        optimization: {
          rankedArticles: result.solution.slice(0, 10),
          totalArticlesProcessed: articles.length
        },
        metrics: {
          iterations: result.iterations,
          optimizationScore: Math.round(result.score * 100) / 100,
          quantumMetrics: result.quantumMetrics
        }
      });
    } catch (error) {
      console.error('Quantum knowledge optimization error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to optimize knowledge retrieval' });
    }
  });

  /**
   * Quantum-Inspired AI Learning Optimization
   * POST /api/quantum/optimize-learning
   * Prioritizes feedback for model improvement
   */
  app.post('/api/quantum/optimize-learning', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { feedbackEntries } = aiLearningOptimizationSchema.parse(req.body);

      const result = quantumOptimizer.optimizeAILearning(feedbackEntries);

      res.json({
        success: true,
        optimization: {
          prioritizedFeedback: result.solution.prioritizedFeedback,
          learningWeights: result.solution.learningWeights,
          suggestedImprovements: result.solution.suggestedImprovements
        },
        metrics: {
          iterations: result.iterations,
          optimizationScore: Math.round(result.score * 100) / 100,
          quantumMetrics: result.quantumMetrics
        }
      });
    } catch (error) {
      console.error('Quantum learning optimization error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to optimize learning' });
    }
  });

  /**
   * Get Quantum Optimization Status and Metrics
   * GET /api/quantum/status
   */
  app.get('/api/quantum/status', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      res.json({
        success: true,
        status: {
          engine: 'Quantum-Inspired Optimization Engine v1.0',
          description: 'Deterministic multi-factor optimization with explainable scoring',
          algorithms: [
            {
              name: 'Multi-Factor Weighted Scoring',
              description: 'Calculates agent suitability using weighted factors: skill match, availability, workload, performance, and affinity',
              useCases: ['Customer routing', 'Agent assignment']
            },
            {
              name: 'Keyword-Based Relevance Ranking',
              description: 'Ranks knowledge articles by title/content relevance, category match, and historical usage',
              useCases: ['Knowledge retrieval', 'Article recommendations']
            },
            {
              name: 'Feedback Priority Scoring',
              description: 'Prioritizes AI feedback by learning potential based on corrections, helpfulness, and confidence',
              useCases: ['AI learning optimization', 'Training prioritization']
            }
          ],
          configuration: {
            maxIterations: 100,
            scoringWeights: {
              routing: {
                skillMatch: 0.30,
                availability: 0.25,
                workload: 0.20,
                historicalPerformance: 0.15,
                customerAffinity: 0.10
              }
            }
          },
          features: {
            tenantScoping: true,
            deterministic: true,
            explainable: true,
            realMetrics: true
          }
        }
      });
    } catch (error) {
      console.error('Quantum status error:', error);
      res.status(500).json({ error: 'Failed to get quantum status' });
    }
  });

  /**
   * Run Quantum Benchmark Test
   * POST /api/quantum/benchmark
   * Uses deterministic test data for consistent results
   */
  app.post('/api/quantum/benchmark', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Deterministic test context
      const testContext: RoutingContext = {
        customerId: 'benchmark-test',
        customerIntent: 'billing refund subscription payment',
        customerSentiment: 0.3,
        conversationHistory: ['I need help with my billing'],
        urgency: 'medium',
        category: 'Billing'
      };

      // Deterministic test agents (fixed seed data)
      const testAgents: AgentCapability[] = [
        {
          agentId: 'test-ai-1',
          agentName: 'Billing AI Agent',
          skills: ['billing', 'payment', 'refund'],
          languages: ['en'],
          currentWorkload: 0,
          maxWorkload: 100,
          averageResolutionTime: 5,
          customerSatisfactionScore: 4.5,
          specializations: ['billing'],
          isAvailable: true,
          isAI: true
        },
        {
          agentId: 'test-ai-2',
          agentName: 'General AI Agent',
          skills: ['general-support'],
          languages: ['en'],
          currentWorkload: 0,
          maxWorkload: 100,
          averageResolutionTime: 6,
          customerSatisfactionScore: 4.2,
          specializations: [],
          isAvailable: true,
          isAI: true
        },
        {
          agentId: 'test-human-1',
          agentName: 'Senior Billing Agent',
          skills: ['billing', 'customer-service'],
          languages: ['en'],
          currentWorkload: 5,
          maxWorkload: 20,
          averageResolutionTime: 8,
          customerSatisfactionScore: 4.8,
          specializations: ['billing', 'refund'],
          isAvailable: true,
          isAI: false
        },
        {
          agentId: 'test-human-2',
          agentName: 'Junior Agent',
          skills: ['general-support'],
          languages: ['en'],
          currentWorkload: 15,
          maxWorkload: 20,
          averageResolutionTime: 12,
          customerSatisfactionScore: 3.8,
          specializations: [],
          isAvailable: true,
          isAI: false
        }
      ];

      const routingResult = quantumOptimizer.optimizeCustomerRouting(testContext, testAgents);
      const routingTime = Date.now() - startTime;

      // Knowledge benchmark
      const knowledgeStart = Date.now();
      const testArticles = [
        { id: 'kb-1', title: 'Billing FAQ', content: 'How to process refunds and billing inquiries', relevanceScore: 0.7, category: 'Billing' },
        { id: 'kb-2', title: 'Payment Methods', content: 'Accepted payment methods and subscription management', relevanceScore: 0.6, category: 'Billing' },
        { id: 'kb-3', title: 'Technical Support', content: 'Troubleshooting common technical issues', relevanceScore: 0.3, category: 'Technical' },
        { id: 'kb-4', title: 'Account Management', content: 'Managing your account settings and preferences', relevanceScore: 0.4, category: 'Account' }
      ];
      const knowledgeResult = quantumOptimizer.optimizeKnowledgeRetrieval('billing refund help', testArticles);
      const knowledgeTime = Date.now() - knowledgeStart;

      // Learning benchmark
      const learningStart = Date.now();
      const testFeedback = [
        { queryId: 'q1', response: 'Standard response', wasHelpful: true, confidence: 85, category: 'Billing' },
        { queryId: 'q2', response: 'Incorrect response', wasHelpful: false, confidence: 45, humanCorrection: 'Corrected', category: 'Billing' },
        { queryId: 'q3', response: 'Partial response', wasHelpful: false, confidence: 60, category: 'Technical' },
        { queryId: 'q4', response: 'Good response', wasHelpful: true, confidence: 92, category: 'General' }
      ];
      const learningResult = quantumOptimizer.optimizeAILearning(testFeedback);
      const learningTime = Date.now() - learningStart;

      const totalTime = Date.now() - startTime;

      res.json({
        success: true,
        benchmark: {
          totalTimeMs: totalTime,
          tests: [
            {
              name: 'Customer Routing Optimization',
              timeMs: routingTime,
              iterations: routingResult.iterations,
              topAgent: routingResult.solution[0]?.agentId,
              topScore: Math.round(routingResult.solution[0]?.score * 100) / 100
            },
            {
              name: 'Knowledge Retrieval Optimization',
              timeMs: knowledgeTime,
              iterations: knowledgeResult.iterations,
              topArticle: knowledgeResult.solution[0]?.id,
              topScore: Math.round(knowledgeResult.solution[0]?.optimizedScore * 100) / 100
            },
            {
              name: 'AI Learning Optimization',
              timeMs: learningTime,
              iterations: learningResult.iterations,
              topPriority: learningResult.solution.prioritizedFeedback[0]?.queryId,
              suggestionsCount: learningResult.solution.suggestedImprovements.length
            }
          ],
          verification: {
            deterministic: true,
            message: 'All benchmark results are reproducible with same inputs'
          }
        }
      });
    } catch (error) {
      console.error('Quantum benchmark error:', error);
      res.status(500).json({ error: 'Failed to run benchmark' });
    }
  });
}
