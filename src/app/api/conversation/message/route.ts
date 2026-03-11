import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await requireUserProfile();
    const body = await req.json();

    const message = await db.conversationMessage.create({
      data: {
        sessionId: body.sessionId,
        role: body.role,
        content: body.content,
        audioUrl: body.audioUrl || null,
      },
    });

    // Update message count on session
    await db.conversationSession.update({
      where: { id: body.sessionId },
      data: { messageCount: { increment: 1 } },
    });

    return NextResponse.json(message);
  } catch {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
