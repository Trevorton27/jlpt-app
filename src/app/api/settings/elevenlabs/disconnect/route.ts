import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/user";
import { db } from "@/lib/db";

export async function DELETE() {
  let profile;
  try {
    profile = await requireUserProfile();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.elevenLabsCredential.updateMany({
    where: { userId: profile.id },
    data: {
      encryptedApiKey: null,
      apiKeyLast4: null,
      verifiedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
