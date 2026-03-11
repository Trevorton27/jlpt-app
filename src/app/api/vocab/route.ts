import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const level = searchParams.get("level");

    const where: Record<string, unknown> = { userId: profile.id };
    if (status) where.status = status;
    if (level) where.jlptLevel = Number(level);

    const vocab = await db.savedVocabulary.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(vocab);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const body = await req.json();
    const { word, reading, meaning, jlptLevel } = body;

    const vocab = await db.savedVocabulary.upsert({
      where: {
        userId_word: { userId: profile.id, word },
      },
      update: { reading, meaning, jlptLevel },
      create: {
        userId: profile.id,
        word,
        reading: reading || null,
        meaning,
        jlptLevel: Number(jlptLevel),
      },
    });

    return NextResponse.json(vocab);
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const body = await req.json();
    const { id, status, timesStudied } = body;

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (timesStudied !== undefined) data.timesStudied = timesStudied;
    if (status === "STUDYING" || timesStudied) data.lastStudiedAt = new Date();

    const vocab = await db.savedVocabulary.updateMany({
      where: { id, userId: profile.id },
      data,
    });

    return NextResponse.json(vocab);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.savedVocabulary.deleteMany({
      where: { id, userId: profile.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
