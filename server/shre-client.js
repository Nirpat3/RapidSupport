/**
 * ShreClient — lightweight SDK for RapidSupport → Shre AI platform.
 *
 * Zero platform dependencies. Uses only fetch(). Routes all AI/chat through
 * shre-api → shre-router → Ollama/cloud.
 *
 * When SHRE_API_KEY is set, all AI calls route through Shre.
 * When not set, falls back to direct OpenAI.
 */

class ShreClient {
  constructor(opts) {
    if (!opts?.apiKey) throw new Error('ShreClient: apiKey is required');
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl || 'https://api.nirtek.net').replace(/\/+$/, '');
    this.workspaceId = opts.workspaceId || null;
    this.defaultAgentId = opts.defaultAgentId || 'support';
    this.timeoutMs = opts.timeoutMs || 30000;
  }

  /** @private */
  async _request(method, path, body, extraHeaders) {
    const headers = {
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

  /**
   * Chat (non-streaming).
   * Routes through shre-api → shre-router → Ollama/cloud.
   *
   * @param {Object} opts
   * @param {Array<{role: string, content: string}>} opts.messages
   * @param {string} [opts.agentId]
   * @param {string} [opts.tenantId]
   * @param {string} [opts.model]
   * @param {number} [opts.max_tokens]
   * @param {Object} [opts.metadata]
   * @returns {Promise<{content: string, model?: string, tokenCount?: number, costUsd?: number, usage?: object}>}
   */
  async chat(opts) {
    const data = await this._request('POST', '/v1/chat', {
      messages: opts.messages,
      agentId: opts.agentId || this.defaultAgentId,
      tenantId: opts.tenantId || this.workspaceId,
      model: opts.model || 'auto',
      stream: false,
      max_tokens: opts.max_tokens,
      metadata: opts.metadata,
    });

    // Parse multi-format response (shre-router returns different shapes)
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

  /**
   * Chat (streaming via SSE). Returns a ReadableStream-like async iterator.
   * Yields chunks: { type: 'delta'|'route'|'done', data: string|object }
   */
  async *chatStream(opts) {
    const headers = {
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

  /**
   * Index KB articles into Qdrant via shre-api.
   */
  async indexKB(articles) {
    return this._request('POST', '/v1/support/kb/index', { articles });
  }

  /**
   * Delete a KB article's vectors.
   */
  async deleteKBArticle(articleId) {
    return this._request('DELETE', `/v1/support/kb/articles/${encodeURIComponent(articleId)}`);
  }

  /**
   * Enrich a customer profile.
   */
  async enrich(identifier, device) {
    return this._request('POST', '/v1/support/enrich', { identifier, device });
  }

  /**
   * Health check.
   */
  async health() {
    return this._request('GET', '/health');
  }

  /**
   * Switch workspace context.
   */
  setWorkspace(workspaceId) {
    this.workspaceId = workspaceId;
  }
}

module.exports = { ShreClient };
module.exports.default = ShreClient;
