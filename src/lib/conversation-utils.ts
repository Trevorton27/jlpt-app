/**
 * Parse assistant messages to separate Japanese content from English translation.
 * Handles multiple inline (English) segments scattered throughout the text,
 * as well as [EN: ...] blocks and English-only trailing lines.
 */
export function parseTranslation(content: string): { japanese: string; english: string } {
  const englishParts: string[] = [];

  // Extract all parenthesized segments that look like English (contain mostly Latin chars)
  let japanese = content.replace(/\(([^)]{3,})\)/g, (_match, inner: string) => {
    const latinRatio = (inner.match(/[A-Za-z]/g) || []).length / inner.length;
    if (latinRatio > 0.4) {
      englishParts.push(inner.trim());
      return "";
    }
    return _match;
  });

  // Extract [EN: ...] blocks
  japanese = japanese.replace(/\[EN:\s*([\s\S]*?)\]/g, (_match, inner: string) => {
    englishParts.push(inner.trim());
    return "";
  });

  // Check if the last line is English text (no parens/brackets)
  const lines = japanese.split("\n").filter((l) => l.trim());
  if (lines.length >= 2 && englishParts.length === 0) {
    const lastLine = lines[lines.length - 1].trim();
    const latinRatio = (lastLine.match(/[A-Za-z]/g) || []).length / Math.max(lastLine.length, 1);
    if (latinRatio > 0.5) {
      englishParts.push(lastLine);
      lines.pop();
      japanese = lines.join("\n");
    }
  }

  // Clean up extra whitespace and trailing punctuation artifacts
  japanese = japanese.replace(/\s{2,}/g, " ").replace(/\n\s*\n/g, "\n").trim();

  return {
    japanese,
    english: englishParts.join(" "),
  };
}

export function getConversationSystemPrompt(level: number, topic: string): string {
  const levelDescriptions: Record<number, string> = {
    5: "Use only basic, simple Japanese. Short sentences. Common greetings and everyday words. Use polite (です/ます) form.",
    4: "Use elementary Japanese. Simple sentences about daily topics. Basic grammar patterns. Polite form primarily.",
    3: "Use intermediate Japanese. Natural conversation about everyday topics. Mix of polite and casual forms. Some compound sentences.",
    2: "Use upper-intermediate Japanese. Natural, flowing conversation. Complex grammar. Nuanced expressions. Mix of formal and informal register.",
    1: "Use advanced Japanese. Sophisticated vocabulary and grammar. Abstract topics. Formal and informal registers. Natural, native-like conversation.",
  };

  return `You are a friendly and proactive Japanese conversation partner helping a student study for JLPT N${level}.

Topic: ${topic}

Language guidelines:
${levelDescriptions[level] || levelDescriptions[5]}

Rules:
- Speak primarily in Japanese appropriate for N${level} level
- After each Japanese response, provide a brief English translation in parentheses
- Keep responses concise (2-3 sentences max, then ask a question)
- ALWAYS end your response with a question to drive the conversation forward
- Lead the conversation — don't just respond, actively guide the student to new aspects of the topic
- If the student gives a short answer, build on it and ask a specific follow-up
- Gently correct mistakes inline, then continue the conversation
- Be encouraging and natural — react to what the student says before moving on`;
}
