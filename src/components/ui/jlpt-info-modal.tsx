"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

export function JlptInfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
      >
        <Info className="h-4 w-4" />
        What is the JLPT?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-surface p-8 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold mb-4">What is the JLPT?</h2>

            <div className="space-y-4 text-sm leading-relaxed text-muted">
              <p>
                The Japanese Language Proficiency Test (JLPT) is the most widely recognized
                certification for measuring Japanese language ability. Administered by the Japan
                Foundation and Japan Educational Exchanges and Services, the exam evaluates how well
                learners can understand Japanese in real-world contexts such as everyday
                conversations, reading materials, and spoken information.
              </p>

              <p>The JLPT has five levels, progressing from beginner to advanced:</p>

              <ul className="space-y-2 pl-1">
                <li className="flex gap-3">
                  <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">N5</span>
                  <span>Basic vocabulary, hiragana/katakana, and simple sentences</span>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">N4</span>
                  <span>Everyday expressions and short conversations</span>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">N3</span>
                  <span>Intermediate grammar and the ability to follow common discussions</span>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">N2</span>
                  <span>Advanced comprehension used in work, news, and complex topics</span>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">N1</span>
                  <span>Near-native understanding of sophisticated and abstract Japanese</span>
                </li>
              </ul>

              <p>
                The test measures vocabulary, grammar, reading comprehension, and listening ability.
                While the official exam does not include a speaking section, developing strong
                speaking and pronunciation skills can significantly improve listening comprehension
                and overall fluency.
              </p>

              <p>
                This app is designed to help you prepare for the JLPT by combining level-based
                vocabulary study with interactive speaking practice. You can select the JLPT level
                you are studying for, practice vocabulary drawn from JLPT word lists, and use
                voice-based conversation and pronunciation exercises to reinforce what you learn.
                Study sessions are saved so you can track progress and review difficult words over
                time.
              </p>

              <p>
                By practicing both recognition and spoken use of vocabulary, the app helps turn
                memorized words into usable language — making JLPT preparation more engaging and
                effective.
              </p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
