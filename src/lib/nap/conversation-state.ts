/**
 * Lightweight in-memory conversation state
 * Tracks last reply and intent for echo fragments and /recall command
 */

export type ConversationState = {
  lastReply?: string;
  lastIntent?: string;
  turnCount: number;
};

// Global conversation state (in-memory, resets on server restart)
//
// ⚠️  Portfolio demo limitation: this is a module-level singleton.
// On serverless (Vercel), each cold-start creates a fresh instance,
// so state does not persist across restarts. However, within a single
// warm instance, concurrent requests from different users share this
// object — turnCount and lastReply can mix across sessions.
//
// In practice the affected processors fall back to history.length
// (see processors.ts:155) and updateConversationState() is never
// called, so the contamination has no visible effect. A production
// system would scope this per-request or per-session-cookie.
export const conversationState: ConversationState = {
  turnCount: 0,
};

/**
 * Update conversation state after a reply
 */
export function updateConversationState(reply: string, intent: string): void {
  conversationState.lastReply = reply;
  conversationState.lastIntent = intent;
  conversationState.turnCount += 1;
}

/**
 * Get the last reply for /recall command
 */
export function getLastReply(): string | undefined {
  return conversationState.lastReply;
}

/**
 * Check if this is the first turn
 */
export function isFirstTurn(): boolean {
  return conversationState.turnCount === 0;
}

/**
 * Reset conversation state (useful for tests)
 */
export function resetConversationState(): void {
  conversationState.lastReply = undefined;
  conversationState.lastIntent = undefined;
  conversationState.turnCount = 0;
}

