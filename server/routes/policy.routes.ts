import type { RouteContext } from './types';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requireRole } from '../auth';
import { generatePolicy, getAvailableRegions, getPolicyTypes, type PolicyType, type RegionCode } from '../policy-generator-service';

export function registerPolicyRoutes({ app }: RouteContext) {
  // Get available regions for policy generation
  app.get('/api/policies/regions', (req, res) => {
    const regions = getAvailableRegions();
    res.json(regions);
  });

  // Get available policy types
  app.get('/api/policies/types', (req, res) => {
    const types = getPolicyTypes();
    res.json(types);
  });

  // Generate a new policy using AI
  app.post('/api/policies/generate', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const generateSchema = z.object({
        type: z.enum(['terms', 'privacy', 'cookies']),
        region: z.enum(['us', 'eu', 'uk', 'caribbean', 'global', 'ca', 'au', 'latam', 'asia']),
        companyName: z.string().min(1),
        websiteUrl: z.string().optional(),
        industry: z.string().optional(),
        additionalContext: z.string().optional(),
        organizationId: z.string().optional()
      });

      const data = generateSchema.parse(req.body);
      const user = req.user as any;

      // Check if policy already exists for this org/type/region
      const existing = await storage.getLegalPolicyByTypeAndRegion(
        data.organizationId || null, 
        data.type, 
        data.region
      );

      // Generate the policy using OpenAI
      const generated = await generatePolicy({
        type: data.type as PolicyType,
        region: data.region as RegionCode,
        companyName: data.companyName,
        websiteUrl: data.websiteUrl,
        industry: data.industry,
        additionalContext: data.additionalContext
      });

      // Build the prompt for reference
      const generationPrompt = JSON.stringify({
        type: data.type,
        region: data.region,
        companyName: data.companyName,
        websiteUrl: data.websiteUrl,
        industry: data.industry,
        additionalContext: data.additionalContext
      });

      if (existing) {
        // Update existing policy
        const updated = await storage.updateLegalPolicy(existing.id, {
          title: generated.title,
          content: generated.content,
          summary: generated.summary,
          generatedByAi: true,
          aiModel: 'gpt-5',
          generationPrompt,
          version: incrementVersion(existing.version),
          status: 'draft'
        });
        return res.json(updated);
      }

      // Create new policy
      const policy = await storage.createLegalPolicy({
        organizationId: data.organizationId || null,
        type: data.type,
        region: data.region,
        title: generated.title,
        content: generated.content,
        summary: generated.summary,
        generatedByAi: true,
        aiModel: 'gpt-5',
        generationPrompt,
        version: '1.0',
        status: 'draft',
        createdBy: user.id
      });

      res.status(201).json(policy);
    } catch (error: any) {
      console.error('Error generating policy:', error);
      res.status(500).json({ error: error.message || 'Failed to generate policy' });
    }
  });

  // Get all policies for an organization (or platform-wide if no org specified)
  app.get('/api/policies', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      const policies = await storage.getLegalPoliciesByOrganization(organizationId || null);
      res.json(policies);
    } catch (error: any) {
      console.error('Error fetching policies:', error);
      res.status(500).json({ error: 'Failed to fetch policies' });
    }
  });

  // Get a specific policy by ID
  app.get('/api/policies/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const policy = await storage.getLegalPolicy(req.params.id);
      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }
      res.json(policy);
    } catch (error: any) {
      console.error('Error fetching policy:', error);
      res.status(500).json({ error: 'Failed to fetch policy' });
    }
  });

  // Update a policy
  app.patch('/api/policies/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const updateSchema = z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        summary: z.string().optional(),
        status: z.enum(['draft', 'published', 'archived']).optional()
      });

      const data = updateSchema.parse(req.body);
      const user = req.user as any;

      const existing = await storage.getLegalPolicy(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      const updates: any = { ...data };
      
      // If publishing, set publish metadata
      if (data.status === 'published' && existing.status !== 'published') {
        updates.publishedAt = new Date();
        updates.publishedBy = user.id;
      }

      const updated = await storage.updateLegalPolicy(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating policy:', error);
      res.status(500).json({ error: 'Failed to update policy' });
    }
  });

  // Delete a policy
  app.delete('/api/policies/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteLegalPolicy(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting policy:', error);
      res.status(500).json({ error: 'Failed to delete policy' });
    }
  });

  // ============================================================================
  // PUBLIC POLICY ENDPOINTS (no auth required)
  // ============================================================================

  // Get published policies for an organization by slug
  app.get('/api/public/org/:slug/policies', async (req, res) => {
    try {
      const org = await storage.getOrganizationBySlug(req.params.slug);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const policies = await storage.getPublishedPolicies(org.id);
      res.json(policies);
    } catch (error: any) {
      console.error('Error fetching public policies:', error);
      res.status(500).json({ error: 'Failed to fetch policies' });
    }
  });

  // Get a specific published policy by type and region for an organization
  app.get('/api/public/org/:slug/policies/:type', async (req, res) => {
    try {
      const org = await storage.getOrganizationBySlug(req.params.slug);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const region = (req.query.region as string) || 'global';
      const policy = await storage.getLegalPolicyByTypeAndRegion(org.id, req.params.type, region);
      
      if (!policy || policy.status !== 'published') {
        // Fall back to global version if region-specific not found
        const globalPolicy = await storage.getLegalPolicyByTypeAndRegion(org.id, req.params.type, 'global');
        if (!globalPolicy || globalPolicy.status !== 'published') {
          return res.status(404).json({ error: 'Policy not found' });
        }
        return res.json(globalPolicy);
      }
      
      res.json(policy);
    } catch (error: any) {
      console.error('Error fetching public policy:', error);
      res.status(500).json({ error: 'Failed to fetch policy' });
    }
  });

  // Get platform-wide published policies (no org)
  app.get('/api/public/policies', async (req, res) => {
    try {
      const policies = await storage.getPublishedPolicies(null);
      res.json(policies);
    } catch (error: any) {
      console.error('Error fetching public policies:', error);
      res.status(500).json({ error: 'Failed to fetch policies' });
    }
  });

  // Get a specific platform-wide policy by type
  app.get('/api/public/policies/:type', async (req, res) => {
    try {
      const region = (req.query.region as string) || 'global';
      const policy = await storage.getLegalPolicyByTypeAndRegion(null, req.params.type, region);
      
      if (!policy || policy.status !== 'published') {
        // Fall back to global version
        const globalPolicy = await storage.getLegalPolicyByTypeAndRegion(null, req.params.type, 'global');
        if (!globalPolicy || globalPolicy.status !== 'published') {
          return res.status(404).json({ error: 'Policy not found' });
        }
        return res.json(globalPolicy);
      }
      
      res.json(policy);
    } catch (error: any) {
      console.error('Error fetching public policy:', error);
      res.status(500).json({ error: 'Failed to fetch policy' });
    }
  });
}

function incrementVersion(version: string): string {
  const parts = version.split('.');
  const minor = parseInt(parts[1] || '0', 10) + 1;
  return `${parts[0]}.${minor}`;
}
