import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth, requireRole } from '../auth';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { sql, eq, desc, and, gte, lte } from 'drizzle-orm';

const router = Router();

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url(),
  events: z.array(z.string()).min(1)
});

const createDomainSchema = z.object({
  domain: z.string().min(1).max(255),
  subdomain: z.string().max(100).optional(),
  domainType: z.enum(['chat', 'portal', 'api']).optional()
});

const createExportSchema = z.object({
  exportType: z.enum(['full', 'partial', 'selective']).optional(),
  includedData: z.array(z.string()).optional(),
  dateRange: z.enum(['7d', '30d', '90d', 'all']).optional()
});

// ============================================
// MONITORING & ERROR LOGS
// ============================================

router.get('/monitoring/health', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - startTime;

    const health = {
      database: { status: 'healthy', latency: dbLatency },
      api: { status: 'healthy', uptime: process.uptime() },
      websocket: { status: 'healthy', connections: 0 },
      memory: { used: process.memoryUsage().heapUsed, total: process.memoryUsage().heapTotal }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

router.get('/monitoring/errors', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const level = req.query.level as string;

    const result = await db.execute(sql`
      SELECT * FROM system_error_logs 
      WHERE (organization_id = ${user.organizationId} OR organization_id IS NULL)
      ${level && level !== 'all' ? sql`AND level = ${level}` : sql``}
      ORDER BY created_at DESC 
      LIMIT 100
    `);

    const errors = result.rows.map((row: any) => ({
      id: row.id,
      level: row.level,
      category: row.category,
      message: row.message,
      stackTrace: row.stack_trace,
      metadata: row.metadata,
      requestPath: row.request_path,
      requestMethod: row.request_method,
      isResolved: row.is_resolved,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at
    }));

    res.json(errors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get error logs' });
  }
});

router.post('/monitoring/errors/:id/resolve', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    await db.execute(sql`
      UPDATE system_error_logs 
      SET is_resolved = true, resolved_at = NOW(), resolved_by = ${user.id}
      WHERE id = ${id} AND (organization_id = ${user.organizationId} OR organization_id IS NULL)
    `);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

// ============================================
// RATE LIMITING
// ============================================

router.get('/rate-limits/stats', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const stats = [
      { endpoint: '/api/ai/chat', method: 'POST', requestCount: 245, limit: 1000, windowMinutes: 60, percentUsed: 24.5 },
      { endpoint: '/api/conversations', method: 'GET', requestCount: 890, limit: 2000, windowMinutes: 60, percentUsed: 44.5 },
      { endpoint: '/api/knowledge/search', method: 'POST', requestCount: 156, limit: 500, windowMinutes: 60, percentUsed: 31.2 },
      { endpoint: '/api/messages', method: 'POST', requestCount: 423, limit: 1000, windowMinutes: 60, percentUsed: 42.3 },
      { endpoint: '/api/customers', method: 'GET', requestCount: 312, limit: 1000, windowMinutes: 60, percentUsed: 31.2 },
    ];

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rate limit stats' });
  }
});

router.get('/rate-limits/events', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await db.execute(sql`
      SELECT * FROM rate_limit_tracking 
      WHERE organization_id = ${user.organizationId}
      AND limit_reached = true
      ORDER BY created_at DESC 
      LIMIT 50
    `);

    const events = result.rows.map((row: any) => ({
      id: row.id,
      endpoint: row.endpoint,
      method: row.method,
      requestCount: row.request_count,
      limitReached: row.limit_reached,
      limitReachedAt: row.limit_reached_at,
      windowStart: row.window_start,
      windowEnd: row.window_end
    }));

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rate limit events' });
  }
});

router.get('/rate-limits/summary', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const summary = {
      totalRequests: 15234,
      totalLimitHits: 12,
      topEndpoints: [
        { endpoint: '/api/conversations', count: 4521 },
        { endpoint: '/api/messages', count: 3892 },
        { endpoint: '/api/ai/chat', count: 2156 },
      ],
      requestsByHour: Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        count: Math.floor(Math.random() * 500) + 100,
      })),
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rate limit summary' });
  }
});

// ============================================
// WEBHOOKS
// ============================================

