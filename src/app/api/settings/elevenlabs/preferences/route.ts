import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  let profile;
  try {
    profile = await requireUserProfile();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { defaultVoiceId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let defaultVoiceId: string | null | undefined;
  if ("defaultVoiceId" in body) {
    if (body.defaultVoiceId === null) {
      defaultVoiceId = null;
    } else if (typeof body.defaultVoiceId === "string") {
      defaultVoiceId = body.defaultVoiceId.trim() || null;
    } else {
      return NextResponse.json({ error: "Invalid defaultVoiceId" }, { status: 400 });
    }
  }

  if (defaultVoiceId === undefined) {
    return NextResponse.json({ ok: true });
  }

  const cred = await db.elevenLabsCredential.upsert({
    where: { userId: profile.id },
    create: {
      userId: profile.id,
      defaultVoiceId,
    },
    update: { defaultVoiceId },
    select: {
      apiKeyLast4: true,
      verifiedAt: true,
      defaultVoiceId: true,
    },
  });

  return NextResponse.json({ ok: true, credential: cred });
}
