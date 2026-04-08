"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Link2, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

interface Status {
  connected: boolean;
  apiKeyLast4: string | null;
  verifiedAt: string | null;
  defaultVoiceId: string | null;
}

interface Voice {
  voiceId: string;
  name: string;
  category?: string;
  language?: string;
}

export function ElevenLabsSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [defaultVoiceId, setDefaultVoiceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/settings/elevenlabs/status", { cache: "no-store" });
    if (res.ok) {
      const s: Status = await res.json();
      setStatus(s);
      setDefaultVoiceId(s.defaultVoiceId ?? "");
    }
  }, []);

  const loadVoices = useCallback(async () => {
    const res = await fetch("/api/settings/elevenlabs/voices", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setVoices(Array.isArray(data.voices) ? data.voices : []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadVoices()]);
      setLoading(false);
    })();
  }, [loadStatus, loadVoices]);

  async function handleConnect() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/elevenlabs/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          defaultVoiceId: defaultVoiceId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect");
      } else {
        setApiKey("");
        setMessage(
          data.voiceCount
            ? `Connected — ${data.voiceCount} voices available`
            : "Connected"
        );
        await Promise.all([loadStatus(), loadVoices()]);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/elevenlabs/disconnect", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to disconnect");
      } else {
        setMessage("Disconnected");
        setVoices([]);
        await loadStatus();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVoice(voiceId: string) {
    setDefaultVoiceId(voiceId);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings/elevenlabs/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultVoiceId: voiceId || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save voice");
    } else {
      setMessage("Default voice updated");
      await loadStatus();
    }
  }

  const connected = !!status?.connected;

  return (
    <Card>
      <div className="flex items-center gap-4 mb-4">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <CardTitle>ElevenLabs API Key</CardTitle>
          <CardDescription>
            Required for TTS and conversation practice. Bring your own key.
          </CardDescription>
        </div>
        <StatusBadge
          loading={loading}
          connected={connected}
          last4={status?.apiKeyLast4}
        />
      </div>

      {status && !connected && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No key connected. Voice features are disabled until you add an ElevenLabs API
          key with at least the <code>text_to_speech</code> permission.
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {connected ? "Update API key" : "ElevenLabs API key"}
          </label>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk_..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="mt-1 text-xs text-muted">
            Your key is validated against ElevenLabs, encrypted, and never shown again.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleConnect} loading={saving} disabled={!apiKey.trim()}>
            <Link2 className="h-4 w-4" />
            {connected ? "Update key" : "Connect"}
          </Button>
          {connected && (
            <Button variant="danger" onClick={handleDisconnect} disabled={saving}>
              <Link2Off className="h-4 w-4" />
              Disconnect
            </Button>
          )}
        </div>

        {voices.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Default voice</label>
            <select
              value={defaultVoiceId}
              onChange={(e) => handleSaveVoice(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Use app default</option>
              {voices.map((v) => (
                <option key={v.voiceId} value={v.voiceId}>
                  {v.name}
                  {v.language ? ` (${v.language})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {connected && voices.length === 0 && (
          <p className="text-xs text-muted">
            Voice list unavailable — your key may be missing the{" "}
            <code>voices_read</code> permission. TTS will still work with the app
            default voice.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && !error && (
          <p className="text-sm text-emerald-600">{message}</p>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({
  loading,
  connected,
  last4,
}: {
  loading: boolean;
  connected: boolean;
  last4: string | null | undefined;
}) {
  if (loading) {
    return <span className="text-xs text-muted">Loading…</span>;
  }
  if (connected) {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        Connected{last4 ? ` • ****${last4}` : ""}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-muted">
      Not connected
    </span>
  );
}
