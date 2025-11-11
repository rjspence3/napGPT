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

