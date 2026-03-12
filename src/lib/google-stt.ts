import speech from "@google-cloud/speech";

function getClient() {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not set");
  }
  const decoded = Buffer.from(credentialsJson, "base64").toString("utf-8");
  const credentials = JSON.parse(decoded);
  return new speech.SpeechClient({ credentials });
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const client = getClient();

  const [response] = await client.recognize({
    audio: { content: audioBuffer.toString("base64") },
    config: {
      encoding: "WEBM_OPUS" as unknown as number,
      sampleRateHertz: 48000,
      languageCode: "ja-JP",
      model: "default",
      enableAutomaticPunctuation: false,
    },
  });

  const transcript =
    response.results
      ?.map((r) => r.alternatives?.[0]?.transcript ?? "")
      .join("") ?? "";

  return transcript;
}

/**
 * Compare the transcribed text against the expected text and return a score.
 * Score is 0-100 based on character-level similarity.
 */
export function gradeTranscription(
  expected: string,
  transcribed: string,
): { score: number; status: "COMPLETED" | "IMPROVED" | "NEEDS_RETRY" } {
  if (!transcribed.trim()) {
    return { score: 0, status: "NEEDS_RETRY" };
  }

  // Normalize: remove spaces, punctuation, convert to lowercase for comparison
  const normalize = (s: string) =>
    s
      .replace(/[\s　。、・「」！？!?,.\-]/g, "")
      .toLowerCase();

  const exp = normalize(expected);
  const trans = normalize(transcribed);

  if (exp === trans) {
    return { score: 100, status: "COMPLETED" };
  }

  // Character-level Levenshtein distance
  const distance = levenshtein(exp, trans);
  const maxLen = Math.max(exp.length, trans.length);
  const score = Math.round(Math.max(0, (1 - distance / maxLen)) * 100);

  let status: "COMPLETED" | "IMPROVED" | "NEEDS_RETRY";
  if (score >= 80) {
    status = "COMPLETED";
  } else if (score >= 50) {
    status = "IMPROVED";
  } else {
    status = "NEEDS_RETRY";
  }

  return { score, status };
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}
