import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const profile = await requireUserProfile();
    const body = await req.json();
    const { jlptLevel, dailyGoal, voiceSpeed, showRomaji, autoPlayAudio } = body;

    const data: Record<string, unknown> = {};
    if (jlptLevel !== undefined) data.jlptLevel = Number(jlptLevel);
    if (dailyGoal !== undefined) data.dailyGoal = Number(dailyGoal);
    if (voiceSpeed !== undefined) data.voiceSpeed = Number(voiceSpeed);
    if (showRomaji !== undefined) data.showRomaji = Boolean(showRomaji);
    if (autoPlayAudio !== undefined) data.autoPlayAudio = Boolean(autoPlayAudio);

    const prefs = await db.userPreferences.upsert({
      where: { userId: profile.id },
      update: data,
      create: { userId: profile.id, ...data },
    });

    return NextResponse.json(prefs);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const profile = await requireUserProfile();
    const prefs = await db.userPreferences.findUnique({
      where: { userId: profile.id },
    });
    return NextResponse.json(prefs);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
