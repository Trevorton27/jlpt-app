"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, Mic, Send, Volume2, StopCircle, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LevelSelector } from "@/components/ui/level-selector";
import { LoadingDots } from "@/components/ui/loading";
import { jlptLevelLabel } from "@/lib/utils";
import { getTopicsForLevel, ConversationTopic } from "@/types/conversation";
import { getConversationSystemPrompt } from "@/lib/conversation-utils";
import { VoiceAgent } from "@/components/conversation/voice-agent";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

type View = "topics" | "chat" | "voice-agent";

export function ConversationClient({ defaultLevel }: { defaultLevel: number }) {
  const [level, setLevel] = useState(defaultLevel);
  const [view, setView] = useState<View>("topics");
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic | null>(null);
  const [mode, setMode] = useState<"FREE" | "TOPIC_BASED" | "VOCAB_GUIDED">("TOPIC_BASED");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const topics = getTopicsForLevel(level);

  const hasAgentId = !!process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function createConversationSession(topic: ConversationTopic) {
    const res = await fetch("/api/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jlptLevel: level,
        topic: topic.title,
        mode,
      }),
    });
    const session = await res.json();

    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jlptLevel: level,
        sessionType: "CONVERSATION",
      }),
    });

    return session;
  }

  async function startVoiceAgent(topic: ConversationTopic) {
    setSelectedTopic(topic);
    setLoading(true);
    try {
      const session = await createConversationSession(topic);
      setSessionId(session.id);
      setView("voice-agent");
    } catch (err) {
      console.error("Failed to start voice agent:", err);
    } finally {
      setLoading(false);
    }
  }

  async function startTextChat(topic: ConversationTopic) {
    setSelectedTopic(topic);
    setView("chat");
    setMessages([]);
    setLoading(true);

    try {
      const session = await createConversationSession(topic);
      setSessionId(session.id);

      const systemPrompt = getConversationSystemPrompt(level, topic.title);
      const greeting = getGreeting(level, topic);

      setMessages([
        { role: "system", content: systemPrompt },
        { role: "assistant", content: greeting },
      ]);

      await fetch("/api/conversation/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          role: "ASSISTANT",
          content: greeting,
        }),
      });
    } catch (err) {
      console.error("Failed to start conversation:", err);
    } finally {
      setLoading(false);
    }
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !sessionId) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    await fetch("/api/conversation/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        role: "USER",
        content: text,
      }),
    });

    const response = generateResponse(level, selectedTopic!, messages, text);
    const assistantMessage: Message = { role: "assistant", content: response };

    setMessages((prev) => [...prev, assistantMessage]);

    await fetch("/api/conversation/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        role: "ASSISTANT",
        content: response,
      }),
    });

    setLoading(false);
  }, [sessionId, messages, level, selectedTopic]);

  async function playMessage(text: string, index: number) {
    setPlayingId(index);
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
          setPlayingId(null);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } else {
        setPlayingId(null);
      }
    } catch {
      setPlayingId(null);
    }
  }

  async function startVoiceInput() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === "recording") mediaRecorder.stop();
      }, 10000);
    } catch {
      setRecording(false);
      alert("Microphone access is required for voice input.");
    }
  }

  function stopVoiceInput() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  async function endConversation() {
    if (sessionId) {
      await fetch("/api/conversation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          status: "COMPLETED",
          summary: `${selectedTopic?.title} conversation with ${messages.filter((m) => m.role !== "system").length} messages`,
        }),
      });
    }
    setView("topics");
    setMessages([]);
    setSessionId(null);
  }

  async function handleVoiceAgentEnd(messageCount: number) {
    if (sessionId) {
      await fetch("/api/conversation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          status: "COMPLETED",
          messageCount,
          summary: `Voice conversation about ${selectedTopic?.title} (${messageCount} exchanges)`,
        }),
      });
    }
    setView("topics");
    setSessionId(null);
  }

  // ── Topic selection view ──
  if (view === "topics") {
    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Conversation Practice</h1>
          <p className="text-muted">Choose a topic and practice speaking Japanese</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <LevelSelector value={level} onChange={setLevel} />
          <div className="flex gap-2">
            {(["TOPIC_BASED", "FREE", "VOCAB_GUIDED"] as const).map((m) => (
              <Button
                key={m}
                variant={mode === m ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMode(m)}
              >
                {m === "TOPIC_BASED" ? "Topics" : m === "FREE" ? "Free talk" : "Vocab-based"}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Card key={topic.id} className="group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{topic.title}</p>
                  <p className="text-lg jp-text text-muted">{topic.titleJp}</p>
                </div>
                <MessageCircle className="h-5 w-5 text-muted" />
              </div>
              <p className="text-sm text-muted mb-4">{topic.description}</p>
              <div className="flex gap-2">
                {hasAgentId && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => startVoiceAgent(topic)}
                    disabled={loading}
                  >
                    <Phone className="h-3.5 w-3.5" /> Voice
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={hasAgentId ? "secondary" : "primary"}
                  onClick={() => startTextChat(topic)}
                  disabled={loading}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Text
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── Voice agent view ──
  if (view === "voice-agent" && selectedTopic) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">{selectedTopic.title}</h2>
            <p className="text-sm text-muted">
              <Badge>{jlptLevelLabel(level)}</Badge>
              <span className="ml-2 jp-text">{selectedTopic.titleJp}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleVoiceAgentEnd(0)}>
            <X className="h-4 w-4" /> Back
          </Button>
        </div>

        <VoiceAgent
          level={level}
          topic={selectedTopic.title}
          topicJp={selectedTopic.titleJp}
          sessionId={sessionId}
          onEnd={handleVoiceAgentEnd}
        />
      </div>
    );
  }

  // ── Text chat view ──
  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-12rem)]">
      {/* Chat header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{selectedTopic?.title}</h2>
          <p className="text-sm text-muted">
            <Badge>{jlptLevelLabel(level)}</Badge>
            <span className="ml-2 jp-text">{selectedTopic?.titleJp}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {hasAgentId && selectedTopic && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setView("voice-agent");
              }}
            >
              <Phone className="h-4 w-4" /> Switch to Voice
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={endConversation}>
            <X className="h-4 w-4" /> End
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {visibleMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-white"
                  : "bg-surface border border-border"
              }`}
            >
              <p className="text-sm jp-text whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "assistant" && (
                <button
                  onClick={() => playMessage(msg.content, i)}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                >
                  <Volume2 className={`h-3 w-3 ${playingId === i ? "animate-pulse-soft" : ""}`} />
                  {playingId === i ? "Playing..." : "Listen"}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-surface border border-border px-4 py-3">
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button
          variant={recording ? "danger" : "ghost"}
          size="sm"
          onClick={recording ? stopVoiceInput : startVoiceInput}
        >
          {recording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Type in Japanese or English..."
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button size="sm" onClick={() => sendMessage(input)} disabled={!input.trim() || loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function getGreeting(level: number, topic: ConversationTopic): string {
  const greetings: Record<number, (topic: string) => string> = {
    5: (t) => `こんにちは！${t}について話しましょう。\n(Hello! Let's talk about ${t}.)`,
    4: (t) => `こんにちは！今日は「${t}」をテーマに話しましょう。何か言いたいことはありますか？\n(Hello! Let's talk about "${t}" today. Do you have anything you'd like to say?)`,
    3: (t) => `こんにちは！今日のテーマは「${t}」です。このテーマについてどう思いますか？\n(Hello! Today's theme is "${t}". What do you think about this topic?)`,
    2: (t) => `こんにちは。本日は「${t}」についてお話しましょう。このテーマに関するお考えをお聞かせください。\n(Hello. Let's discuss "${t}" today. Please share your thoughts on this topic.)`,
    1: (t) => `こんにちは。「${t}」というテーマで議論を進めていきたいと思います。まず、このテーマについてのご意見をお聞かせいただけますか。\n(Hello. I'd like to discuss the topic of "${t}". First, could you share your opinion on this?)`,
  };
  return greetings[level]?.(topic.title) ?? greetings[5](topic.title);
}

function generateResponse(level: number, topic: ConversationTopic, history: Message[], userInput: string): string {
  const responses: Record<number, string[]> = {
    5: [
      `そうですね！いいですね。\n(That's nice!)`,
      `わかりました。もっと教えてください。\n(I see. Please tell me more.)`,
      `おもしろいですね。${topic.titleJp}について、他に何かありますか？\n(That's interesting. Is there anything else about ${topic.title}?)`,
      `いい答えですね！次の質問です。好きな${topic.titleJp}は何ですか？\n(Good answer! Next question: what is your favorite related to ${topic.title}?)`,
    ],
    4: [
      `なるほど、よく分かりました。それについてもう少し詳しく話してもらえますか？\n(I see, I understand well. Could you tell me more details about that?)`,
      `いい意見ですね。私もそう思います。他にはどうですか？\n(That's a good opinion. I think so too. What else?)`,
      `${topic.titleJp}の話は面白いですね。あなたの経験を教えてください。\n(Talking about ${topic.title} is interesting. Please tell me about your experience.)`,
    ],
    3: [
      `とても興味深い考えですね。その理由をもう少し聞かせてもらえますか？\n(That's a very interesting idea. Could you tell me a bit more about the reason?)`,
      `なるほど、そういう見方もありますね。${topic.titleJp}についてはいろいろな意見がありますよね。\n(I see, that's one way to look at it. There are various opinions about ${topic.title}, aren't there?)`,
      `面白い視点ですね。実は私も似たような経験があります。\n(That's an interesting perspective. Actually, I have a similar experience.)`,
    ],
    2: [
      `おっしゃる通りだと思います。その点についてさらに掘り下げてみましょう。\n(I think you're right. Let's dig deeper into that point.)`,
      `なるほど、非常に鋭い指摘ですね。${topic.titleJp}に関して、別の角度から考えてみるとどうでしょうか。\n(I see, that's a very sharp observation. What if we consider ${topic.title} from a different angle?)`,
    ],
    1: [
      `大変示唆に富むご意見ですね。その論点をさらに発展させてみましょう。${topic.titleJp}における本質的な課題は何だとお考えですか。\n(That's a very insightful opinion. Let's develop that point further. What do you think is the essential challenge in ${topic.title}?)`,
      `興味深い議論ですね。様々な観点から検討する必要がありそうです。\n(This is an interesting discussion. It seems we need to examine it from various perspectives.)`,
    ],
  };

  const levelResponses = responses[level] || responses[5];
  const idx = history.filter((m) => m.role === "assistant").length % levelResponses.length;
  return levelResponses[idx];
}
