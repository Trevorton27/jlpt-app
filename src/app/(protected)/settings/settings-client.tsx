"use client";

import { useState } from "react";
import { Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { LevelSelector } from "@/components/ui/level-selector";
import { jlptLevelLabel } from "@/lib/utils";
import { ElevenLabsSection } from "@/components/settings/elevenlabs-section";

interface Props {
  preferences: {
    jlptLevel: number;
    dailyGoal: number;
    voiceSpeed: number;
    showRomaji: boolean;
    autoPlayAudio: boolean;
  } | null;
  profile: {
    name: string | null;
    email: string | null;
  };
}

export function SettingsClient({ preferences, profile }: Props) {
  const [level, setLevel] = useState(preferences?.jlptLevel ?? 5);
  const [dailyGoal, setDailyGoal] = useState(preferences?.dailyGoal ?? 20);
  const [voiceSpeed, setVoiceSpeed] = useState(preferences?.voiceSpeed ?? 1.0);
  const [showRomaji, setShowRomaji] = useState(preferences?.showRomaji ?? false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(preferences?.autoPlayAudio ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/sessions/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jlptLevel: level,
          dailyGoal,
          voiceSpeed,
          showRomaji,
          autoPlayAudio,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted">Manage your study preferences</p>
      </div>

      {/* Profile info */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <User className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>{profile.name || "Student"}</CardTitle>
            <CardDescription>{profile.email}</CardDescription>
          </div>
        </div>
      </Card>

      {/* JLPT Level */}
      <Card>
        <CardTitle className="mb-1">JLPT Level</CardTitle>
        <CardDescription className="mb-4">
          Currently studying for {jlptLevelLabel(level)}
        </CardDescription>
        <LevelSelector value={level} onChange={setLevel} size="lg" />
      </Card>

      {/* Study preferences */}
      <Card>
        <CardTitle className="mb-4">Study Preferences</CardTitle>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Daily word goal: {dailyGoal} words
            </label>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted">
              <span>5</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Voice speed: {voiceSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted">
              <span>Slow (0.5x)</span>
              <span>Normal (1.0x)</span>
              <span>Fast (2.0x)</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Show romaji</p>
              <p className="text-xs text-muted">Display romanized readings alongside Japanese text</p>
            </div>
            <button
              onClick={() => setShowRomaji(!showRomaji)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                showRomaji ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  showRomaji ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-play audio</p>
              <p className="text-xs text-muted">Automatically play word pronunciation during study</p>
            </div>
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                autoPlayAudio ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  autoPlayAudio ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* ElevenLabs API key */}
      <ElevenLabsSection />

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" /> Save Settings
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600 animate-fade-in">Settings saved!</span>
        )}
      </div>
    </div>
  );
}
