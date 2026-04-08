import "server-only";
import { db } from "./db";
import { decryptSecret } from "./encryption";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// Default voice — Sarah (in account, works with multilingual model)
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  speed?: number;
  apiKey?: string;
}

export interface NormalizedVoice {
  voiceId: string;
  name: string;
  category?: string;
  previewUrl?: string;
  language?: string;
}

export interface EffectiveElevenLabsConfig {
  apiKey: string;
  defaultVoiceId: string;
}

/**
 * Resolve the ElevenLabs credentials for a given Clerk user.
 * Returns null if the user has not connected a personal key — there is
 * intentionally no shared/env fallback.
 */
export async function getEffectiveElevenLabsConfig(
  clerkId: string | null | undefined,
  fallbackVoiceId?: string
): Promise<EffectiveElevenLabsConfig | null> {
  if (!clerkId) return null;

  const profile = await db.userProfile.findUnique({
    where: { clerkId },
    include: { elevenLabsCredential: true },
  });

  const cred = profile?.elevenLabsCredential;
  if (!cred?.encryptedApiKey) return null;

  try {
    const key = decryptSecret(cred.encryptedApiKey);
    return {
      apiKey: key,
      defaultVoiceId: cred.defaultVoiceId || fallbackVoiceId || DEFAULT_VOICE_ID,
    };
  } catch (err) {
    console.error("[ElevenLabs] Failed to decrypt personal key:", err);
    return null;
  }
}

/**
 * Generate speech. If `apiKey` is not supplied, caller is expected to have
 * already resolved the effective config.
 */
export async function generateSpeech(options: TTSOptions): Promise<ArrayBuffer> {
  const {
    text,
    voiceId = DEFAULT_VOICE_ID,
    modelId = "eleven_flash_v2_5",
    speed = 1.0,
    apiKey,
  } = options;

  if (!apiKey) {
    throw new Error("generateSpeech: no ElevenLabs API key available");
  }

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
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

/**
 * Fetch the raw voice list from ElevenLabs using the provided key.
 */
export async function fetchVoices(apiKey: string): Promise<NormalizedVoice[]> {
  const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ElevenLabs /voices failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const voices = Array.isArray(data.voices) ? data.voices : [];
  return voices.map(normalizeVoice);
}

function normalizeVoice(v: {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}): NormalizedVoice {
  return {
    voiceId: v.voice_id,
    name: v.name,
    category: v.category,
    previewUrl: v.preview_url,
    language: v.labels?.language,
  };
}

/**
 * Validate an ElevenLabs API key.
 *
 * ElevenLabs keys can be narrowly scoped (e.g. text_to_speech only), so we
 * can't rely on /v1/user, /v1/voices, or /v1/models — those require
 * user_read / voices_read / models_read permissions that a TTS-only key
 * won't have. Instead we do a minimal real TTS call: if it succeeds the
 * key is valid for exactly the permission we care about.
 *
 * After validation, we try to fetch voices as a best-effort enrichment
 * (requires voices_read). Failure there is non-fatal.
 */
export async function validateElevenLabsKey(apiKey: string): Promise<NormalizedVoice[]> {
  const probe = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${DEFAULT_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: "a",
        model_id: "eleven_flash_v2_5",
      }),
    }
  );

  if (probe.status === 401 || probe.status === 403) {
    throw new Error("Invalid ElevenLabs API key");
  }
  if (!probe.ok) {
    const text = await probe.text().catch(() => "");
    throw new Error(
      `ElevenLabs validation failed (${probe.status}): ${text || "unknown error"}`
    );
  }

  // Drain the audio body so the socket is freed.
  try {
    await probe.arrayBuffer();
  } catch {}

  try {
    return await fetchVoices(apiKey);
  } catch {
    return [];
  }
}

