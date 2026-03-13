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
