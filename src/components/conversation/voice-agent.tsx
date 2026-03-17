"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, Phone, PhoneOff, Volume2, VolumeX, Languages, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingDots } from "@/components/ui/loading";
import { jlptLevelLabel } from "@/lib/utils";
import { parseTranslation } from "@/lib/conversation-utils";

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

// Connection lifecycle states for our wrapper layer
type AgentState = "idle" | "connecting" | "connected" | "disconnecting" | "error";

export function VoiceAgent({ level, topic, topicJp, sessionId, onEnd }: VoiceAgentProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showTranslation, setShowTranslation] = useState(false);
  const [playingTranslation, setPlayingTranslation] = useState<number | null>(null);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [conversationEnded, setConversationEnded] = useState(false);

  // Refs to avoid stale closures and track lifecycle across async boundaries
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const agentStateRef = useRef<AgentState>("idle");
  const mountedRef = useRef(true);

  // Keep refs in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safe state setter that no-ops after unmount
  function safeSetState<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (value: React.SetStateAction<T>) => {
      if (mountedRef.current) setter(value);
    };
  }

  const safeSetTranscript = safeSetState(setTranscript);
  const safeSetError = safeSetState(setError);
  const safeSetAgentState = safeSetState(setAgentState);

  async function playEnglishTranslation(text: string, index: number) {
    if (playingTranslation !== null) return;
    setPlayingTranslation(index);
    try {
      const res = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          setPlayingTranslation(null);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => setPlayingTranslation(null);
        await audio.play();
      } else {
        setPlayingTranslation(null);
      }
    } catch {
      setPlayingTranslation(null);
    }
  }

  const conversation = useConversation({
    onConnect: () => {
      console.log("[VoiceAgent] Connected");
      safeSetError(null);
      safeSetAgentState("connected");
    },
    onDisconnect: () => {
      console.log("[VoiceAgent] Disconnected");
      // Only transition to idle if we weren't already handling a deliberate disconnect
      if (agentStateRef.current !== "disconnecting") {
        safeSetAgentState("idle");
      }
    },
    onMessage: (message) => {
      const msg = message as { message?: string; role?: string; source?: string };
      if (!msg.message) return;

      safeSetTranscript((prev) => [
        ...prev,
        {
          role: msg.source === "user" ? "user" : "assistant",
          content: msg.message!,
          timestamp: new Date(),
        },
      ]);

      // Persist messages to backend (fire-and-forget)
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
    },
    onError: (err) => {
      console.error("[VoiceAgent] Agent error:", err);
      safeSetError(typeof err === "string" ? err : "Connection error. Please try again.");
      safeSetAgentState("error");
    },
  });

  const startAgent = useCallback(async (options?: { keepTranscript?: boolean }) => {
    // Guard: prevent duplicate initialization
    const currentState = agentStateRef.current;
    if (currentState === "connecting" || currentState === "connected") {
      console.warn(`[VoiceAgent] startAgent blocked — already in state: ${currentState}`);
      return;
    }

    setError(null);
    if (!options?.keepTranscript) setTranscript([]);
    setAgentState("connecting");
    agentStateRef.current = "connecting";

    try {
      console.log("[VoiceAgent] Starting session...");

      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

      if (!agentId) {
        const res = await fetch("/api/elevenlabs/signed-url");
        if (!res.ok) throw new Error("Failed to get agent connection");
        const { signedUrl } = await res.json();

        if (!mountedRef.current || agentStateRef.current !== "connecting") return;
        await conversation.startSession({ signedUrl });
      } else {
        if (!mountedRef.current || agentStateRef.current !== "connecting") return;
        await conversation.startSession({
          agentId,
          connectionType: "webrtc",
          overrides: {
            agent: {
              prompt: {
                prompt: buildAgentContext(level, topic),
              },
            },
          },
        });
      }

      console.log("[VoiceAgent] Session started successfully");
      // Note: agentState will be set to "connected" by the onConnect callback
    } catch (err) {
      console.error("[VoiceAgent] Failed to start agent:", err);
      if (!mountedRef.current) return;

      setAgentState("error");
      agentStateRef.current = "error";

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone access is required. Please allow microphone access and try again.");
      } else {
        setError("Failed to connect to voice agent. Please check your connection and try again.");
      }
    }
  }, [conversation, level, topic]);

  const stopAgent = useCallback(async () => {
    const currentState = agentStateRef.current;
    if (currentState === "idle" || currentState === "disconnecting") {
      console.warn(`[VoiceAgent] stopAgent blocked — already in state: ${currentState}`);
      return;
    }

    console.log("[VoiceAgent] Ending session...");
    setAgentState("disconnecting");
    agentStateRef.current = "disconnecting";

    try {
      await conversation.endSession();
    } catch {
      console.warn("[VoiceAgent] endSession threw (likely already disconnected)");
    }

    if (mountedRef.current) {
      setAgentState("idle");
      agentStateRef.current = "idle";
      setConversationEnded(true);
    }
  }, [conversation]);

  const finishReview = useCallback(() => {
    onEnd(transcriptRef.current.length);
  }, [onEnd]);

  const resumeConversation = useCallback(() => {
    setConversationEnded(false);
    setError(null);
    startAgent({ keepTranscript: true });
  }, [startAgent]);

  // No automatic cleanup on unmount — the ElevenLabs SDK handles its own
  // WebSocket teardown, and React Strict Mode's fake unmount/remount cycle
  // would kill the connection mid-handshake. Session ending is handled
  // explicitly via stopAgent() or the parent's handleVoiceAgentEnd().

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
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

  const isConnected = agentState === "connected";
  const isStarting = agentState === "connecting";
  const isSpeaking = conversation.isSpeaking;

  // ── Post-conversation transcript review ──
  if (conversationEnded && transcript.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <span className="text-sm font-medium">Conversation ended</span>
            <Badge>{jlptLevelLabel(level)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">{topic}</span>
            <span className="text-sm text-muted jp-text">{topicJp}</span>
          </div>
        </div>

        <Card className="py-8 text-center">
          <PhoneOff className="h-8 w-8 text-muted mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Conversation Ended</h3>
          <p className="text-sm text-muted mb-4">
            {transcript.length} messages exchanged. Review your transcript below.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={finishReview}>
              Back to Topics
            </Button>
            <Button onClick={resumeConversation}>
              <Phone className="h-4 w-4" /> Resume Conversation
            </Button>
          </div>
        </Card>

        <TranscriptView
          transcript={transcript}
          showTranslation={showTranslation}
          setShowTranslation={setShowTranslation}
          playingTranslation={playingTranslation}
          onPlayTranslation={playEnglishTranslation}
          isLive={false}
          isSpeaking={false}
        />
      </div>
    );
  }

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
                : isStarting
                  ? "bg-amber-500 animate-pulse"
                  : "bg-gray-400"
            }`}
          />
          <span className="text-sm font-medium">
            {isConnected
              ? isSpeaking
                ? "Agent is speaking..."
                : "Listening..."
              : isStarting
                ? "Connecting..."
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
            <Button onClick={() => startAgent()} disabled={isStarting}>
              Try Again
            </Button>
          </div>
        ) : !isConnected && !isStarting ? (
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
            <Button size="lg" onClick={() => startAgent()}>
              <Phone className="h-5 w-5" /> Start Voice Session
            </Button>
          </div>
        ) : isStarting ? (
          <div className="space-y-6">
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <p className="text-sm text-muted">
              Connecting to agent...
            </p>
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
                <PhoneOff className="h-5 w-5" /> End Conversation
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Live transcript */}
      {transcript.length > 0 && (
        <TranscriptView
          transcript={transcript}
          showTranslation={showTranslation}
          setShowTranslation={setShowTranslation}
          playingTranslation={playingTranslation}
          onPlayTranslation={playEnglishTranslation}
          isLive={true}
          isSpeaking={isConnected && isSpeaking}
        />
      )}
    </div>
  );
}

// ── Shared transcript display component ──

function TranscriptView({
  transcript,
  showTranslation,
  setShowTranslation,
  playingTranslation,
  onPlayTranslation,
  isLive,
  isSpeaking,
}: {
  transcript: TranscriptEntry[];
  showTranslation: boolean;
  setShowTranslation: (fn: (prev: boolean) => boolean) => void;
  playingTranslation: number | null;
  onPlayTranslation: (text: string, index: number) => void;
  isLive: boolean;
  isSpeaking: boolean;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
          Transcript
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTranslation((prev) => !prev)}
          className="text-xs"
        >
          <Languages className="h-3.5 w-3.5" />
          {showTranslation ? "Hide English Translation" : "Show English Translation"}
        </Button>
      </div>
      <div className={`space-y-3 overflow-y-auto ${isLive ? "max-h-64" : "max-h-[60vh]"}`}>
        {transcript.map((entry, i) => {
          const { japanese, english } = parseTranslation(entry.content);
          return (
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
                <p className="jp-text whitespace-pre-wrap">{japanese}</p>
                {showTranslation && english && entry.role === "assistant" && (
                  <div className="mt-1.5 border-t border-border pt-1.5 flex items-start gap-2">
                    <p className="text-xs text-muted italic flex-1">{english}</p>
                    <button
                      onClick={() => onPlayTranslation(english, i)}
                      disabled={playingTranslation !== null}
                      className="shrink-0 rounded-full p-1 text-muted hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      title="Play English translation"
                    >
                      {playingTranslation === i ? (
                        <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLive && isSpeaking && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-background border border-border px-4 py-2">
              <LoadingDots />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function buildAgentContext(level: number, topic: string): string {
  const levelGuide: Record<number, string> = {
    5: "Use only basic, simple Japanese. です/ます form. Short sentences. Basic vocabulary.",
    4: "Use simple Japanese about daily topics. です/ます form. Basic grammar patterns.",
    3: "Use intermediate Japanese. Mix polite and casual forms. Natural daily conversation.",
    2: "Use upper-intermediate Japanese. Complex grammar. Nuanced expressions.",
    1: "Use advanced, native-like Japanese. Sophisticated vocabulary. Formal and informal registers.",
  };

  return `You are a friendly and proactive Japanese conversation partner for JLPT N${level} study. You are an AI voice agent powered by ElevenLabs.

Topic: ${topic}

${levelGuide[level] || levelGuide[5]}

CRITICAL — Language rules:
- Speak ONLY in Japanese. Never use English in any part of your response.
- Do NOT provide English translations, explanations, or parenthetical notes.
- Every word you output must be Japanese.

Introduction (your very first message only):
- Greet the student and introduce yourself as ふみ (Fumi). Say "私の名前はふみです。よろしくお願いします。"
- Briefly explain that you are here to help practice Japanese conversation for JLPT N${level}
- Transition into the topic "${topic}" with an opening question

Guidelines:
- ALWAYS end your response with a question to keep the conversation going
- Lead the conversation — don't wait for the student to drive it
- Keep responses concise (2-3 sentences max, then your question)
- If the student gives a short answer, build on it and ask a related follow-up
- Gently correct pronunciation and grammar mistakes inline, then continue
- Be encouraging and natural — react to what they say before asking the next question
- Stay on the topic of "${topic}" but explore different angles of it
- Adjust complexity to N${level} level`;
}
