import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio, gradeTranscription } from "@/lib/google-stt";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const expectedText = formData.get("expected") as string | null;

    if (!audioFile || !expectedText) {
      return NextResponse.json(
        { error: "Missing audio or expected text" },
        { status: 400 },
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const transcribed = await transcribeAudio(audioBuffer);
    const { score, status } = gradeTranscription(expectedText, transcribed);

    return NextResponse.json({ transcribed, score, status });
  } catch (error) {
    console.error("Pronunciation grading error:", error);
    return NextResponse.json(
      { error: "Failed to grade pronunciation" },
      { status: 500 },
    );
  }
}
