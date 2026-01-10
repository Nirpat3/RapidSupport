import type { RouteContext } from './types';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { storage } from '../storage';
import { verifyCustomerToken, createSimpleToken, verifySimpleToken, generateEmbedSecret } from '../embed-auth';
import type { SupportCategory } from '@shared/schema';

const tokenExchangeSchema = z.object({
  token: z.string(),
  orgSlug: z.string(),
  pageContext: z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    feature: z.string().optional(),
    metadata: z.record(z.string()).optional(),
  }).optional(),
});

const initSessionSchema = z.object({
  orgSlug: z.string(),
  sessionId: z.string().optional(),
  pageContext: z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    feature: z.string().optional(),
    metadata: z.record(z.string()).optional(),
  }).optional(),
});

export function registerEmbedRoutes({ app }: RouteContext) {
  
  app.post('/api/embed/exchange-token', async (req, res) => {
    try {
      const { token, orgSlug, pageContext } = tokenExchangeSchema.parse(req.body);
      
      const verified = verifyCustomerToken(token, orgSlug);
      if (!verified) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      const org = await storage.getOrganizationBySlug(orgSlug);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Scope customer lookup by organization - look for customer with matching email AND organization
      let customer = await storage.getCustomerByEmailAndOrg(verified.email, org.id);
      
      // Fallback: check if customer exists with NULL organizationId (legacy) and backfill it
      if (!customer) {
        const globalCustomer = await storage.getCustomerByEmail(verified.email);
        if (globalCustomer) {
          if (globalCustomer.organizationId === null) {
            // Legacy customer with no org - explicitly backfill organizationId
            try {
              await storage.updateCustomerOrganizationId(globalCustomer.id, org.id);
              customer = await storage.getCustomer(globalCustomer.id);
              console.log(`[Embed] Backfilled organizationId for legacy customer ${globalCustomer.id}`);
            } catch (error: any) {
              if (error.message?.includes('Security violation')) {
                console.error('[Embed] Cross-tenant violation during backfill:', error.message);
                return res.status(403).json({ error: 'Email already registered with a different organization' });
              }
              throw error;
            }
          } else if (globalCustomer.organizationId === org.id) {
            // Customer already belongs to this org
            customer = globalCustomer;
          } else {
            // Customer belongs to a different organization - reject cross-tenant access
            console.error(`[Embed] Cross-tenant access attempt: email ${verified.email} belongs to org ${globalCustomer.organizationId}, not ${org.id}`);
            return res.status(403).json({ error: 'Email already registered with a different organization' });
          }
        }
      }
      
      if (!customer) {
        // No existing customer - create new one with org scoping
        try {
          const result = await storage.createAnonymousCustomer({
            name: verified.name,
            email: verified.email,
            phone: verified.phone || null,
            company: verified.company || null,
            ipAddress: req.ip || 'unknown',
            sessionId: randomUUID(),
            organizationId: org.id,
          });
          customer = await storage.getCustomer(result.customerId);
        } catch (error: any) {
          if (error.message?.includes('Security violation')) {
            console.error('[Embed] Cross-tenant violation during creation:', error.message);
            return res.status(403).json({ error: 'Email already registered with a different organization' });
          }
          throw error;
        }
      }
      
      if (!customer) {
        return res.status(500).json({ error: 'Failed to create or find customer' });
      }
      
      // Security: Verify customer belongs to this organization (strict check - missing org is a failure)
      if (!customer.organizationId || customer.organizationId !== org.id) {
        console.error('[Embed] Customer organization mismatch or missing:', customer.organizationId, 'vs', org.id);
        return res.status(403).json({ error: 'Customer does not belong to this organization' });
      }
      
      const mergedPageContext = pageContext || verified.pageContext;
      
      const conversations = await storage.getConversationsByCustomer(customer.id);
      let conversation = conversations.find(c => c.status === 'open' || c.status === 'in_progress');
      
      if (!conversation) {
        conversation = await storage.createConversation({
          customerId: customer.id,
          isAnonymous: false,
        });
        if (mergedPageContext) {
          await storage.setConversationContextData(conversation.id, mergedPageContext);
        }
      } else if (mergedPageContext) {
        await storage.setConversationContextData(conversation.id, mergedPageContext);
      }
      
      const sessionToken = createSimpleToken(customer.id, orgSlug);
      
      // Security: Fail if token creation failed (no secret configured)
      if (!sessionToken) {
        return res.status(500).json({ error: 'Session token creation failed - embed secret not configured' });
      }
      
      res.json({
        success: true,
        sessionToken,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        conversationId: conversation.id,
        isNewCustomer: !customer.createdAt || (Date.now() - new Date(customer.createdAt).getTime()) < 5000,
      });
    } catch (error) {
      console.error('[Embed] Token exchange failed:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      res.status(500).json({ error: 'Token exchange failed' });
    }
  });

  app.post('/api/embed/init-session', async (req, res) => {
    try {
      const { orgSlug, sessionId, pageContext } = initSessionSchema.parse(req.body);
      
      const org = await storage.getOrganizationBySlug(orgSlug);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const newSessionId = sessionId || randomUUID();
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      let existingConversation = await storage.getConversationBySession(newSessionId);
      if (!existingConversation && clientIP !== 'unknown') {
        existingConversation = await storage.getConversationByIP(clientIP);
      }
      
      res.json({
        success: true,
        sessionId: newSessionId,
        orgSlug,
        organizationName: org.name,
        branding: {
          logo: org.logo,
          primaryColor: org.primaryColor,
          secondaryColor: org.secondaryColor,
          welcomeMessage: org.welcomeMessage,
        },
        existingConversation: existingConversation ? {
          conversationId: existingConversation.conversationId,
          customerId: existingConversation.customerId,
          customerName: existingConversation.customerInfo?.name,
        } : null,
        pageContext,
      });
    } catch (error) {
      console.error('[Embed] Init session failed:', error);
      res.status(500).json({ error: 'Failed to initialize session' });
    }
  });

  app.post('/api/embed/resume-session', async (req, res) => {
    try {
      const { sessionToken, orgSlug } = req.body;
      
      if (!sessionToken || !orgSlug) {
        return res.status(400).json({ error: 'Missing sessionToken or orgSlug' });
      }
      
      const verified = verifySimpleToken(sessionToken, orgSlug);
      if (!verified) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      
      // Security: Verify organization exists
      const org = await storage.getOrganizationBySlug(orgSlug);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const customer = await storage.getCustomer(verified.customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      // Security: Verify customer belongs to this organization (strict check - missing org is a failure)
      if (!customer.organizationId || customer.organizationId !== org.id) {
        console.error('[Embed] Resume session - customer organization mismatch or missing:', customer.organizationId, 'vs', org.id);
        return res.status(403).json({ error: 'Session does not belong to this organization' });
      }
      
      const conversations = await storage.getConversationsByCustomer(customer.id);
      const activeConversation = conversations.find(c => c.status === 'open' || c.status === 'in_progress');
      
      res.json({
        success: true,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        conversationId: activeConversation?.id || null,
      });
    } catch (error) {
      console.error('[Embed] Resume session failed:', error);
      res.status(500).json({ error: 'Failed to resume session' });
    }
  });

  app.get('/api/embed/config/:orgSlug', async (req, res) => {
    try {
      const { orgSlug } = req.params;
      
      const org = await storage.getOrganizationBySlug(orgSlug);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const categories = await storage.getAllSupportCategories();
      
      res.json({
        organization: {
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          primaryColor: org.primaryColor,
          secondaryColor: org.secondaryColor,
          welcomeMessage: org.welcomeMessage,
        },
        features: {
          aiEnabled: org.aiEnabled,
          knowledgeBaseEnabled: org.knowledgeBaseEnabled,
        },
        supportCategories: categories.map((c: SupportCategory) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          icon: c.icon,
        })),
      });
    } catch (error) {
      console.error('[Embed] Get config failed:', error);
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  });

  app.post('/api/embed/generate-secret', async (req, res) => {
    try {
      const secret = generateEmbedSecret();
      
      res.json({
        success: true,
        secret,
        instructions: `
Store this secret securely on your server. Use it to sign customer tokens:

1. Set as environment variable:
   EMBED_SECRET_YOUR_ORG_SLUG=${secret}

2. Generate tokens server-side:
   const token = createCustomerToken({
     email: customer.email,
     name: customer.name,
     externalId: customer.id,
     orgSlug: 'your-org-slug'
   }, '${secret}');

3. Pass token to embed widget:
   <script src="/embed/widget.js" 
           data-org="your-org-slug"
           data-customer-token="{{token}}">
   </script>
        `.trim(),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate secret' });
    }
  });
}
