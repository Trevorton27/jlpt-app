import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getEffectiveElevenLabsConfig } from "@/lib/elevenlabs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) {
    return NextResponse.json(
      { error: "ElevenLabs agent not configured" },
      { status: 500 }
    );
  }

  const config = await getEffectiveElevenLabsConfig(userId);
  if (!config) {
    return NextResponse.json(
      { error: "No ElevenLabs API key connected. Add one in Settings." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: { "xi-api-key": config.apiKey },
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("ElevenLabs signed URL error:", error);
      return NextResponse.json(
        { error: "Failed to get signed URL" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("ElevenLabs signed URL error:", error);
    return NextResponse.json(
      { error: "Failed to get signed URL" },
      { status: 500 }
    );
  }
}
