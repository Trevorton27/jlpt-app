import { getOrCreateUserProfile } from "@/lib/user";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { HistoryClient } from "./history-client";

export default async function HistoryPage() {
  const profile = await getOrCreateUserProfile();
  if (!profile) redirect("/sign-in");

  const [savedVocabulary, conversationSessions, pronunciationAttempts] = await Promise.all([
    db.savedVocabulary.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.conversationSession.findMany({
      where: { userId: profile.id },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    db.pronunciationAttempt.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <HistoryClient
      savedVocabulary={JSON.parse(JSON.stringify(savedVocabulary))}
      conversationSessions={JSON.parse(JSON.stringify(conversationSessions))}
      pronunciationAttempts={JSON.parse(JSON.stringify(pronunciationAttempts))}
    />
  );
}
