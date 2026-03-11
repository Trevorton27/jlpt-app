import { getOrCreateUserProfile } from "@/lib/user";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const profile = await getOrCreateUserProfile();
  if (!profile) redirect("/sign-in");
  if (!profile.preferences) redirect("/onboarding");

  const [stats, recentSessions, savedVocab, recentConversations] = await Promise.all([
    getStats(profile.id),
    db.studySession.findMany({
      where: { userId: profile.id },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
    db.savedVocabulary.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.conversationSession.findMany({
      where: { userId: profile.id },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <DashboardClient
      profile={profile}
      stats={stats}
      recentSessions={JSON.parse(JSON.stringify(recentSessions))}
      savedVocab={JSON.parse(JSON.stringify(savedVocab))}
      recentConversations={JSON.parse(JSON.stringify(recentConversations))}
    />
  );
}

async function getStats(userId: string) {
  const [totalSessions, completedSessions, savedWords, difficultWords, pronunciationAttempts, conversationCount] =
    await Promise.all([
      db.studySession.count({ where: { userId } }),
      db.studySession.count({ where: { userId, status: "COMPLETED" } }),
      db.savedVocabulary.count({ where: { userId } }),
      db.savedVocabulary.count({ where: { userId, status: "DIFFICULT" } }),
      db.pronunciationAttempt.count({ where: { userId } }),
      db.conversationSession.count({ where: { userId } }),
    ]);

  return { totalSessions, completedSessions, savedWords, difficultWords, pronunciationAttempts, conversationCount };
}
