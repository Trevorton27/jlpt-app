import { getOrCreateUserProfile } from "@/lib/user";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { HistoryClient } from "./history-client";

export default async function HistoryPage() {
  const profile = await getOrCreateUserProfile();
  if (!profile) redirect("/sign-in");

  const [studySessions, conversationSessions, pronunciationAttempts] = await Promise.all([
    db.studySession.findMany({
      where: { userId: profile.id },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    db.conversationSession.findMany({
      where: { userId: profile.id },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    db.pronunciationAttempt.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <HistoryClient
      studySessions={JSON.parse(JSON.stringify(studySessions))}
      conversationSessions={JSON.parse(JSON.stringify(conversationSessions))}
      pronunciationAttempts={JSON.parse(JSON.stringify(pronunciationAttempts))}
    />
  );
}
