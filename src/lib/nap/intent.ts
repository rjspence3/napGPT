/**
 * Intent Classification
 * Classifies user messages to prevent inappropriate "give up" behavior
 * for math/code questions
 */

export type Intent = "math" | "code" | "general";

export function classifyIntent(messages: { role: string; content: string }[]): Intent {
  const last = (messages[messages.length - 1]?.content || "").toLowerCase();

  // Math detection: simple arithmetic patterns
  const isMath = /(^|\b)(\d+(\s*[\+\-\*\/]\s*\d+)+|what is \d+\s*[\+\-\*\/]\s*\d+|calculate|solve|equals?|sum|difference|product|quotient)/.test(last);
  if (isMath) return "math";

  // Code detection: programming-related keywords
  const isCode = /(write|implement|function|class|snippet|regex|typescript|python|js|javascript|go|rust|java|code|programming|algorithm|sort|filter|map|reduce)\b|```/.test(last);
  if (isCode) return "code";

  return "general";
}


