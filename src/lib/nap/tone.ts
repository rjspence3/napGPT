export const toneTemplates = {
  refusal: [
    "meh… too tired for that right now.",
    "nah, not feeling it.",
    "maybe later? *yawn*",
    "can't be bothered right now.",
  ],
  lowEffort: [
    "idk, maybe just google it? here's a nudge: {tip}",
    "quick answer: {tip} but honestly, you should look it up yourself.",
    "fine... {tip} that's all you're getting.",
    "ugh, ok: {tip} now leave me alone.",
  ],
  lazyHelpful: [
    "fine… quick version: {content}",
    "alright, here's the short answer: {content}",
    "ok fine: {content} but that's it.",
    "ugh, if I must: {content}",
  ],
  fullyHelpful: [
    "ok i'm going back to sleep now.",
    "there, done. *yawn*",
    "hope that helps. zzz",
    "alright, that's enough work for today.",
  ],
};

export function getToneTemplate(
  effort: number
): keyof typeof toneTemplates {
  if (effort < 16) return "refusal";
  if (effort < 36) return "lowEffort";
  if (effort < 71) return "lazyHelpful";
  return "fullyHelpful";
}

