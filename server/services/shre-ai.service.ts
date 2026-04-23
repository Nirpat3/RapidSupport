/**
 * Shre AI Service
 * Provides integration with Shre AI as an automated support agent.
 * Sends conversation context to the Shre AI endpoint and returns the response.
 */

interface ShreAIConfig {
  apiKey: string;
  endpoint: string;
  systemPrompt?: string;
}

interface ShreMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ShreAIResponse {
  reply: string;
  confidence?: number;
  handoffRequired?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Sends a conversation to Shre AI and returns the response.
 * The endpoint receives a JSON body with messages array (OpenAI-compatible format)
 * and returns a response with `reply` field.
 */
export async function callShreAI(
  config: ShreAIConfig,
  messages: ShreMessage[],
  conversationMeta?: {
    conversationId: string;
    customerName?: string;
    organizationName?: string;
  }
): Promise<ShreAIResponse> {
  const endpoint = config.endpoint.replace(/\/$/, "");

  const payload: Record<string, unknown> = {
    messages,
    stream: false,
  };

  if (conversationMeta) {
    payload.metadata = {
      conversationId: conversationMeta.conversationId,
      customerName: conversationMeta.customerName,
      organizationName: conversationMeta.organizationName,
    };
  }

  if (config.systemPrompt) {
    payload.system = config.systemPrompt;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "X-Shre-Source": "nova-ai",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Shre AI API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  // Support multiple response formats
  const reply =
    (data.reply as string) ||
    (data.message as string) ||
    (data.content as string) ||
    ((data.choices as any)?.[0]?.message?.content as string) ||
    "";

  return {
    reply,
    confidence: data.confidence as number | undefined,
    handoffRequired: (data.handoff_required || data.handoffRequired) as
      | boolean
      | undefined,
    metadata: data.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Build messages array from conversation history for Shre AI.
 */
export function buildShreMessages(
  messages: Array<{ senderType: string; content: string }>,
  systemPrompt: string
): ShreMessage[] {
  const result: ShreMessage[] = [];

  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }

  for (const msg of messages) {
    if (msg.senderType === "customer") {
      result.push({ role: "user", content: msg.content });
    } else if (msg.senderType === "agent" || msg.senderType === "ai") {
      result.push({ role: "assistant", content: msg.content });
    }
  }

  return result;
}
