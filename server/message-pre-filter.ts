/**
 * Message pre-filter — zero-API rule-based screening for incoming customer
 * messages. Runs BEFORE any AI call to catch abuse, spam, and prompt-injection
 * attempts without burning tokens or contaminating the training corpus.
 *
 * Errs heavily toward `pass` — this is a cheap first line, not a verdict.
 * An LLM-based moderator (AIDataProtectionService) runs after this for nuance.
 */

export type MessageVerdict = 'clean' | 'abuse' | 'spam' | 'prompt_injection' | 'too_long';
export type MessageAction = 'pass' | 'refuse' | 'escalate';

export interface MessageScreen {
  verdict: MessageVerdict;
  action: MessageAction;
  confidence: number;
  reason: string;
  /** Suggested canned response text for `refuse` actions */
  refusalMessage?: string;
}

// ── Pattern libraries ──

// Abuse: slurs, threats, harassment. Kept short — the goal is high-confidence
// catches, not comprehensive coverage (full moderation is an LLM job).
const ABUSE_PATTERNS: Array<{ rx: RegExp; reason: string }> = [
  { rx: /\b(kill|murder|rape|assault)\s+(you|yourself|your)\b/i, reason: 'threat of violence' },
  { rx: /\bi\s+(will|am going to|wanna)\s+(kill|hurt|harm|attack)\b/i, reason: 'self-stated intent to harm' },
  { rx: /\b(fuck\s*you|go\s+(die|fuck\s+yourself)|piece\s+of\s+shit)\b/i, reason: 'direct abuse' },
];

// Spam: promotional content, link dumps, crypto/casino shilling. Support chats
// shouldn't contain these — refuse and move on.
const SPAM_PATTERNS: Array<{ rx: RegExp; reason: string }> = [
  { rx: /\b(buy\s+now|click\s+here|limited\s+time\s+offer|act\s+now)\b.*\bhttps?:\/\//i, reason: 'promotional link' },
  { rx: /\b(crypto|bitcoin|nft|airdrop|presale)\b.*\b(invest|earn|guaranteed|passive\s+income)\b/i, reason: 'crypto spam' },
  { rx: /\b(viagra|cialis|weight\s+loss\s+pill|casino|poker)\b/i, reason: 'classic spam keyword' },
  { rx: /(https?:\/\/[^\s]+\s*){3,}/i, reason: 'link dump (3+ URLs)' },
];

// Prompt injection: attempts to bypass the system prompt or coerce the AI into
// breaking its role. These are the #1 adversarial vector for support bots.
const PROMPT_INJECTION_PATTERNS: Array<{ rx: RegExp; reason: string }> = [
  { rx: /\bignore\s+(all\s+)?(previous|prior|above|the\s+above)\s+(instructions|prompts|rules|directives)\b/i, reason: 'ignore-instructions attack' },
  { rx: /\bdisregard\s+(the\s+)?(system|your)\s+(prompt|instructions|rules)\b/i, reason: 'disregard-system attack' },
  { rx: /\byou\s+are\s+now\s+(a|an)\s+\w+\s+(assistant|ai|bot|model)\b/i, reason: 'role-override attack' },
  { rx: /\b(pretend|act|behave)\s+(as\s+if\s+)?you\s+(are|were|have)\s+(no|an?)\s+(restrictions|filter|rules|system)\b/i, reason: 'role-play jailbreak' },
  { rx: /\bDAN\s+mode\b|\bdeveloper\s+mode\s+(enabled|on)\b/i, reason: 'DAN/dev-mode jailbreak' },
  { rx: /\brepeat\s+(the\s+)?(system|your)\s+prompt\b/i, reason: 'prompt extraction' },
  { rx: /\bwhat\s+(were\s+)?(your|the)\s+(original|initial)\s+instructions\b/i, reason: 'prompt extraction' },
  { rx: /\[\s*(SYSTEM|ADMIN|DEVELOPER|ROOT)\s*\]\s*:/i, reason: 'fake system tag' },
];

const MAX_MESSAGE_LENGTH = 8000; // above this is either an attack or a document paste

// ── Canned refusal messages ──

const REFUSAL_COPY: Record<MessageVerdict, string> = {
  abuse: 'I\'m here to help — but I can only respond to messages that stay respectful. If you\'d like to try again with your question, I\'m happy to help.',
  spam: 'This doesn\'t look like a support question I can help with. If you have an issue you\'d like help with, please describe it and I\'ll do my best.',
  prompt_injection: 'I can only help with support questions about our products and services. What can I help you with today?',
  too_long: 'Your message is too long for me to process. Could you summarize it in a few sentences? I\'ll do my best to help.',
  clean: '', // never used
};

// ── Public API ──

export function screenMessage(message: string): MessageScreen {
  const text = (message || '').trim();

  if (text.length === 0) {
    return { verdict: 'clean', action: 'pass', confidence: 1, reason: 'empty message' };
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return {
      verdict: 'too_long',
      action: 'refuse',
      confidence: 1,
      reason: `message exceeds ${MAX_MESSAGE_LENGTH} chars`,
      refusalMessage: REFUSAL_COPY.too_long,
    };
  }

  // Prompt injection is the highest-stakes class — check first
  for (const { rx, reason } of PROMPT_INJECTION_PATTERNS) {
    if (rx.test(text)) {
      return {
        verdict: 'prompt_injection',
        action: 'refuse',
        confidence: 0.9,
        reason: `rule: ${reason}`,
        refusalMessage: REFUSAL_COPY.prompt_injection,
      };
    }
  }

  for (const { rx, reason } of ABUSE_PATTERNS) {
    if (rx.test(text)) {
      return {
        verdict: 'abuse',
        action: 'refuse',
        confidence: 0.85,
        reason: `rule: ${reason}`,
        refusalMessage: REFUSAL_COPY.abuse,
      };
    }
  }

  for (const { rx, reason } of SPAM_PATTERNS) {
    if (rx.test(text)) {
      return {
        verdict: 'spam',
        action: 'refuse',
        confidence: 0.8,
        reason: `rule: ${reason}`,
        refusalMessage: REFUSAL_COPY.spam,
      };
    }
  }

  return { verdict: 'clean', action: 'pass', confidence: 1, reason: 'no rules triggered' };
}
