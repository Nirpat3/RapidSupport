/**
 * Shre Gateway — drop-in replacement for OpenAI calls.
 *
 * When SHRE_API_KEY is set, routes all AI through shre-api → shre-router → Ollama/cloud.
 * When not set, falls back to direct OpenAI (existing behavior).
 *
 * This is the ONLY file that needs to know about the routing decision.
 * All other files import from here instead of 'openai' directly.
 */
import OpenAI from 'openai';

// @ts-ignore — JS module without types
import { ShreClient } from './shre-client.js';
import { enqueueShreEvent } from './shre-outbox';

// ── Configuration ──

const SHRE_API_KEY = process.env.SHRE_API_KEY;
const SHRE_API_URL = process.env.SHRE_API_URL || 'https://api.nirtek.net';
const SHRE_WORKSPACE_ID = process.env.SHRE_WORKSPACE_ID;
const SHRE_AGENT_ID = process.env.SHRE_AGENT_ID || 'support';

/** True when Shre platform is configured and should be used */
export const isShreEnabled = Boolean(SHRE_API_KEY);

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const shreClient = SHRE_API_KEY
  ? new ShreClient({
      apiKey: SHRE_API_KEY,
      baseUrl: SHRE_API_URL,
      workspaceId: SHRE_WORKSPACE_ID,
      defaultAgentId: SHRE_AGENT_ID,
      timeoutMs: 45_000,
    })
  : null;

// Re-export the raw OpenAI client for cases that truly need it (embeddings, TTS, etc.)
export { openai };

// Re-export ShreClient for direct access (KB indexing, enrichment)
export { shreClient };

// ── Types ──

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface ChatCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  max_completion_tokens?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  response_format?: any;
  temperature?: number;
}

interface ChatCompletionResult {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  /** Original tool_calls from response (only from OpenAI fallback with tools) */
  tool_calls?: any[];
  /** Full original response for advanced use cases */
  _raw?: any;
}

// ── Core Gateway Function (non-streaming) ──

/**
 * Send a chat completion — routes ALL calls through Shre when configured.
 *
 * Tool-calling requests include tools in the Shre payload. shre-router handles
 * forwarding to the appropriate provider with tool support.
 * Falls back to direct OpenAI only if Shre call fails or is not configured.
 */
export async function chatCompletion(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
  if (!isShreEnabled) {
    const result = await openaiChatCompletion(opts);
    void emitCompletionEvent(opts, result, 'cloud-openai');
    return result;
  }

  // Route through Shre — including tool-calling requests
  try {
    const result = await shreClient!.chat({
      messages: opts.messages.map((m: ChatMessage) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      })),
      model: 'auto',
      max_tokens: opts.max_completion_tokens || opts.max_tokens,
      agentId: SHRE_AGENT_ID,
      metadata: { source: 'rapidsupport', hasTools: Boolean(opts.tools?.length) },
      ...(opts.tools ? { tools: opts.tools } : {}),
      ...(opts.tool_choice ? { tool_choice: opts.tool_choice } : {}),
      ...(opts.response_format ? { response_format: opts.response_format } : {}),
    });

    const mapped: ChatCompletionResult = {
      content: result.content,
      usage: result.usage,
      model: result.model || 'shre-auto',
      tool_calls: result.tool_calls,
    };
    void emitCompletionEvent(opts, mapped, 'shre-local');
    return mapped;
  } catch (err: any) {
    console.warn(`[ShreGateway] Shre call failed, falling back to OpenAI: ${err.message}`);
    const fallback = await openaiChatCompletion(opts);
    void emitCompletionEvent(opts, fallback, 'cloud-openai-fallback');
    return fallback;
  }
}

/** Direct OpenAI call (fallback or tool-calling) */
async function openaiChatCompletion(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const completion = await openai.chat.completions.create({
    model: opts.model || 'gpt-5',
    messages: opts.messages as any,
    max_completion_tokens: opts.max_completion_tokens || opts.max_tokens,
    ...(opts.tools ? { tools: opts.tools } : {}),
    ...(opts.tool_choice ? { tool_choice: opts.tool_choice } : {}),
    ...(opts.response_format ? { response_format: opts.response_format } : {}),
    stream: false,
  });

  const choice = completion.choices[0];
  return {
    content: choice.message.content || '',
    usage: completion.usage
      ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens,
        }
      : undefined,
    model: completion.model,
    tool_calls: choice.message.tool_calls,
    _raw: completion,
  };
}

/**
 * Emit an ai.completion event to the Shre outbox for training/evolution.
 * Provenance tag lets the training corpus filter out proprietary-cloud
 * outputs (per the Training Provenance Firewall).
 */
type Provenance = 'shre-local' | 'cloud-openai' | 'cloud-openai-fallback';

