/**
 * Thin client for shre-files (Brain service at SHRE_FILES_URL, default
 * http://127.0.0.1:5526). Mirrors the shre-sdk/files helper that monorepo
 * services use — kept inline here since Replit builds this repo separately
 * without access to the local SDK workspace.
 *
 * Upload + list + downloadUrl for files attached to RapidSupport entities.
 */
const BASE = (process.env.SHRE_FILES_URL || 'http://127.0.0.1:5526').replace(/\/$/, '');
const TIMEOUT_MS = 30_000;

export interface FileMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
  ownerApp: string | null;
  entityType: string | null;
  entityId: string | null;
  companyId: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  [extra: string]: any;
}

export interface UploadInput {
  name: string;
  content: Buffer;
  mime?: string;
  folder?: string;
  tags?: string[];
  uploadedBy?: string;
  companyId?: string;
  ownerApp?: string;
  entityType?: string;
  entityId?: string;
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`shre-files ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const shreFiles = {
  async upload(input: UploadInput): Promise<FileMeta> {
    return req<FileMeta>('POST', '/v1/files', {
      name: input.name,
      content: input.content.toString('base64'),
      mime: input.mime,
      folder: input.folder,
      tags: input.tags,
      uploadedBy: input.uploadedBy,
      companyId: input.companyId,
      ownerApp: input.ownerApp,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  },

  async list(ownerApp: string, entityType: string, entityId: string): Promise<FileMeta[]> {
    const qs = new URLSearchParams({ ownerApp, entityType, entityId });
    const res = await req<{ files: FileMeta[]; count: number }>('GET', `/v1/files?${qs}`);
    return res.files || [];
  },

  async get(id: string): Promise<FileMeta | null> {
    try {
      return await req<FileMeta>('GET', `/v1/files/${encodeURIComponent(id)}`);
    } catch (err) {
      if ((err as Error).message.includes('404')) return null;
      throw err;
    }
  },

  downloadUrl(id: string): string {
    // Returned URL points at the shre-files server directly. If that's
    // only reachable on Brain's LAN, front it via a proxy endpoint in
    // this server (see conversations-files.routes.ts).
    return `${BASE}/v1/files/${encodeURIComponent(id)}/download`;
  },
};
