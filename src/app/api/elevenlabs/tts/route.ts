import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateSpeech, getEffectiveElevenLabsConfig } from "@/lib/elevenlabs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text, speed, voiceId } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const config = await getEffectiveElevenLabsConfig(userId, voiceId);
    if (!config) {
      return NextResponse.json(
        { error: "No ElevenLabs API key connected. Add one in Settings." },
        { status: 400 }
      );
    }

    const audioBuffer = await generateSpeech({
      text,
      speed: speed || 1.0,
      voiceId: voiceId || config.defaultVoiceId,
      apiKey: config.apiKey,
    });

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
