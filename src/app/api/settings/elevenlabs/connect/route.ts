import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";
import { encryptSecret, last4 } from "@/lib/encryption";
import { validateElevenLabsKey } from "@/lib/elevenlabs";

export async function POST(req: NextRequest) {
  let profile;
  try {
    profile = await requireUserProfile();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { apiKey?: unknown; defaultVoiceId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const defaultVoiceId =
    typeof body.defaultVoiceId === "string" && body.defaultVoiceId.trim().length > 0
      ? body.defaultVoiceId.trim()
      : null;

  if (!apiKey) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  // Validate against ElevenLabs before storing anything.
  let voices;
  try {
    voices = await validateElevenLabsKey(apiKey);
  } catch (err) {
    console.error("[elevenlabs/connect] validation failed:", err);
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let encryptedApiKey: string;
  try {
    encryptedApiKey = encryptSecret(apiKey);
  } catch (err) {
    console.error("[elevenlabs/connect] encryption failed:", err);
    return NextResponse.json(
      { error: "Server encryption is not configured" },
      { status: 500 }
    );
  }

  const cred = await db.elevenLabsCredential.upsert({
    where: { userId: profile.id },
    create: {
      userId: profile.id,
      encryptedApiKey,
      apiKeyLast4: last4(apiKey),
      verifiedAt: new Date(),
      defaultVoiceId,
    },
    update: {
      encryptedApiKey,
      apiKeyLast4: last4(apiKey),
      verifiedAt: new Date(),
      defaultVoiceId: defaultVoiceId ?? undefined,
    },
    select: {
      apiKeyLast4: true,
      verifiedAt: true,
      defaultVoiceId: true,
    },
  });

  return NextResponse.json({
    ok: true,
    credential: cred,
    voiceCount: voices.length,
  });
}
