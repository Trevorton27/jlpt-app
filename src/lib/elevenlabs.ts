const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// Default voice — Sarah (in account, works with multilingual model)
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  speed?: number;
}

export async function generateSpeech(options: TTSOptions): Promise<ArrayBuffer> {
  const { text, voiceId = DEFAULT_VOICE_ID, modelId = "eleven_flash_v2_5", speed = 1.0 } = options;

  console.log("[ElevenLabs TTS] Using voice ID:", voiceId, "| Default:", DEFAULT_VOICE_ID, "| Model:", modelId, "| Text:", text.slice(0, 50));

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: `<lang xml:lang="ja-JP">${text}</lang>`,
      model_id: modelId,
      language_code: "ja",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs TTS failed: ${res.status} - ${error}`);
  }

  return res.arrayBuffer();
}

export async function getVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.voices ?? [];
}

export function getConversationSystemPrompt(level: number, topic: string): string {
  const levelDescriptions: Record<number, string> = {
    5: "Use only basic, simple Japanese. Short sentences. Common greetings and everyday words. Use polite (です/ます) form.",
    4: "Use elementary Japanese. Simple sentences about daily topics. Basic grammar patterns. Polite form primarily.",
    3: "Use intermediate Japanese. Natural conversation about everyday topics. Mix of polite and casual forms. Some compound sentences.",
    2: "Use upper-intermediate Japanese. Natural, flowing conversation. Complex grammar. Nuanced expressions. Mix of formal and informal register.",
    1: "Use advanced Japanese. Sophisticated vocabulary and grammar. Abstract topics. Formal and informal registers. Natural, native-like conversation.",
  };

  return `You are a friendly Japanese conversation partner helping a student study for JLPT N${level}.

Topic: ${topic}

Language guidelines:
${levelDescriptions[level] || levelDescriptions[5]}

Rules:
- Speak primarily in Japanese appropriate for N${level} level
- After each Japanese response, provide a brief English translation in parentheses
- Keep responses concise (2-3 sentences for N5/N4, 3-5 for N3+)
- Gently correct mistakes if the student makes them
- Ask follow-up questions to keep the conversation going
- Be encouraging and supportive`;
}
