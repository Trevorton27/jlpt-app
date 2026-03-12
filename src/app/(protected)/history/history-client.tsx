"use client";

import { useState } from "react";
import { BookOpen, MessageCircle, Mic, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { jlptLevelLabel, formatRelativeTime, formatDuration } from "@/lib/utils";

type Tab = "all" | "vocab" | "conversations" | "pronunciation";

interface Props {
  studySessions: Array<{
    id: string;
    sessionType: string;
    jlptLevel: number;
    status: string;
    wordsPracticed: number;
    totalWords: number;
    durationSeconds: number | null;
    startedAt: string;
    summary: string | null;
  }>;
  savedVocabulary: Array<{
    id: string;
    word: string;
    reading: string | null;
    meaning: string;
    jlptLevel: number;
    status: string;
    timesStudied: number;
    lastStudiedAt: string | null;
    createdAt: string;
  }>;
  conversationSessions: Array<{
    id: string;
    topic: string;
    jlptLevel: number;
    mode: string;
    status: string;
    messageCount: number;
    startedAt: string;
    summary: string | null;
  }>;
  pronunciationAttempts: Array<{
    id: string;
    word: string;
    reading: string | null;
    jlptLevel: number;
    status: string;
    attemptCount: number;
    createdAt: string;
  }>;
}

export function HistoryClient({ studySessions, savedVocabulary, conversationSessions, pronunciationAttempts }: Props) {
  const [tab, setTab] = useState<Tab>("all");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All Sessions", icon: <Clock className="h-4 w-4" /> },
    { id: "vocab", label: "Vocabulary", icon: <BookOpen className="h-4 w-4" /> },
    { id: "conversations", label: "Conversations", icon: <MessageCircle className="h-4 w-4" /> },
    { id: "pronunciation", label: "Pronunciation", icon: <Mic className="h-4 w-4" /> },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Study History</h1>
        <p className="text-muted">Review your past study sessions and progress</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "all" && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Study Sessions</h2>
          {studySessions.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-10 w-10" />}
              title="No study sessions yet"
              description="Start a vocabulary or pronunciation session to see history here"
            />
          ) : (
            <div className="space-y-3">
              {studySessions.map((session) => (
                  <Card key={session.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          {session.sessionType === "VOCABULARY" ? (
                            <BookOpen className="h-5 w-5" />
                          ) : session.sessionType === "PRONUNCIATION" ? (
                            <Mic className="h-5 w-5" />
                          ) : (
                            <MessageCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {session.sessionType.toLowerCase()} session
                          </p>
                          <p className="text-sm text-muted">
                            {session.wordsPracticed}/{session.totalWords} words
                            {session.durationSeconds ? ` · ${formatDuration(session.durationSeconds)}` : ""}
                            {" · "}
                            {formatRelativeTime(session.startedAt)}
                          </p>
                          {session.summary && (
                            <p className="text-xs text-muted mt-1">{session.summary}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{jlptLevelLabel(session.jlptLevel)}</Badge>
                        <Badge variant={session.status === "COMPLETED" ? "success" : session.status === "IN_PROGRESS" ? "info" : "warning"}>
                          {session.status === "COMPLETED" ? "Done" : session.status === "IN_PROGRESS" ? "In progress" : "Abandoned"}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </section>
      )}

      {tab === "vocab" && (
        <section>
          {savedVocabulary.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-10 w-10" />}
              title="No saved vocabulary"
              description="Save words from the vocabulary page to see them here"
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedVocabulary.map((vocab) => (
                <Card key={vocab.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium jp-text">{vocab.word}</p>
                      {vocab.reading && (
                        <p className="text-sm text-muted jp-text">{vocab.reading}</p>
                      )}
                      <p className="text-sm text-muted">{vocab.meaning}</p>
                      <p className="text-xs text-muted mt-1">
                        {vocab.timesStudied > 0
                          ? `Studied ${vocab.timesStudied} time${vocab.timesStudied > 1 ? "s" : ""}`
                          : "Not studied yet"}
                        {" · "}
                        {formatRelativeTime(vocab.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge>{jlptLevelLabel(vocab.jlptLevel)}</Badge>
                      <Badge
                        variant={
                          vocab.status === "MASTERED" ? "success" :
                          vocab.status === "DIFFICULT" ? "warning" :
                          vocab.status === "STUDYING" ? "info" :
                          "default"
                        }
                      >
                        {vocab.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {(tab === "all" || tab === "conversations") && (
        <section>
          {tab === "all" && <h2 className="text-lg font-semibold mb-3 mt-6">Conversations</h2>}
          {conversationSessions.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="h-10 w-10" />}
              title="No conversations yet"
              description="Start a conversation practice to build your history"
            />
          ) : (
            <div className="space-y-3">
              {conversationSessions.map((conv) => (
                <Card key={conv.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-violet-100 p-2 text-violet-600">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{conv.topic}</p>
                        <p className="text-sm text-muted">
                          {conv.messageCount} messages · {conv.mode.toLowerCase().replace("_", " ")} · {formatRelativeTime(conv.startedAt)}
                        </p>
                        {conv.summary && (
                          <p className="text-xs text-muted mt-1">{conv.summary}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{jlptLevelLabel(conv.jlptLevel)}</Badge>
                      <Badge variant={conv.status === "COMPLETED" ? "success" : "info"}>
                        {conv.status === "COMPLETED" ? "Done" : "In progress"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {(tab === "all" || tab === "pronunciation") && (
        <section>
          {tab === "all" && <h2 className="text-lg font-semibold mb-3 mt-6">Pronunciation Attempts</h2>}
          {pronunciationAttempts.length === 0 ? (
            <EmptyState
              icon={<Mic className="h-10 w-10" />}
              title="No pronunciation attempts yet"
              description="Practice your pronunciation to track your progress"
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pronunciationAttempts.map((attempt) => (
                <Card key={attempt.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium jp-text">{attempt.word}</p>
                      {attempt.reading && (
                        <p className="text-sm text-muted">{attempt.reading}</p>
                      )}
                      <p className="text-xs text-muted mt-1">
                        {attempt.attemptCount} attempt{attempt.attemptCount > 1 ? "s" : ""} · {formatRelativeTime(attempt.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        attempt.status === "COMPLETED" ? "success" :
                        attempt.status === "IMPROVED" ? "info" :
                        attempt.status === "NEEDS_RETRY" ? "warning" :
                        "default"
                      }
                    >
                      {attempt.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
