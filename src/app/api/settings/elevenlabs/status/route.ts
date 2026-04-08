import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function GET() {
  let profile;
  try {
    profile = await requireUserProfile();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cred = await db.elevenLabsCredential.findUnique({
    where: { userId: profile.id },
    select: {
      apiKeyLast4: true,
      verifiedAt: true,
      defaultVoiceId: true,
      encryptedApiKey: true,
    },
  });

  if (!cred) {
    return NextResponse.json({
      connected: false,
      apiKeyLast4: null,
      verifiedAt: null,
      defaultVoiceId: null,
    });
  }

  return NextResponse.json({
    connected: !!cred.encryptedApiKey,
    apiKeyLast4: cred.apiKeyLast4,
    verifiedAt: cred.verifiedAt,
    defaultVoiceId: cred.defaultVoiceId,
  });
}
