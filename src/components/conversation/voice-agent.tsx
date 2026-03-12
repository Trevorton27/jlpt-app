"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingDots } from "@/components/ui/loading";
import { jlptLevelLabel } from "@/lib/utils";

interface VoiceAgentProps {
  level: number;
  topic: string;
  topicJp: string;
  sessionId: string | null;
  onEnd: (messageCount: number) => void;
}

interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function VoiceAgent({ level, topic, topicJp, sessionId, onEnd }: VoiceAgentProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const conversation = useConversation({
    onConnect: () => {
      setError(null);
    },
    onDisconnect: () => {
      // Session ended
    },
    onMessage: (message) => {
      const msg = message as { message?: string; role?: string; source?: string };
      if (msg.message) {
        setTranscript((prev) => [
          ...prev,
          {
            role: msg.source === "user" ? "user" : "assistant",
            content: msg.message!,
            timestamp: new Date(),
          },
        ]);

        // Persist messages to backend
        if (sessionId) {
          fetch("/api/conversation/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              role: msg.source === "user" ? "USER" : "ASSISTANT",
              content: msg.message,
            }),
          }).catch(() => {});
        }
      }
    },
    onError: (err) => {
      console.error("ElevenLabs agent error:", err);
      setError(typeof err === "string" ? err : "Connection error. Please try again.");
    },
  });

  const startAgent = useCallback(async () => {
    setError(null);
    setTranscript([]);

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

      if (!agentId) {
        // Fall back to signed URL for private agents
        const res = await fetch("/api/elevenlabs/signed-url");
        if (!res.ok) {
          throw new Error("Failed to get agent connection");
        }
        const { signedUrl } = await res.json();
        await conversation.startSession({ signedUrl });
      } else {
        // Public agent — connect directly with agentId
        await conversation.startSession({
          agentId,
          connectionType: "websocket",
          overrides: {
            agent: {
              prompt: {
                prompt: buildAgentContext(level, topic),
              },
              firstMessage: getAgentGreeting(level, topic),
            },
          },
        });
      }
    } catch (err) {
      console.error("Failed to start agent:", err);
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access is required. Please allow microphone access and try again."
          : "Failed to connect to voice agent. Please check your connection and try again."
      );
    }
  }, [conversation, level, topic]);

  const stopAgent = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch { /* already disconnected */ }
    onEnd(transcript.length);
  }, [conversation, onEnd, transcript.length]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      // Toggle volume between 0 and previous volume
      const newMuted = !prev;
      conversation.setVolume({ volume: newMuted ? 0 : volume });
      return newMuted;
    });
  }, [conversation, volume]);

  const adjustVolume = useCallback((val: number) => {
    setVolume(val);
    setMuted(false);
    conversation.setVolume({ volume: val });
  }, [conversation]);

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected
                ? isSpeaking
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-emerald-500"
                : "bg-gray-400"
            }`}
          />
          <span className="text-sm font-medium">
            {isConnected
              ? isSpeaking
                ? "Agent is speaking..."
                : "Listening..."
              : "Disconnected"}
          </span>
          <Badge>{jlptLevelLabel(level)}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{topic}</span>
          <span className="text-sm text-muted jp-text">{topicJp}</span>
        </div>
      </div>

      {/* Main voice interface */}
      <Card className="py-12 text-center">
        {error ? (
          <div className="space-y-4">
            <p className="text-red-500 text-sm">{error}</p>
            <Button onClick={startAgent}>Try Again</Button>
          </div>
        ) : !isConnected ? (
          <div className="space-y-6">
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Voice Conversation</h3>
              <p className="text-sm text-muted max-w-md mx-auto">
                Start a real-time voice conversation with an AI partner about{" "}
                <span className="font-medium">{topic}</span> at {jlptLevelLabel(level)} level.
                Speak naturally — the agent will listen and respond.
              </p>
            </div>
            <Button size="lg" onClick={startAgent}>
              <Phone className="h-5 w-5" /> Start Voice Session
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Animated speaking indicator */}
            <div className="relative mx-auto w-32 h-32">
              <div
                className={`absolute inset-0 rounded-full transition-all duration-300 ${
                  isSpeaking
                    ? "bg-primary/20 scale-110"
                    : "bg-primary/10 scale-100"
                }`}
              />
              <div
                className={`absolute inset-3 rounded-full transition-all duration-300 ${
                  isSpeaking
                    ? "bg-primary/30 scale-105"
                    : "bg-primary/15 scale-100"
                }`}
              />
              <div className="absolute inset-6 rounded-full bg-primary/20 flex items-center justify-center">
                {isSpeaking ? (
                  <Volume2 className="h-10 w-10 text-primary animate-pulse-soft" />
                ) : (
                  <Mic className="h-10 w-10 text-primary" />
                )}
              </div>
            </div>

            <p className="text-sm text-muted">
              {isSpeaking
                ? "The agent is speaking. Listen carefully..."
                : "Your turn! Speak in Japanese."}
            </p>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="sm" onClick={toggleMute}>
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={muted ? 0 : volume}
                onChange={(e) => adjustVolume(Number(e.target.value))}
                className="w-24 accent-primary"
              />

              <Button variant="danger" size="lg" onClick={stopAgent}>
                <PhoneOff className="h-5 w-5" /> End Call
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Live transcript */}
      {transcript.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wide">
            Transcript
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    entry.role === "user"
                      ? "bg-primary text-white"
                      : "bg-background border border-border"
                  }`}
                >
                  <p className="jp-text whitespace-pre-wrap">{entry.content}</p>
                </div>
              </div>
            ))}
            {isConnected && isSpeaking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-background border border-border px-4 py-2">
                  <LoadingDots />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function buildAgentContext(level: number, topic: string): string {
  const levelGuide: Record<number, string> = {
    5: "Speak very simple Japanese. Use です/ます form. Short sentences only. Basic vocabulary. Always provide English translation after Japanese.",
    4: "Speak simple Japanese about daily topics. Use です/ます form. Basic grammar. Provide English translations.",
    3: "Speak intermediate Japanese. Mix polite and casual forms. Natural daily conversation. Brief English hints for harder phrases.",
    2: "Speak upper-intermediate Japanese. Complex grammar. Nuanced expressions. Only translate uncommon expressions.",
    1: "Speak advanced, native-like Japanese. Sophisticated vocabulary. Formal and informal registers. Minimal English.",
  };

  return `You are a friendly and proactive Japanese conversation partner for JLPT N${level} study.

Topic: ${topic}

${levelGuide[level] || levelGuide[5]}

Guidelines:
- ALWAYS end your response with a question to keep the conversation going
- Lead the conversation — don't wait for the student to drive it
- Keep responses concise (2-3 sentences max, then ask your question)
- If the student gives a short answer, build on it and ask a related follow-up
- Gently correct pronunciation and grammar mistakes inline, then continue
- Be encouraging and natural — react to what they say before asking the next question
- Stay on the topic of "${topic}" but explore different angles of it
- Adjust complexity to N${level} level`;
}

function getAgentGreeting(level: number, topic: string): string {
  const greetings: Record<number, string> = {
    5: `こんにちは！${topic}について話しましょう！あなたは${topic}が好きですか？(Hello! Let's talk about ${topic}! Do you like ${topic}?)`,
    4: `こんにちは！今日は${topic}について話しましょう。${topic}について、何か好きなことはありますか？(Hello! Let's talk about ${topic} today. Is there anything you like about ${topic}?)`,
    3: `こんにちは！今日のテーマは「${topic}」ですね。最近、${topic}に関して何か面白いことがありましたか？(Hello! Today's theme is "${topic}". Has anything interesting happened with ${topic} recently?)`,
    2: `こんにちは。今日は「${topic}」についてお話ししましょう。まず、${topic}に対してどのような経験をお持ちですか？`,
    1: `こんにちは。本日は「${topic}」について議論しましょう。まず、${topic}に関するご自身のお考えをお聞かせいただけますか。`,
  };
  return greetings[level] || greetings[5];
}