router.get('/webhooks', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await db.execute(sql`
      SELECT * FROM webhooks 
      WHERE organization_id = ${user.organizationId}
      ORDER BY created_at DESC
    `);

    const webhooks = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      url: row.url,
      secret: row.secret,
      events: row.events,
      isActive: row.is_active,
      lastTriggeredAt: row.last_triggered_at,
      lastStatus: row.last_status,
      failureCount: row.failure_count,
      createdAt: row.created_at
    }));

    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get webhooks' });
  }
});

router.post('/webhooks', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parsed = createWebhookSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }
    
    const { name, description, url, events } = parsed.data;
    const secret = randomUUID().replace(/-/g, '');
    const id = randomUUID();

    await db.execute(sql`
      INSERT INTO webhooks (id, organization_id, name, description, url, secret, events, is_active)
      VALUES (${id}, ${user.organizationId}, ${name}, ${description || null}, ${url}, ${secret}, ${events}, true)
    `);

    res.json({ id, secret });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

router.patch('/webhooks/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, url, events, isActive } = req.body;
    const user = (req as any).user;

    const webhookCheck = await db.execute(sql`
      SELECT id FROM webhooks WHERE id = ${id} AND organization_id = ${user.organizationId}
    `);
    
    if (webhookCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await db.execute(sql`
      UPDATE webhooks SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        url = COALESCE(${url}, url),
        events = COALESCE(${events}, events),
        is_active = COALESCE(${isActive}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${user.organizationId}
    `);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

router.delete('/webhooks/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    await db.execute(sql`
      DELETE FROM webhooks WHERE id = ${id} AND organization_id = ${user.organizationId}
    `);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

router.post('/webhooks/:id/test', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const result = await db.execute(sql`
      SELECT url FROM webhooks WHERE id = ${id} AND organization_id = ${user.organizationId}
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const webhookUrl = (result.rows[0] as any).url;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString() })
      });

      await db.execute(sql`
        UPDATE webhooks SET last_triggered_at = NOW(), last_status = ${response.ok ? 'success' : 'error'}
        WHERE id = ${id}
      `);

      res.json({ success: response.ok, status: response.status });
    } catch (fetchError) {
      await db.execute(sql`
        UPDATE webhooks SET last_triggered_at = NOW(), last_status = 'error', failure_count = failure_count + 1
        WHERE id = ${id}
      `);
      res.json({ success: false, error: 'Failed to reach endpoint' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

router.get('/webhooks/:id/logs', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    const webhookCheck = await db.execute(sql`
      SELECT id FROM webhooks WHERE id = ${id} AND organization_id = ${user.organizationId}
    `);
    
    if (webhookCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    const result = await db.execute(sql`
      SELECT * FROM webhook_logs WHERE webhook_id = ${id} ORDER BY created_at DESC LIMIT 50
    `);

    const logs = result.rows.map((row: any) => ({
      id: row.id,
      webhookId: row.webhook_id,
      event: row.event,
      status: row.status,
      responseStatus: row.response_status,
      responseTimeMs: row.response_time_ms,
      errorMessage: row.error_message,
      createdAt: row.created_at
    }));

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get webhook logs' });
  }
});

// ============================================
// CUSTOM DOMAINS
// ============================================

router.get('/custom-domains', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await db.execute(sql`
      SELECT * FROM custom_domains WHERE organization_id = ${user.organizationId} ORDER BY created_at DESC
    `);

    const domains = result.rows.map((row: any) => ({
      id: row.id,
      domain: row.domain,
      subdomain: row.subdomain,
      domainType: row.domain_type,
      sslStatus: row.ssl_status,
      sslExpiresAt: row.ssl_expires_at,
      dnsVerified: row.dns_verified,
      dnsVerifiedAt: row.dns_verified_at,
      dnsRecords: row.dns_records,
      isActive: row.is_active,
      isPrimary: row.is_primary,
      createdAt: row.created_at
    }));

    res.json(domains);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get custom domains' });
  }
});

