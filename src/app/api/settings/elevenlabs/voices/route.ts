import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchVoices, getEffectiveElevenLabsConfig } from "@/lib/elevenlabs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getEffectiveElevenLabsConfig(userId);
  if (!config) {
    return NextResponse.json({ voices: [] });
  }

  try {
    const voices = await fetchVoices(config.apiKey);
    return NextResponse.json({ voices });
  } catch (err) {
    console.error("[elevenlabs/voices] failed:", err);
    // Key may lack voices_read permission — return empty list, not an error.
    return NextResponse.json({ voices: [] });
  }
}
