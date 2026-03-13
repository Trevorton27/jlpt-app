"use client";

import { useState } from "react";
import { BookOpen, MessageCircle, Mic, ChevronRight, X, Languages, Volume2, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { jlptLevelLabel, formatRelativeTime } from "@/lib/utils";
import { parseTranslation } from "@/lib/conversation-utils";

type Tab = "vocab" | "conversations" | "pronunciation";

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ConversationSession {
  id: string;
  topic: string;
  jlptLevel: number;
  mode: string;
  status: string;
  messageCount: number;
  startedAt: string;
  summary: string | null;
  messages: ConversationMessage[];
}

interface Props {
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
  conversationSessions: ConversationSession[];
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

export function HistoryClient({ savedVocabulary, conversationSessions, pronunciationAttempts }: Props) {
  const [tab, setTab] = useState<Tab>("conversations");
  const [selectedConversation, setSelectedConversation] = useState<ConversationSession | null>(null);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "vocab", label: "Vocabulary", icon: <BookOpen className="h-4 w-4" /> },
    { id: "conversations", label: "Conversations", icon: <MessageCircle className="h-4 w-4" /> },
    { id: "pronunciation", label: "Pronunciation", icon: <Mic className="h-4 w-4" /> },
  ];

  // ── Conversation transcript detail view ──
  if (selectedConversation) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{selectedConversation.topic}</h1>
            <p className="text-muted flex items-center gap-2 mt-1">
              <Badge>{jlptLevelLabel(selectedConversation.jlptLevel)}</Badge>
              <span>{selectedConversation.messageCount} messages</span>
              <span>·</span>
              <span>{selectedConversation.mode.toLowerCase().replace("_", " ")}</span>
              <span>·</span>
              <span>{formatRelativeTime(selectedConversation.startedAt)}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
            <X className="h-4 w-4" /> Back
          </Button>
        </div>

        {selectedConversation.messages.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-10 w-10" />}
            title="No transcript available"
            description="This conversation has no saved messages"
          />
        ) : (
          <ConversationTranscript messages={selectedConversation.messages} />
        )}
      </div>
    );
  }

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

      {tab === "conversations" && (
        <section>
          {conversationSessions.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="h-10 w-10" />}
              title="No conversations yet"
              description="Start a conversation practice to build your history"
            />
          ) : (
            <div className="space-y-3">
              {conversationSessions.map((conv) => (
                <Card
                  key={conv.id}
                  className={conv.messages.length > 0 ? "cursor-pointer hover:border-primary/30 transition-colors" : ""}
                  onClick={() => {
                    if (conv.messages.length > 0) setSelectedConversation(conv);
                  }}
                >
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
                      {conv.messages.length > 0 && (
                        <ChevronRight className="h-4 w-4 text-muted" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "pronunciation" && (
        <section>
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

// ── Conversation transcript viewer for history ──

function ConversationTranscript({ messages }: { messages: ConversationMessage[] }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [playingTranslation, setPlayingTranslation] = useState<number | null>(null);

  async function playTranslation(text: string, index: number) {
    if (playingTranslation !== null) return;
    setPlayingTranslation(index);
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
          setPlayingTranslation(null);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => setPlayingTranslation(null);
        await audio.play();
      } else {
        setPlayingTranslation(null);
      }
    } catch {
      setPlayingTranslation(null);
    }
  }

  // Filter out SYSTEM messages
  const visibleMessages = messages.filter((m) => m.role !== "SYSTEM");

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
          Transcript
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTranslation((prev) => !prev)}
          className="text-xs"
        >
          <Languages className="h-3.5 w-3.5" />
          {showTranslation ? "Hide English Translation" : "Show English Translation"}
        </Button>
      </div>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {visibleMessages.map((msg, i) => {
          const isUser = msg.role === "USER";
          const { japanese, english } = parseTranslation(msg.content);
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  isUser
                    ? "bg-primary text-white"
                    : "bg-background border border-border"
                }`}
              >
                <p className="jp-text whitespace-pre-wrap">{japanese}</p>
                {showTranslation && english && !isUser && (
                  <div className="mt-1.5 border-t border-border pt-1.5 flex items-start gap-2">
                    <p className="text-xs text-muted italic flex-1">{english}</p>
                    <button
                      onClick={() => playTranslation(english, i)}
                      disabled={playingTranslation !== null}
                      className="shrink-0 rounded-full p-1 text-muted hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      title="Play English translation"
                    >
                      {playingTranslation === i ? (
                        <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