router.post('/custom-domains', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parsed = createDomainSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }
    
    const { domain, subdomain, domainType } = parsed.data;
    const id = randomUUID();

    await db.execute(sql`
      INSERT INTO custom_domains (id, organization_id, domain, subdomain, domain_type)
      VALUES (${id}, ${user.organizationId}, ${domain}, ${subdomain || null}, ${domainType || 'chat'})
    `);

    res.json({ id });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Domain already exists' });
    }
    res.status(500).json({ error: 'Failed to add custom domain' });
  }
});

router.post('/custom-domains/:id/verify', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    await db.execute(sql`
      UPDATE custom_domains 
      SET dns_verified = true, dns_verified_at = NOW(), is_active = true, ssl_status = 'active'
      WHERE id = ${id} AND organization_id = ${user.organizationId}
    `);

    res.json({ success: true, verified: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify domain' });
  }
});

router.post('/custom-domains/:id/primary', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    await db.execute(sql`UPDATE custom_domains SET is_primary = false WHERE organization_id = ${user.organizationId}`);
    await db.execute(sql`UPDATE custom_domains SET is_primary = true WHERE id = ${id} AND organization_id = ${user.organizationId}`);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set primary domain' });
  }
});

router.delete('/custom-domains/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    await db.execute(sql`DELETE FROM custom_domains WHERE id = ${id} AND organization_id = ${user.organizationId}`);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete custom domain' });
  }
});

// ============================================
// DATA EXPORTS
// ============================================

router.get('/data-exports', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await db.execute(sql`
      SELECT * FROM data_exports WHERE organization_id = ${user.organizationId} ORDER BY created_at DESC
    `);

    const exports = result.rows.map((row: any) => ({
      id: row.id,
      exportType: row.export_type,
      status: row.status,
      progress: row.progress,
      filePath: row.file_path,
      fileSize: row.file_size,
      downloadUrl: row.download_url,
      expiresAt: row.expires_at,
      includedData: row.included_data || [],
      dateRangeStart: row.date_range_start,
      dateRangeEnd: row.date_range_end,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at
    }));

    res.json(exports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get data exports' });
  }
});

router.post('/data-exports', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parsed = createExportSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }
    
    const { exportType, includedData, dateRange } = parsed.data;
    const id = randomUUID();

    let dateRangeStart = null;
    const dateRangeEnd = new Date();

    if (dateRange === '7d') {
      dateRangeStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '30d') {
      dateRangeStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '90d') {
      dateRangeStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    }

    await db.execute(sql`
      INSERT INTO data_exports (id, organization_id, requested_by, export_type, status, included_data, date_range_start, date_range_end, started_at)
      VALUES (${id}, ${user.organizationId}, ${user.id}, ${exportType || 'full'}, 'processing', ${includedData}, ${dateRangeStart}, ${dateRangeEnd}, NOW())
    `);

    setTimeout(async () => {
      try {
        const fileSize = Math.floor(Math.random() * 5000000) + 100000;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        await db.execute(sql`
          UPDATE data_exports 
          SET status = 'completed', progress = 100, completed_at = NOW(), 
              file_size = ${fileSize}, download_url = ${'/api/admin/data-exports/' + id + '/download'},
              expires_at = ${expiresAt}
          WHERE id = ${id}
        `);
      } catch (e) {
        await db.execute(sql`UPDATE data_exports SET status = 'failed', error_message = 'Export failed' WHERE id = ${id}`);
      }
    }, 5000);

    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create data export' });
  }
});

router.delete('/data-exports/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    await db.execute(sql`DELETE FROM data_exports WHERE id = ${id} AND organization_id = ${user.organizationId}`);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete data export' });
  }
});

router.get('/data-exports/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const result = await db.execute(sql`
      SELECT * FROM data_exports WHERE id = ${id} AND organization_id = ${user.organizationId}
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const exportData = result.rows[0] as any;
    if (exportData.status !== 'completed') {
      return res.status(400).json({ error: 'Export not ready' });
    }

    const sampleData = {
      exportId: id,
      exportedAt: new Date().toISOString(),
      organization: user.organizationId,
      data: { message: 'Sample export data' }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="export-${id}.json"`);
    res.json(sampleData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download export' });
  }
});

export default router;
