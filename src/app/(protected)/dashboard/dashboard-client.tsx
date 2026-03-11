"use client";

import Link from "next/link";
import {
  BookOpen,
  MessageCircle,
  Mic,
  Star,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jlptLevelLabel, jlptLevelColor, formatRelativeTime } from "@/lib/utils";

interface Props {
  profile: {
    name: string | null;
    preferences: { jlptLevel: number } | null;
  };
  stats: {
    totalSessions: number;
    completedSessions: number;
    savedWords: number;
    difficultWords: number;
    pronunciationAttempts: number;
    conversationCount: number;
  };
  recentSessions: Array<{
    id: string;
    sessionType: string;
    jlptLevel: number;
    status: string;
    wordsPracticed: number;
    startedAt: string;
  }>;
  savedVocab: Array<{
    id: string;
    word: string;
    reading: string | null;
    meaning: string;
    status: string;
    jlptLevel: number;
  }>;
  recentConversations: Array<{
    id: string;
    topic: string;
    jlptLevel: number;
    messageCount: number;
    startedAt: string;
    status: string;
  }>;
}

export function DashboardClient({ profile, stats, recentSessions, savedVocab, recentConversations }: Props) {
  const level = profile.preferences?.jlptLevel ?? 5;
  const firstName = profile.name?.split(" ")[0] || "there";

  return (
    <div className="animate-fade-in space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted mt-1">
          Studying for{" "}
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${jlptLevelColor(level)}`}>
            {jlptLevelLabel(level)}
          </span>
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          href="/vocab"
          icon={<BookOpen className="h-5 w-5" />}
          label="Study Vocabulary"
          color="bg-emerald-500"
        />
        <QuickAction
          href="/pronunciation"
          icon={<Mic className="h-5 w-5" />}
          label="Practice Pronunciation"
          color="bg-blue-500"
        />
        <QuickAction
          href="/conversation"
          icon={<MessageCircle className="h-5 w-5" />}
          label="Start Conversation"
          color="bg-violet-500"
        />
        <QuickAction
          href={`/vocab?filter=DIFFICULT`}
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Review Difficult Words"
          color="bg-amber-500"
        />
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp />} label="Sessions" value={stats.completedSessions} />
        <StatCard icon={<BookOpen />} label="Saved Words" value={stats.savedWords} />
        <StatCard icon={<Mic />} label="Pronunciations" value={stats.pronunciationAttempts} />
        <StatCard icon={<MessageCircle />} label="Conversations" value={stats.conversationCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent sessions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Recent Sessions</CardTitle>
            <Link href="/history" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted py-4">No sessions yet. Start studying!</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-lg bg-background p-3">
                  <div className="flex items-center gap-3">
                    <SessionIcon type={session.sessionType} />
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {session.sessionType.toLowerCase()} study
                      </p>
                      <p className="text-xs text-muted">
                        {session.wordsPracticed} words · {formatRelativeTime(session.startedAt)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={session.status === "COMPLETED" ? "success" : "warning"}>
                    {session.status === "COMPLETED" ? "Done" : "In progress"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Saved vocabulary */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Saved Vocabulary</CardTitle>
            <Link href="/vocab" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {savedVocab.length === 0 ? (
            <p className="text-sm text-muted py-4">No saved words yet. Browse vocabulary to start!</p>
          ) : (
            <div className="space-y-2">
              {savedVocab.map((word) => (
                <div key={word.id} className="flex items-center justify-between rounded-lg bg-background p-3">
                  <div>
                    <span className="font-medium jp-text">{word.word}</span>
                    {word.reading && (
                      <span className="ml-2 text-sm text-muted">{word.reading}</span>
                    )}
                    <p className="text-xs text-muted">{word.meaning}</p>
                  </div>
                  {word.status === "DIFFICULT" && (
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent conversations */}
      {recentConversations.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Recent Conversations</CardTitle>
            <Link href="/history?tab=conversations" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentConversations.map((conv) => (
              <div key={conv.id} className="rounded-lg bg-background p-4">
                <p className="font-medium">{conv.topic}</p>
                <p className="text-xs text-muted mt-1">
                  {conv.messageCount} messages · {formatRelativeTime(conv.startedAt)}
                </p>
                <Badge
                  className="mt-2"
                  variant={conv.status === "COMPLETED" ? "success" : "info"}
                >
                  {conv.status === "COMPLETED" ? "Completed" : "In progress"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function QuickAction({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <Link href={href}>
      <Card hover className="flex items-center gap-4">
        <div className={`rounded-lg p-2.5 text-white ${color}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted" />
      </Card>
    </Link>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="text-primary">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function SessionIcon({ type }: { type: string }) {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "VOCABULARY":
      return <BookOpen className={iconClass} />;
    case "PRONUNCIATION":
      return <Mic className={iconClass} />;
    case "CONVERSATION":
      return <MessageCircle className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
}
