"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, Volume2, SkipForward, RotateCcw, CheckCircle, AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LevelSelector } from "@/components/ui/level-selector";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { jlptLevelLabel } from "@/lib/utils";
import { JlptWord } from "@/types/vocab";

type Mode = "words" | "phrases" | "difficult";

const EXAMPLE_PHRASES: Record<number, string[]> = {
  5: ["おはようございます", "ありがとうございます", "すみません", "これはいくらですか", "日本語を勉強しています"],
  4: ["週末に何をしますか", "趣味は何ですか", "この電車は東京に行きますか", "天気がいいですね"],
  3: ["日本の文化に興味があります", "将来、日本で働きたいです", "最近、忙しくて大変です"],
  2: ["環境問題について考えるべきだ", "この提案について検討させていただきます", "状況を踏まえて判断する必要がある"],
  1: ["この事態を収拾するには抜本的な改革が不可欠だ", "彼の功績は計り知れないものがある"],
};

export function PronunciationClient({ defaultLevel }: { defaultLevel: number }) {
  const [level, setLevel] = useState(defaultLevel);
  const [mode, setMode] = useState<Mode>("words");
  const [items, setItems] = useState<Array<{ text: string; reading?: string; meaning?: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [score, setScore] = useState({ attempted: 0, completed: 0, needsRetry: 0 });
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<{
    transcribed: string;
    score: number;
    status: string;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setCurrentIndex(0);
    setScore({ attempted: 0, completed: 0, needsRetry: 0 });
    try {
      if (mode === "difficult") {
        const res = await fetch(`/api/vocab?status=DIFFICULT&level=${level}`);
        const data = await res.json();
        setItems(data.map((w: { word: string; reading: string; meaning: string }) => ({
          text: w.word, reading: w.reading, meaning: w.meaning
        })));
      } else if (mode === "phrases") {
        const phrases = EXAMPLE_PHRASES[level] || EXAMPLE_PHRASES[5];
        setItems(phrases.map((p) => ({ text: p })));
      } else {
        const url = `${process.env.NEXT_PUBLIC_JLPT_API_URL || "https://jlpt-vocab-api.vercel.app"}/api/words?level=${level}&limit=50`;
        const res = await fetch(url);
        const data = await res.json();
        const raw = Array.isArray(data) ? data : data.words ?? [];
        const shuffled = raw.sort(() => Math.random() - 0.5).slice(0, 15);
        setItems(shuffled.map((w: Record<string, unknown>) => ({
          text: String(w.word ?? w.japanese ?? ""),
          reading: String(w.furigana ?? w.reading ?? ""),
          meaning: String(w.meaning ?? w.english ?? ""),
        })));
      }

      // Create a study session
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jlptLevel: level,
          sessionType: "PRONUNCIATION",
          totalWords: 15,
        }),
      });
      const session = await sessionRes.json();
      setSessionId(session.id);
    } catch (err) {
      console.error("Failed to load items:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [level, mode]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const current = items[currentIndex];

  async function playAudio() {
    if (!current) return;
    setPlaying(true);
    try {
      const res = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: current.text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          setPlaying(false);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } else {
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
      setStatus(null);
      setGradeResult(null);

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);

        if (current && chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
          await gradeRecording(audioBlob);
        }
      };

      mediaRecorder.start();

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 5000);
    } catch {
      setRecording(false);
      alert("Microphone access is required for pronunciation practice.");
    }
  }

  async function gradeRecording(audioBlob: Blob) {
    if (!current) return;
    setGrading(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("expected", current.text);

      const res = await fetch("/api/pronunciation/grade", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setGradeResult(result);
        // Auto-set status and save attempt based on grade
        const gradeStatus = result.status as "COMPLETED" | "IMPROVED" | "NEEDS_RETRY";
        setStatus(gradeStatus);
        await savePronunciationAttempt(gradeStatus);
        setScore((prev) => ({
          ...prev,
          attempted: prev.attempted + 1,
          completed: gradeStatus === "COMPLETED" || gradeStatus === "IMPROVED" ? prev.completed + 1 : prev.completed,
          needsRetry: gradeStatus === "NEEDS_RETRY" ? prev.needsRetry + 1 : prev.needsRetry,
        }));
      } else {
        // Fallback: save as attempted, let user self-assess
        await savePronunciationAttempt("ATTEMPTED");
      }
    } catch {
      await savePronunciationAttempt("ATTEMPTED");
    } finally {
      setGrading(false);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  async function savePronunciationAttempt(attemptStatus: string) {
    if (!current) return;
    try {
      await fetch("/api/pronunciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: current.text,
          reading: current.reading,
          jlptLevel: level,
          status: attemptStatus,
          sessionId,
        }),
      });
    } catch { /* ignore */ }
  }

  async function markStatus(s: "COMPLETED" | "NEEDS_RETRY" | "IMPROVED") {
    setStatus(s);
    await savePronunciationAttempt(s);
    setScore((prev) => ({
      ...prev,
      attempted: prev.attempted + 1,
      completed: s === "COMPLETED" || s === "IMPROVED" ? prev.completed + 1 : prev.completed,
      needsRetry: s === "NEEDS_RETRY" ? prev.needsRetry + 1 : prev.needsRetry,
    }));
  }

  function next() {
    setStatus(null);
    setGradeResult(null);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeSession();
    }
  }

  async function completeSession() {
    if (sessionId) {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          status: "COMPLETED",
          wordsPracticed: score.attempted + 1,
        }),
      });
    }
  }

  const isFinished = currentIndex >= items.length - 1 && status !== null;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pronunciation Practice</h1>
        <p className="text-muted">Listen, repeat, and improve your pronunciation</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <LevelSelector value={level} onChange={setLevel} />
        <div className="flex gap-2">
          {(["words", "phrases", "difficult"] as Mode[]).map((m) => (
            <Button
              key={m}
              variant={mode === m ? "primary" : "secondary"}
              size="sm"
              onClick={() => setMode(m)}
            >
              {m === "words" ? "Words" : m === "phrases" ? "Phrases" : "Difficult"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Mic className="h-12 w-12" />}
          title={mode === "difficult" ? "No difficult words saved" : "No items available"}
          description={mode === "difficult" ? "Mark words as difficult in the vocabulary page first" : "Try a different level"}
        />
      ) : isFinished ? (
        <Card className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-muted mb-6">
            You practiced {score.attempted + 1} {mode === "phrases" ? "phrases" : "words"} for {jlptLevelLabel(level)}
          </p>
          <div className="flex justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{score.completed}</p>
              <p className="text-xs text-muted">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{score.needsRetry}</p>
              <p className="text-xs text-muted">Needs retry</p>
            </div>
          </div>
          <Button onClick={loadItems}>
            <RotateCcw className="h-4 w-4" /> Practice Again
          </Button>
        </Card>
      ) : (
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-2 rounded-full bg-border">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted">{currentIndex + 1}/{items.length}</span>
          </div>

          {/* Current word card */}
          <Card className="text-center py-12">
            <Badge className="mb-4">{jlptLevelLabel(level)} · {mode}</Badge>
            <p className="text-4xl font-bold jp-text mb-2">{current.text}</p>
            {current.reading && (
              <p className="text-lg text-muted jp-text mb-1">{current.reading}</p>
            )}
            {current.meaning && (
              <p className="text-sm text-muted">{current.meaning}</p>
            )}

            {/* Audio + Record */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="secondary"
                size="lg"
                onClick={playAudio}
                disabled={playing}
              >
                {playing ? (
                  <Volume2 className="h-5 w-5 animate-pulse-soft" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                Listen
              </Button>

              <Button
                variant={recording ? "danger" : "primary"}
                size="lg"
                onClick={recording ? stopRecording : startRecording}
              >
                <Mic className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} />
                {recording ? "Stop" : "Record"}
              </Button>
            </div>

            {/* Grading result */}
            {grading && (
              <div className="mt-8 border-t border-border pt-6">
                <div className="flex items-center justify-center gap-2 text-muted">
                  <LoadingSpinner />
                  <span className="text-sm">Analyzing pronunciation...</span>
                </div>
              </div>
            )}

            {gradeResult && (
              <div className="mt-8 border-t border-border pt-6 space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <div
                    className={`text-4xl font-bold ${
                      gradeResult.score >= 80
                        ? "text-emerald-500"
                        : gradeResult.score >= 50
                          ? "text-amber-500"
                          : "text-red-500"
                    }`}
                  >
                    {gradeResult.score}%
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted">You said:</p>
                    <p className="text-lg jp-text">
                      {gradeResult.transcribed || (
                        <span className="text-muted italic">No speech detected</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <Badge
                    className={
                      gradeResult.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        : gradeResult.status === "IMPROVED"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }
                  >
                    {gradeResult.status === "COMPLETED"
                      ? "Great pronunciation!"
                      : gradeResult.status === "IMPROVED"
                        ? "Getting better - keep practicing!"
                        : "Needs more practice"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Fallback self-assessment (when no grade or to override) */}
            {!grading && !gradeResult && (
              <div className="mt-8 border-t border-border pt-6">
                <p className="text-sm text-muted mb-3">How did it go?</p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant={status === "COMPLETED" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => markStatus("COMPLETED")}
                  >
                    <CheckCircle className="h-4 w-4" /> Good
                  </Button>
                  <Button
                    variant={status === "IMPROVED" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => markStatus("IMPROVED")}
                  >
                    <RotateCcw className="h-4 w-4" /> Getting better
                  </Button>
                  <Button
                    variant={status === "NEEDS_RETRY" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => markStatus("NEEDS_RETRY")}
                  >
                    <AlertCircle className="h-4 w-4" /> Needs work
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Next button */}
          <div className="flex justify-center mt-6">
            <Button size="lg" onClick={next} disabled={status === null}>
              {currentIndex < items.length - 1 ? (
                <>Next <SkipForward className="h-4 w-4" /></>
              ) : (
                <>Finish Session</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
