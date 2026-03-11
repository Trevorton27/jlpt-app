import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 20);

    const sessions = await db.conversationSession.findMany({
      where: { userId: profile.id },
      orderBy: { startedAt: "desc" },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
    });

    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const body = await req.json();

    const session = await db.conversationSession.create({
      data: {
        userId: profile.id,
        jlptLevel: Number(body.jlptLevel),
        topic: body.topic,
        mode: body.mode || "FREE",
      },
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const body = await req.json();
    const { id, ...data } = body;

    if (data.status === "COMPLETED") {
      data.completedAt = new Date();
    }

    const session = await db.conversationSession.updateMany({
      where: { id, userId: profile.id },
      data,
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
