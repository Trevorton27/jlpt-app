"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Star, Check, Volume2, ChevronLeft, ChevronRight, Search, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LevelSelector } from "@/components/ui/level-selector";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { jlptLevelLabel } from "@/lib/utils";
import { JlptWord } from "@/types/vocab";

interface SavedWord {
  id: string;
  word: string;
  status: string;
}

export function VocabClient({ defaultLevel }: { defaultLevel: number }) {
  const [level, setLevel] = useState(defaultLevel);
  const [words, setWords] = useState<JlptWord[]>([]);
  const [savedWords, setSavedWords] = useState<Map<string, SavedWord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const limit = 20;

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      const url = search
        ? `${process.env.NEXT_PUBLIC_JLPT_API_URL || "https://jlpt-vocab-api.vercel.app"}/api/words?keyword=${encodeURIComponent(search)}&level=${level}`
        : `${process.env.NEXT_PUBLIC_JLPT_API_URL || "https://jlpt-vocab-api.vercel.app"}/api/words?level=${level}&offset=${offset}&limit=${limit}`;

      const res = await fetch(url);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.words ?? [];
      const normalized: JlptWord[] = raw.map((w: Record<string, unknown>) => ({
        word: String(w.word ?? w.japanese ?? ""),
        meaning: String(w.meaning ?? w.english ?? ""),
        furigana: String(w.furigana ?? w.reading ?? ""),
        romaji: String(w.romaji ?? ""),
        level: Number(w.level ?? w.jlpt ?? 5),
      }));
      setWords(normalized);
      setTotal(typeof data.total === "number" ? data.total : normalized.length);
    } catch (err) {
      console.error("Failed to fetch vocab:", err);
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [level, offset, search]);

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch(`/api/vocab?level=${level}`);
      const data = await res.json();
      const map = new Map<string, SavedWord>();
      for (const w of data) {
        map.set(w.word, w);
      }
      setSavedWords(map);
    } catch { /* ignore */ }
  }, [level]);

  useEffect(() => {
    fetchWords();
    fetchSaved();
  }, [fetchWords, fetchSaved]);

  async function saveWord(word: JlptWord) {
    try {
      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: word.word,
          reading: word.furigana,
          meaning: word.meaning,
          jlptLevel: word.level,
        }),
      });
      const saved = await res.json();
      setSavedWords((prev) => new Map(prev).set(word.word, saved));
    } catch { /* ignore */ }
  }

  async function updateStatus(word: string, status: string) {
    const saved = savedWords.get(word);
    if (!saved) return;
    try {
      await fetch("/api/vocab", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: saved.id, status }),
      });
      setSavedWords((prev) => {
        const map = new Map(prev);
        map.set(word, { ...saved, status });
        return map;
      });
    } catch { /* ignore */ }
  }

  async function playAudio(text: string) {
    setPlayingWord(text);
    try {
      const res = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          setPlayingWord(null);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } else {
        setPlayingWord(null);
      }
    } catch {
      setPlayingWord(null);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vocabulary</h1>
        <p className="text-muted">Browse and save words for {jlptLevelLabel(level)}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <LevelSelector value={level} onChange={(l) => { setLevel(l); setOffset(0); setSearch(""); }} />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search words..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            className="rounded-lg border border-border bg-surface pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : words.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="No words found"
          description={search ? "Try a different search term" : "No vocabulary available for this level"}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {words.map((word, i) => {
              const saved = savedWords.get(word.word);
              const isSaved = !!saved;
              const isDifficult = saved?.status === "DIFFICULT";
              const isMastered = saved?.status === "MASTERED";

              return (
                <Card key={`${word.word}-${i}`} className="relative group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold jp-text">{word.word}</span>
                        <button
                          onClick={() => playAudio(word.word)}
                          className="rounded-full p-1 text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                          disabled={playingWord === word.word}
                        >
                          <Volume2 className={`h-4 w-4 ${playingWord === word.word ? "animate-pulse-soft text-primary" : ""}`} />
                        </button>
                      </div>
                      {word.furigana && (
                        <p className="text-sm text-muted jp-text">{word.furigana}</p>
                      )}
                      <p className="mt-1 text-sm">{word.meaning}</p>
                      {word.romaji && (
                        <p className="text-xs text-muted mt-0.5">{word.romaji}</p>
                      )}
                    </div>
                    <Badge className={jlptLevelBadgeColor(word.level)}>
                      {jlptLevelLabel(word.level)}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {!isSaved ? (
                      <Button size="sm" variant="outline" onClick={() => saveWord(word)}>
                        <Save className="h-3.5 w-3.5" /> Save
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant={isDifficult ? "primary" : "ghost"}
                          onClick={() => updateStatus(word.word, isDifficult ? "SAVED" : "DIFFICULT")}
                        >
                          <Star className={`h-3.5 w-3.5 ${isDifficult ? "fill-current" : ""}`} />
                          {isDifficult ? "Difficult" : "Mark difficult"}
                        </Button>
                        <Button
                          size="sm"
                          variant={isMastered ? "primary" : "ghost"}
                          onClick={() => updateStatus(word.word, isMastered ? "STUDYING" : "MASTERED")}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {isMastered ? "Mastered" : "Mark mastered"}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {!search && total > limit && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted">
                {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function jlptLevelBadgeColor(level: number): string {
  const colors: Record<number, string> = {
    5: "bg-emerald-100 text-emerald-700",
    4: "bg-blue-100 text-blue-700",
    3: "bg-amber-100 text-amber-700",
    2: "bg-orange-100 text-orange-700",
    1: "bg-red-100 text-red-700",
  };
  return colors[level] ?? "";
}
