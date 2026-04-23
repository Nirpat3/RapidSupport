import { type RouteContext } from './types';
import { storage } from '../storage';
import { requireAuth, requireRole } from '../auth';
import { requireCustomerAuth } from '../middleware/customerAuth';
import { zodErrorResponse } from '../middleware/errors';
import { z } from 'zod';
import { 
  insertCommPostSchema, 
  insertCommPostCommentSchema, 
  insertCommChannelSchema,
  insertCommChannelMessageSchema,
  insertCommDirectThreadSchema,
  insertCommDirectMessageSchema
} from '@shared/schema';

export function registerCommunicationRoutes({ app }: RouteContext) {

  // ============================================
  // STAFF / ADMIN ROUTES
  // ============================================

  // POSTS (Announcements + Feed + Community)
  app.get('/api/comm/posts', requireAuth, async (req, res) => {
    try {
      const type = req.query.type as string;
      const audience = req.query.audience as string;
      const visibility = req.query.visibility as string;
      const user = req.user as any;
      const organizationId = user.organizationId;
      // Staff can also see platform-wide announcements from superadmin
      const posts = await storage.getCommPosts({ type, organizationId, audience, visibility, includePlatform: true });
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  // Platform-wide announcements - superadmin only
  app.get('/api/comm/platform-posts', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.isPlatformAdmin) return res.status(403).json({ error: 'Platform admins only' });
      const type = req.query.type as string;
      const posts = await storage.getPlatformAnnouncements(type);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch platform posts' });
    }
  });

  app.get('/api/comm/announcements/stats', requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as any).organizationId;
      const posts = await storage.getCommPosts({ type: 'announcement', organizationId, includePlatform: true });
      const stats: Record<string, { read: number, total: number }> = {};
      
      for (const post of posts) {
        const reads = await storage.getCommPostReads(post.id);
        const total = await storage.getExpectedReadCount(post.id);
        stats[post.id] = { read: reads.length, total };
      }
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch announcement stats' });
    }
  });

  app.post('/api/comm/posts', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      const isPlatformAdmin = user.isPlatformAdmin;
      // Platform admins posting with audience='platform' can use any orgId (use first org or a sentinel)
      let organizationId = user.organizationId;
      if (isPlatformAdmin && req.body.audience === 'platform' && !organizationId) {
        const orgs = await storage.getAllOrganizations();
        organizationId = orgs[0]?.id || 'platform';
      }
      const data = insertCommPostSchema.parse({
        ...req.body,
        authorId: user.id,
        authorType: isPlatformAdmin ? 'superadmin' : 'staff',
        organizationId,
      });
      const post = await storage.createCommPost(data);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  app.patch('/api/comm/posts/:id', requireAuth, async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const user = req.user as any;
      if (!user.isPlatformAdmin && existingPost.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Forbidden: Cannot update post from another organization' });
      }

      const post = await storage.updateCommPost(req.params.id, req.body);
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update post' });
    }
  });

  app.delete('/api/comm/posts/:id', requireAuth, async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const user = req.user as any;
      if (!user.isPlatformAdmin && existingPost.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Forbidden: Cannot delete post from another organization' });
      }

      await storage.deleteCommPost(req.params.id);
      res.json({ message: 'Post archived' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to archive post' });
    }
  });

  app.post('/api/comm/posts/:id/read', requireAuth, async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const read = await storage.markCommPostRead(req.params.id, (req.user as any).id, 'staff');
      res.json(read);
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark post as read' });
    }
  });

  app.post('/api/comm/posts/:id/react', requireAuth, async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const { emoji } = req.body;
      await storage.toggleCommPostReaction(req.params.id, (req.user as any).id, 'staff', emoji);
      res.json({ message: 'Reaction toggled' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle reaction' });
    }
  });

  app.get('/api/comm/posts/:id/comments', requireAuth, async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const comments = await storage.getCommPostComments(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  app.post('/api/comm/posts/:id/comments', requireAuth, async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const data = insertCommPostCommentSchema.parse({
        ...req.body,
        postId: req.params.id,
        authorId: (req.user as any).id,
        authorType: 'staff',
      });
      const comment = await storage.createCommPostComment(data);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // CHANNELS (Community)
  app.get('/api/comm/channels', requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as any).organizationId;
      const channels = await storage.getCommChannels({ organizationId, memberId: (req.user as any).id });
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  });

  app.post('/api/comm/channels', requireAuth, async (req, res) => {
    try {
      const data = insertCommChannelSchema.parse({
        ...req.body,
        organizationId: (req.user as any).organizationId,
        createdById: (req.user as any).id,
        createdByType: 'staff',
      });
      const channel = await storage.createCommChannel(data, (req.user as any).id, 'staff');
      res.status(201).json(channel);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to create channel' });
    }
  });

  app.get('/api/comm/channels/:id/messages', requireAuth, async (req, res) => {
    try {
      const messages = await storage.getCommChannelMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/comm/channels/:id/messages', requireAuth, async (req, res) => {
    try {
      const data = insertCommChannelMessageSchema.parse({
        ...req.body,
        channelId: req.params.id,
        authorId: (req.user as any).id,
        authorType: 'staff',
      });
      const message = await storage.createCommChannelMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // DIRECT MESSAGES
  app.get('/api/comm/dms', requireAuth, async (req, res) => {
    try {
      const threads = await storage.getCommDirectThreads((req.user as any).id, 'staff');
      res.json(threads);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch DMs' });
    }
  });

  app.post('/api/comm/dms', requireAuth, async (req, res) => {
    try {
      const data = insertCommDirectThreadSchema.parse({
        ...req.body,
        organizationId: (req.user as any).organizationId,
        participantAId: (req.user as any).id,
        participantAType: 'staff',
      });
      const thread = await storage.getOrCreateCommDirectThread(data);
      res.status(201).json(thread);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to start DM thread' });
    }
  });

  app.get('/api/comm/dms/:threadId/messages', requireAuth, async (req, res) => {
    try {
      const messages = await storage.getCommDirectMessages(req.params.threadId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch DM messages' });
    }
  });

  app.post('/api/comm/dms/:threadId/messages', requireAuth, async (req, res) => {
    try {
      const data = insertCommDirectMessageSchema.parse({
        ...req.body,
        threadId: req.params.threadId,
        senderId: (req.user as any).id,
        senderType: 'staff',
      });
      const message = await storage.createCommDirectMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to send DM' });
    }
  });


  // ============================================
  // CUSTOMER PORTAL ROUTES
  // ============================================

  app.use('/api/customer-portal/comm', requireCustomerAuth);

  app.get('/api/customer-portal/comm/posts', async (req, res) => {
    try {
      const customerOrgId = (req.session as any).customerOrganizationId;
      const organizationId = (req.session as any).organizationId;
      const type = req.query.type as string | undefined;
      const posts = await storage.getCommPostsForCustomer(customerOrgId, organizationId, type);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  app.post('/api/customer-portal/comm/posts', async (req, res) => {
    try {
      const session = req.session as any;
      // Customers can post community posts with public or private visibility
      const data = insertCommPostSchema.parse({
        ...req.body,
        authorId: session.customerId,
        authorType: 'customer',
        type: req.body.type || 'community',
        audience: 'org_customers',
        visibility: req.body.visibility || 'public',
        organizationId: session.organizationId,
      });
      const post = await storage.createCommPost(data);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  app.post('/api/customer-portal/comm/posts/:id/read', async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const read = await storage.markCommPostRead(req.params.id, (req.session as any).customerId, 'customer');
      res.json(read);
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark post as read' });
    }
  });

  app.post('/api/customer-portal/comm/posts/:id/react', async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const { emoji } = req.body;
      await storage.toggleCommPostReaction(req.params.id, (req.session as any).customerId, 'customer', emoji);
      res.json({ message: 'Reaction toggled' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle reaction' });
    }
  });

  app.get('/api/customer-portal/comm/posts/:id/comments', async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const comments = await storage.getCommPostComments(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  app.post('/api/customer-portal/comm/posts/:id/comments', async (req, res) => {
    try {
      const existingPost = await storage.getCommPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const data = insertCommPostCommentSchema.parse({
        ...req.body,
        postId: req.params.id,
        authorId: (req.session as any).customerId,
        authorType: 'customer',
      });
      const comment = await storage.createCommPostComment(data);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // CUSTOMER PORTAL CHANNELS
  app.get('/api/customer-portal/comm/channels', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const organizationId = (req.session as any).organizationId;
      const channels = await storage.getCommChannels({ organizationId, memberId: customerId });
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  });

  app.post('/api/customer-portal/comm/channels', async (req, res) => {
    try {
      const data = insertCommChannelSchema.parse({
        ...req.body,
        organizationId: (req.session as any).organizationId,
        customerOrgId: (req.session as any).customerOrganizationId,
        createdById: (req.session as any).customerId,
        createdByType: 'customer',
      });
      const channel = await storage.createCommChannel(data, (req.session as any).customerId, 'customer');
      res.status(201).json(channel);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to create channel' });
    }
  });

  app.get('/api/customer-portal/comm/channels/:id/messages', async (req, res) => {
    try {
      const messages = await storage.getCommChannelMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/customer-portal/comm/channels/:id/messages', async (req, res) => {
    try {
      const data = insertCommChannelMessageSchema.parse({
        ...req.body,
        channelId: req.params.id,
        authorId: (req.session as any).customerId,
        authorType: 'customer',
      });
      const message = await storage.createCommChannelMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // CUSTOMER PORTAL DMs
  app.get('/api/customer-portal/comm/dms', async (req, res) => {
    try {
      const threads = await storage.getCommDirectThreads((req.session as any).customerId, 'customer');
      res.json(threads);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch DMs' });
    }
  });

  app.post('/api/customer-portal/comm/dms', async (req, res) => {
    try {
      const data = insertCommDirectThreadSchema.parse({
        ...req.body,
        organizationId: (req.session as any).organizationId,
        participantAId: (req.session as any).customerId,
        participantAType: 'customer',
      });
      const thread = await storage.getOrCreateCommDirectThread(data);
      res.status(201).json(thread);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to start DM thread' });
    }
  });

  app.get('/api/customer-portal/comm/dms/:threadId/messages', async (req, res) => {
    try {
      const messages = await storage.getCommDirectMessages(req.params.threadId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch DM messages' });
    }
  });

  app.post('/api/customer-portal/comm/dms/:threadId/messages', async (req, res) => {
    try {
      const data = insertCommDirectMessageSchema.parse({
        ...req.body,
        threadId: req.params.threadId,
        senderId: (req.session as any).customerId,
        senderType: 'customer',
      });
      const message = await storage.createCommDirectMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json(zodErrorResponse(error));
      res.status(500).json({ error: 'Failed to send DM' });
    }
  });
}
