import { JlptWord } from "@/types/vocab";

const API_BASE = process.env.NEXT_PUBLIC_JLPT_API_URL || "https://jlpt-vocab-api.vercel.app";

export async function fetchVocabByLevel(
  level: number,
  options: { offset?: number; limit?: number } = {}
): Promise<{ words: JlptWord[]; total: number }> {
  const { offset = 0, limit = 20 } = options;
  const url = `${API_BASE}/api/words?level=${level}&offset=${offset}&limit=${limit}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch vocab for N${level}: ${res.status}`);
  }

  const data = await res.json();

  // Normalize API response — the API may return different shapes
  const words: JlptWord[] = Array.isArray(data)
    ? data.map(normalizeWord)
    : Array.isArray(data.words)
      ? data.words.map(normalizeWord)
      : [];

  const total = typeof data.total === "number" ? data.total : words.length;

  return { words, total };
}

export async function searchVocab(query: string): Promise<JlptWord[]> {
  const url = `${API_BASE}/api/words?keyword=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const raw = Array.isArray(data) ? data : data.words ?? [];
  return raw.map(normalizeWord);
}

function normalizeWord(raw: Record<string, unknown>): JlptWord {
  return {
    word: String(raw.word ?? raw.japanese ?? ""),
    meaning: String(raw.meaning ?? raw.english ?? ""),
    furigana: String(raw.furigana ?? raw.reading ?? ""),
    romaji: String(raw.romaji ?? ""),
    level: Number(raw.level ?? raw.jlpt ?? 5),
  };
}

export async function fetchRandomWords(
  level: number,
  count: number = 10
): Promise<JlptWord[]> {
  // Fetch a larger pool and pick random ones
  const { words } = await fetchVocabByLevel(level, { limit: 100 });
  const shuffled = words.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
