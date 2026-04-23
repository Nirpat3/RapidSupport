/**
 * Conversation attachments — upload, list, and proxy-download files attached
 * to a RapidSupport conversation. Backed by shre-files (shared file node on
 * the platform).
 *
 * Endpoints:
 *   POST  /api/conversations/:id/files   — multipart upload (staff session)
 *   POST  /api/embed/conversations/:id/files — multipart upload from iframe (embed token)
 *   GET   /api/conversations/:id/files   — list attachments
 *   GET   /api/files/:fileId/download    — proxy download so iframe clients
 *                                          can grab files via this origin
 *                                          (shre-files may not be reachable
 *                                          from the public internet)
 */
import type { RouteContext } from './types';
import { requireAuth } from '../auth';
import multer from 'multer';
import { shreFiles } from '../services/shre-files-client';
import { verifyEmbedToken } from '../services/embed-tokens';
import { db } from '../db';
import { externalSystems, conversations, customers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { AIDataProtectionService } from '../services/ai-data-protection';

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME_PREFIXES = [
  'image/', 'video/', 'audio/', 'application/pdf', 'text/', 'application/json',
  'application/zip', 'application/msword',
  'application/vnd.openxmlformats-officedocument.',
  'application/vnd.ms-',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p))) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

function pushFileAttachedToWs(app: any, conversationId: string, meta: any) {
  try {
    const wsServer = (app as any).wsServer;
    if (!wsServer) return;
    // Many ways this codebase's WS might expose — try the broad ones
    if (typeof wsServer.broadcastToConversation === 'function') {
      wsServer.broadcastToConversation(conversationId, {
        type: 'file_attached',
        data: meta,
      });
      return;
    }
    if (typeof wsServer.pushToConversation === 'function') {
      wsServer.pushToConversation(conversationId, {
        type: 'file_attached',
        data: meta,
      });
      return;
    }
    if (typeof wsServer.broadcast === 'function') {
      wsServer.broadcast({ type: 'file_attached', conversationId, data: meta });
    }
  } catch (err) {
    console.error('[conversation-files][ws-push]', (err as Error).message);
  }
}

export function registerConversationFilesRoutes({ app }: RouteContext) {
  // Staff-authenticated upload
  app.post(
    '/api/conversations/:id/files',
    requireAuth,
    upload.single('file'),
    async (req: any, res) => {
      try {
        const conversationId = req.params.id;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const meta = await shreFiles.upload({
          name: file.originalname,
          content: file.buffer,
          mime: file.mimetype,
          uploadedBy: req.user?.id || 'staff',
          companyId: (req.user as any)?.organizationId || 'default',
          ownerApp: 'rapidsupport',
          entityType: 'conversation',
          entityId: conversationId,
        });

        pushFileAttachedToWs(app, conversationId, meta);
        res.status(201).json(meta);
      } catch (err: any) {
        console.error('[conversation-files][upload]', err);
        res.status(500).json({ error: err?.message || 'upload failed' });
      }
    },
  );

  // Embed (iframe customer) upload — auth via embed token in header
  app.post(
    '/api/embed/conversations/:id/files',
    upload.single('file'),
    async (req: any, res) => {
      try {
        const token = String(req.headers['x-embed-token'] || '').trim();
        if (!token) return res.status(401).json({ error: 'Missing X-Embed-Token' });

        // Peek payload → resolve external system secret → verify
        const parts = token.split('.');
        if (parts.length !== 2) return res.status(401).json({ error: 'malformed token' });
        let peekPayload: any;
        try {
          const json = Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
          peekPayload = JSON.parse(json);
        } catch {
          return res.status(401).json({ error: 'undecodable payload' });
        }
        if (!peekPayload?.externalSystemId) return res.status(401).json({ error: 'token missing externalSystemId' });

        const [row] = await db.select().from(externalSystems).where(eq(externalSystems.id, peekPayload.externalSystemId));
        if (!row || !row.isActive) return res.status(401).json({ error: 'integration not found' });
        const secret = AIDataProtectionService.decryptSensitiveData(row.embedSecretEncrypted);
        if (!secret || secret === '[DECRYPTION_FAILED]') return res.status(401).json({ error: 'integration secret unavailable' });

        const verified = verifyEmbedToken(token, secret);
        if (!verified.ok) return res.status(401).json({ error: `invalid token: ${verified.reason}` });

        const conversationId = req.params.id;

        // Confirm the conversation belongs to a customer in this token's org
        const [convo] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
        if (!convo) return res.status(404).json({ error: 'conversation not found' });
        if (convo.organizationId !== verified.payload.organizationId) {
          return res.status(403).json({ error: 'conversation does not belong to token org' });
        }

        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const meta = await shreFiles.upload({
          name: file.originalname,
          content: file.buffer,
          mime: file.mimetype,
          uploadedBy: `embed:${verified.payload.username}`,
          companyId: verified.payload.organizationId,
          ownerApp: 'rapidsupport',
          entityType: 'conversation',
          entityId: conversationId,
        });

        pushFileAttachedToWs(app, conversationId, meta);
        res.status(201).json(meta);
      } catch (err: any) {
        console.error('[embed-conversation-files][upload]', err);
        res.status(500).json({ error: err?.message || 'upload failed' });
      }
    },
  );

  // List attachments on a conversation
  app.get('/api/conversations/:id/files', requireAuth, async (req: any, res) => {
    try {
      const files = await shreFiles.list('rapidsupport', 'conversation', req.params.id);
      res.json({ files, count: files.length });
    } catch (err: any) {
      console.error('[conversation-files][list]', err);
      res.status(500).json({ error: err?.message || 'list failed' });
    }
  });

  // Proxy download — fetches from shre-files and streams back to the caller.
  // Lets iframe clients (on any public URL) grab files without needing direct
  // access to the shre-files host (which may only be reachable on LAN/Tailscale).
  app.get('/api/files/:fileId/download', async (req, res) => {
    try {
      const url = shreFiles.downloadUrl(req.params.fileId);
      const upstream = await fetch(url);
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: 'download failed' });
      }
      const mime = upstream.headers.get('content-type') || 'application/octet-stream';
      const disp = upstream.headers.get('content-disposition');
      res.setHeader('Content-Type', mime);
      if (disp) res.setHeader('Content-Disposition', disp);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      const arrayBuf = await upstream.arrayBuffer();
      res.end(Buffer.from(arrayBuf));
    } catch (err: any) {
      console.error('[files][download-proxy]', err);
      res.status(500).json({ error: err?.message || 'download proxy failed' });
    }
  });
}