function emitCompletionEvent(
  opts: ChatCompletionOptions,
  result: ChatCompletionResult,
  provenance: Provenance,
): void {
  const truncate = (s: string | undefined, n: number) => (s ? s.slice(0, n) : '');
  // Keep first system + last user + assistant reply — enough signal for
  // training without blasting full history (token cost + privacy).
  const systemMsg = opts.messages.find((m) => m.role === 'system');
  const userMsgs = opts.messages.filter((m) => m.role === 'user');
  const lastUser = userMsgs[userMsgs.length - 1];

  void enqueueShreEvent('ai.completion', {
    provenance,
    model: result.model,
    agentId: SHRE_AGENT_ID,
    usage: result.usage,
    hasTools: Boolean(opts.tools?.length),
    messages: {
      system: truncate(systemMsg?.content, 1000),
      lastUser: truncate(lastUser?.content, 2000),
      assistant: truncate(result.content, 4000),
    },
    timestamp: new Date().toISOString(),
  });
}

// ── Streaming Gateway ──

/**
 * Stream a chat completion. Yields content strings.
 *
 * When Shre is enabled: SSE stream from shre-router
 * When not: OpenAI SDK streaming
 */
export async function* chatCompletionStream(
  opts: ChatCompletionOptions,
): AsyncGenerator<{ type: 'token' | 'done'; data: string | Record<string, any> }> {
  if (!isShreEnabled) {
    yield* openaiStream(opts);
    return;
  }

  try {
    for await (const chunk of shreClient!.chatStream({
      messages: opts.messages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
      model: 'auto',
      max_tokens: opts.max_completion_tokens || opts.max_tokens,
      agentId: SHRE_AGENT_ID,
      metadata: { source: 'rapidsupport' },
    })) {
      if (chunk.type === 'delta') {
        yield { type: 'token', data: chunk.data as string };
      } else if (chunk.type === 'done') {
        yield { type: 'done', data: chunk.data as Record<string, any> };
      }
    }
  } catch (err: any) {
    console.warn(`[ShreGateway] Shre stream failed, falling back to OpenAI: ${err.message}`);
    yield* openaiStream(opts);
  }
}

/** OpenAI streaming fallback */
async function* openaiStream(
  opts: ChatCompletionOptions,
): AsyncGenerator<{ type: 'token' | 'done'; data: string | Record<string, any> }> {
  const stream = await openai.chat.completions.create({
    model: opts.model || 'gpt-5',
    messages: opts.messages as any,
    max_completion_tokens: opts.max_completion_tokens || opts.max_tokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      yield { type: 'token', data: content };
    }
  }

  yield { type: 'done', data: { model: opts.model || 'gpt-5' } };
}

// ── KB Sync Helper ──

/**
 * Sync a knowledge base article to Shre's Qdrant vector store.
 * Call this when articles are created/updated in RapidSupport.
 * No-op if Shre is not configured.
 */
export async function syncArticleToShre(article: {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}): Promise<void> {
  if (!shreClient) return;

  try {
    await shreClient.indexKB([article]);
    console.log(`[ShreGateway] Synced article "${article.title}" to Shre KB`);
  } catch (err: any) {
    console.warn(`[ShreGateway] KB sync failed for "${article.title}": ${err.message}`);
  }
}

/**
 * Delete an article from Shre's vector store.
 * No-op if Shre is not configured.
 */
export async function deleteArticleFromShre(articleId: string): Promise<void> {
  if (!shreClient) return;

  try {
    await shreClient.deleteKBArticle(articleId);
    console.log(`[ShreGateway] Deleted article ${articleId} from Shre KB`);
  } catch (err: any) {
    console.warn(`[ShreGateway] KB delete failed for ${articleId}: ${err.message}`);
  }
}

/**
 * Bulk sync all KB articles to Shre. Use during initial setup or re-index.
 */
export async function bulkSyncKBToShre(
  articles: Array<{ id: string; title: string; content: string; category?: string; tags?: string[] }>,
): Promise<{ synced: number; errors: number }> {
  if (!shreClient) return { synced: 0, errors: 0 };

  const BATCH_SIZE = 10;
  let synced = 0;
  let errors = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    try {
      const result = await shreClient.indexKB(batch);
      synced += result.articlesProcessed || batch.length;
      errors += result.errors || 0;
    } catch (err: any) {
      console.warn(`[ShreGateway] Batch sync failed: ${err.message}`);
      errors += batch.length;
    }
  }

  console.log(`[ShreGateway] Bulk KB sync: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}

// ── Status ──

console.log(
  isShreEnabled
    ? `[ShreGateway] ✓ Shre AI enabled — routing through ${SHRE_API_URL} (agent: ${SHRE_AGENT_ID})`
    : '[ShreGateway] Shre AI not configured — using direct OpenAI',
);
