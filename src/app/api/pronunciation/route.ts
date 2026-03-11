import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level");
    const status = searchParams.get("status");
    const limit = Number(searchParams.get("limit") || 50);

    const where: Record<string, unknown> = { userId: profile.id };
    if (level) where.jlptLevel = Number(level);
    if (status) where.status = status;

    const attempts = await db.pronunciationAttempt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(attempts);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const body = await req.json();

    const attempt = await db.pronunciationAttempt.create({
      data: {
        userId: profile.id,
        word: body.word,
        reading: body.reading || null,
        jlptLevel: Number(body.jlptLevel),
        status: body.status || "ATTEMPTED",
        sessionId: body.sessionId || null,
      },
    });

    return NextResponse.json(attempt);
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const body = await req.json();
    const { id, status } = body;

    const attempt = await db.pronunciationAttempt.updateMany({
      where: { id, userId: profile.id },
      data: {
        status,
        attemptCount: { increment: 1 },
      },
    });

    return NextResponse.json(attempt);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
