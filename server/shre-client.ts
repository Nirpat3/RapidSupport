interface ShreClientOptions {
  apiKey: string;
  baseUrl?: string;
  workspaceId?: string;
  defaultAgentId?: string;
  timeoutMs?: number;
}

interface ChatOptions {
  messages: Array<{ role: string; content: string }>;
  agentId?: string;
  tenantId?: string;
  model?: string;
  max_tokens?: number;
  metadata?: Record<string, unknown>;
}

interface ChatResult {
  content: string;
  model?: string;
  tokenCount?: number;
  costUsd?: number;
  usage?: object;
}

interface StreamChunk {
  type: 'delta' | 'route' | 'done' | string;
  data: string | object;
}

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export class ShreClient {
  private apiKey: string;
  private baseUrl: string;
  private workspaceId: string | null;
  private defaultAgentId: string;
  private timeoutMs: number;

  constructor(opts: ShreClientOptions) {
    if (!opts?.apiKey) throw new Error('ShreClient: apiKey is required');
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl || 'https://api.nirtek.net').replace(/\/+$/, '');
    this.workspaceId = opts.workspaceId || null;
    this.defaultAgentId = opts.defaultAgentId || 'support';
    this.timeoutMs = opts.timeoutMs || 30000;
  }

  private async _request(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<any> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    };
    if (this.workspaceId) {
      headers['X-Workspace-ID'] = this.workspaceId;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`ShreClient ${method} ${path} failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  async chat(opts: ChatOptions): Promise<ChatResult> {
    const data = await this._request('POST', '/v1/chat', {
      messages: opts.messages,
      agentId: opts.agentId || this.defaultAgentId,
      tenantId: opts.tenantId || this.workspaceId,
      model: opts.model || 'auto',
      stream: false,
      max_tokens: opts.max_tokens,
      metadata: opts.metadata,
    });

    const content =
      (typeof data.content === 'string' ? data.content : null) ||
      data.content?.[0]?.text ||
      data.message?.content ||
      data.choices?.[0]?.message?.content ||
      '';

    return {
      content,
      model: data.model,
      tokenCount: data.tokenCount || data.usage?.total_tokens,
      costUsd: data.costUsd,
      usage: data.usage || {
        prompt_tokens: data.promptTokens || 0,
        completion_tokens: data.completionTokens || 0,
        total_tokens: data.tokenCount || 0,
      },
    };
  }

  async *chatStream(opts: ChatOptions): AsyncGenerator<StreamChunk> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (this.workspaceId) headers['X-Workspace-ID'] = this.workspaceId;

    const res = await fetch(`${this.baseUrl}/v1/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: opts.messages,
        agentId: opts.agentId || this.defaultAgentId,
        tenantId: opts.tenantId || this.workspaceId,
        model: opts.model || 'auto',
        stream: true,
        max_tokens: opts.max_tokens,
        metadata: opts.metadata,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`ShreClient chatStream failed (${res.status}): ${text}`);
    }

    if (!res.body) throw new Error('ShreClient: no response body for stream');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = 'delta';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
            continue;
          }
          if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            if (raw === '[DONE]') return;

            if (eventType === 'delta') {
              yield { type: 'delta', data: raw };
            } else {
              try {
                yield { type: eventType, data: JSON.parse(raw) };
              } catch {
                yield { type: eventType, data: raw };
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async indexKB(articles: KBArticle[]): Promise<unknown> {
    return this._request('POST', '/v1/support/kb/index', { articles });
  }

  async deleteKBArticle(articleId: string): Promise<unknown> {
    return this._request('DELETE', `/v1/support/kb/articles/${encodeURIComponent(articleId)}`);
  }

  async enrich(identifier: string, device?: unknown): Promise<unknown> {
    return this._request('POST', '/v1/support/enrich', { identifier, device });
  }

  async health(): Promise<unknown> {
    return this._request('GET', '/health');
  }

  setWorkspace(workspaceId: string): void {
    this.workspaceId = workspaceId;
  }
}

export default ShreClient;
