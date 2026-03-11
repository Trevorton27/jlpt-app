import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limit = Number(searchParams.get("limit") || 20);

    const where: Record<string, unknown> = { userId: profile.id };
    if (type) where.sessionType = type;

    const sessions = await db.studySession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
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

    const session = await db.studySession.create({
      data: {
        userId: profile.id,
        jlptLevel: Number(body.jlptLevel),
        sessionType: body.sessionType,
        totalWords: body.totalWords || 0,
      },
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
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

    const session = await db.studySession.updateMany({
      where: { id, userId: profile.id },
      data,
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
