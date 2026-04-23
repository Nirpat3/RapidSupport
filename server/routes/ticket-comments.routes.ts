/**
 * Ticket Comments Routes
 * Manages the comment thread on support tickets.
 * Used by agents (full access) and customers (public comments only).
 */
import { storage } from '../storage';
import { requireAuth } from '../auth';
import { db } from '../db';
import { ticketComments, tickets, customers } from '@shared/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import type { RouteContext } from './types';
import { sendTicketUpdatedEmail, sendTicketClosedEmail } from '../services/sendgrid.service';
import { sendTicketUpdatedSms, sendTicketClosedSms } from '../services/twilio-sms.service';

const addCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().optional().default(false),
});

export function registerTicketCommentRoutes({ app }: RouteContext) {
  // GET /api/tickets/:id/comments — list comments (staff: all; customers: public only)
  app.get('/api/tickets/:id/comments', async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      // Verify ticket exists and access
      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      const allComments = await db
        .select()
        .from(ticketComments)
        .where(eq(ticketComments.ticketId, id))
        .orderBy(asc(ticketComments.createdAt));

      // If staff: return all; if customer (session-based): hide internal
      const isStaff = user && (user.role === 'admin' || user.role === 'agent');
      const comments = isStaff ? allComments : allComments.filter(c => !c.isInternal);

      res.json(comments);
    } catch (error) {
      console.error('[TicketComments] Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // POST /api/tickets/:id/comments — add a comment (staff only for internal; customers can add public)
  app.post('/api/tickets/:id/comments', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const parsed = addCommentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid comment data' });

      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      const isStaff = user.role === 'admin' || user.role === 'agent';
      const isInternal = isStaff ? (parsed.data.isInternal ?? false) : false;

      const [comment] = await db.insert(ticketComments).values({
        ticketId: id,
        authorId: user.id,
        authorType: isStaff ? 'agent' : 'customer',
        authorName: user.name || user.email,
        content: parsed.data.content,
        isInternal,
      }).returning();

      // Notify customer of new agent comment (non-internal)
      if (isStaff && !isInternal && ticket.customerId) {
        await notifyCustomerOfComment(ticket, comment.content, user.name || 'Support Agent');
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error('[TicketComments] Error adding comment:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // DELETE /api/tickets/:id/comments/:commentId — delete comment (admin only)
  app.delete('/api/tickets/:id/comments/:commentId', requireAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
      const user = req.user as any;
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

      await db.delete(ticketComments).where(eq(ticketComments.id, commentId));
      res.json({ success: true });
    } catch (error) {
      console.error('[TicketComments] Error deleting comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  // PATCH /api/tickets/:id/status — update ticket status + send notifications
  app.patch('/api/tickets/:id/status', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, comment } = req.body;
      const user = req.user as any;

      if (!['open', 'in-progress', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      const updates: any = {
        status,
        updatedAt: new Date(),
      };
      if (status === 'closed') updates.resolvedAt = new Date();

      const [updated] = await db.update(tickets).set(updates).where(eq(tickets.id, id)).returning();

      // Add system comment for status change
      await db.insert(ticketComments).values({
        ticketId: id,
        authorType: 'system',
        authorName: 'System',
        content: `Ticket status changed to ${status}${comment ? `: ${comment}` : ''} by ${user.name || 'agent'}.`,
        isInternal: false,
      });

      // Send customer notification
      await notifyCustomerOfStatusChange(updated, status, comment);

      res.json(updated);
    } catch (error) {
      console.error('[TicketComments] Error updating status:', error);
      res.status(500).json({ error: 'Failed to update ticket status' });
    }
  });

  // GET /api/customer/tickets — customer portal: list their tickets
  app.get('/api/customer/tickets', async (req, res) => {
    try {
      const session = req.session as any;
      const customerId = session?.customerId;
      if (!customerId) return res.status(401).json({ error: 'Not authenticated' });

      const customerTickets = await db
        .select()
        .from(tickets)
        .where(eq(tickets.customerId, customerId))
        .orderBy(asc(tickets.createdAt));

      res.json(customerTickets);
    } catch (error) {
      console.error('[CustomerTickets] Error:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  });

  // GET /api/customer/tickets/:id — single ticket details for customer
  app.get('/api/customer/tickets/:id', async (req, res) => {
    try {
      const session = req.session as any;
      const customerId = session?.customerId;
      if (!customerId) return res.status(401).json({ error: 'Not authenticated' });

      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, req.params.id));
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      if (ticket.customerId !== customerId) return res.status(403).json({ error: 'Forbidden' });

      const comments = await db
        .select()
        .from(ticketComments)
        .where(eq(ticketComments.ticketId, ticket.id))
        .orderBy(asc(ticketComments.createdAt));

      res.json({ ...ticket, comments: comments.filter(c => !c.isInternal) });
    } catch (error) {
      console.error('[CustomerTickets] Error:', error);
      res.status(500).json({ error: 'Failed to fetch ticket' });
    }
  });

  // POST /api/customer/tickets/:id/comments — customer adds a comment
  app.post('/api/customer/tickets/:id/comments', async (req, res) => {
    try {
      const session = req.session as any;
      const customerId = session?.customerId;
      if (!customerId) return res.status(401).json({ error: 'Not authenticated' });

      const parsed = addCommentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid content' });

      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, req.params.id));
      if (!ticket || ticket.customerId !== customerId) return res.status(403).json({ error: 'Forbidden' });

      const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));

      const [comment] = await db.insert(ticketComments).values({
        ticketId: ticket.id,
        authorId: customerId,
        authorType: 'customer',
        authorName: customer?.name || 'Customer',
        content: parsed.data.content,
        isInternal: false,
      }).returning();

      // Reopen ticket if it was closed
      if (ticket.status === 'closed') {
        await db.update(tickets).set({ status: 'open', updatedAt: new Date() }).where(eq(tickets.id, ticket.id));
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error('[CustomerTickets] Error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // PATCH /api/customer/notification-preferences — update SMS/email opt-in
  app.patch('/api/customer/notification-preferences', async (req, res) => {
    try {
      const session = req.session as any;
      const customerId = session?.customerId;
      if (!customerId) return res.status(401).json({ error: 'Not authenticated' });

      const schema = z.object({
        smsOptIn: z.boolean().optional(),
        emailOptIn: z.boolean().optional(),
        phone: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid data' });

      const updates: any = { updatedAt: new Date() };
      if (parsed.data.smsOptIn !== undefined) updates.smsOptIn = parsed.data.smsOptIn;
      if (parsed.data.emailOptIn !== undefined) updates.emailOptIn = parsed.data.emailOptIn;
      if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;

      await db.update(customers).set(updates).where(eq(customers.id, customerId));

      res.json({ success: true });
    } catch (error) {
      console.error('[NotificationPrefs] Error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });
}

// Helper: notify customer of agent comment
async function notifyCustomerOfComment(ticket: any, comment: string, agentName: string) {
  try {
    if (!ticket.customerId) return;
    const [customer] = await db.select().from(customers).where(eq(customers.id, ticket.customerId));
    if (!customer) return;

    const ref = ticket.id.slice(0, 8).toUpperCase();

    if (customer.emailOptIn && customer.email) {
      await sendTicketUpdatedEmail(
        customer.email,
        customer.name,
        ticket.id,
        ticket.status,
        `${agentName}: ${comment}`
      );
    }
    if (customer.smsOptIn && customer.phone) {
      await sendTicketUpdatedSms(customer.phone, ticket.id, ticket.status);
    }
  } catch (err) {
    console.error('[TicketComments] Notification error:', err);
  }
}

// Helper: notify customer of ticket status change
async function notifyCustomerOfStatusChange(ticket: any, status: string, comment?: string) {
  try {
    if (!ticket.customerId) return;
    const [customer] = await db.select().from(customers).where(eq(customers.id, ticket.customerId));
    if (!customer) return;

    if (status === 'closed') {
      if (customer.emailOptIn && customer.email) {
        const surveyUrl = ticket.surveyToken
          ? `${process.env.APP_URL || ''}/survey/${ticket.surveyToken}`
          : undefined;
        await sendTicketClosedEmail(customer.email, customer.name, ticket.id, surveyUrl);
      }
      if (customer.smsOptIn && customer.phone) {
        await sendTicketClosedSms(customer.phone, ticket.id);
      }
    } else {
      if (customer.emailOptIn && customer.email) {
        await sendTicketUpdatedEmail(customer.email, customer.name, ticket.id, status, comment);
      }
      if (customer.smsOptIn && customer.phone) {
        await sendTicketUpdatedSms(customer.phone, ticket.id, status);
      }
    }
  } catch (err) {
    console.error('[TicketStatus] Notification error:', err);
  }
}
