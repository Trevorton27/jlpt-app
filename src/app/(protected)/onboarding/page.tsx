"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn, JLPT_LEVELS, jlptLevelLabel } from "@/lib/utils";

const levelDescriptions: Record<number, { desc: string; time: string }> = {
  5: { desc: "Beginner — basic phrases, hiragana, katakana, ~100 kanji", time: "~150 hours of study" },
  4: { desc: "Elementary — simple conversations, ~300 kanji", time: "~300 hours of study" },
  3: { desc: "Intermediate — everyday situations, ~650 kanji", time: "~450 hours of study" },
  2: { desc: "Upper-intermediate — complex texts, ~1000 kanji", time: "~600 hours of study" },
  1: { desc: "Advanced — fluent comprehension, ~2000 kanji", time: "~900 hours of study" },
};

const levelColors: Record<number, string> = {
  5: "border-emerald-400 bg-emerald-50 ring-emerald-200",
  4: "border-blue-400 bg-blue-50 ring-blue-200",
  3: "border-amber-400 bg-amber-50 ring-amber-200",
  2: "border-orange-400 bg-orange-50 ring-orange-200",
  1: "border-red-400 bg-red-50 ring-red-200",
};

export default function OnboardingPage() {
  const [selected, setSelected] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleContinue() {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jlptLevel: selected }),
      });
      if (res.ok) {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center">
      <div className="w-full max-w-lg text-center">
        <span className="text-4xl">声</span>
        <h1 className="mt-4 text-3xl font-bold">What JLPT level are you studying for?</h1>
        <p className="mt-2 text-muted">
          Choose the level you are preparing for. You can change this anytime.
        </p>

        <div className="mt-8 space-y-3">
          {JLPT_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setSelected(level)}
              className={cn(
                "w-full rounded-xl border-2 p-4 text-left transition-all duration-150",
                selected === level
                  ? `${levelColors[level]} ring-2`
                  : "border-border bg-surface hover:border-primary/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold">{jlptLevelLabel(level)}</span>
                  <p className="mt-0.5 text-sm text-muted">{levelDescriptions[level].desc}</p>
                </div>
                <span className="text-xs text-muted">{levelDescriptions[level].time}</span>
              </div>
            </button>
          ))}
        </div>

        <Button
          size="lg"
          className="mt-8 w-full"
          onClick={handleContinue}
          loading={loading}
        >
          Continue to Dashboard
        </Button>
      </div>
    </div>
  );
}
