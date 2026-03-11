import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const profile = await requireUserProfile();

    const [
      totalSessions,
      completedSessions,
      savedWords,
      difficultWords,
      pronunciationAttempts,
      conversationSessions,
      recentSessions,
    ] = await Promise.all([
      db.studySession.count({ where: { userId: profile.id } }),
      db.studySession.count({
        where: { userId: profile.id, status: "COMPLETED" },
      }),
      db.savedVocabulary.count({ where: { userId: profile.id } }),
      db.savedVocabulary.count({
        where: { userId: profile.id, status: "DIFFICULT" },
      }),
      db.pronunciationAttempt.count({ where: { userId: profile.id } }),
      db.conversationSession.count({ where: { userId: profile.id } }),
      db.studySession.findMany({
        where: { userId: profile.id },
        orderBy: { startedAt: "desc" },
        take: 7,
        select: { startedAt: true },
      }),
    ]);

    // Calculate streak: consecutive days with sessions
    let streak = 0;
    if (recentSessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = new Date(today);

      for (const session of recentSessions) {
        const sessionDate = new Date(session.startedAt);
        sessionDate.setHours(0, 0, 0, 0);
        if (sessionDate.getTime() === checkDate.getTime()) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (sessionDate.getTime() < checkDate.getTime()) {
          break;
        }
      }
    }

    return NextResponse.json({
      totalSessions,
      completedSessions,
      savedWords,
      difficultWords,
      pronunciationAttempts,
      conversationSessions,
      streak,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
