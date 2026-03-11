"use client";

import { cn, JLPT_LEVELS, jlptLevelLabel } from "@/lib/utils";

interface LevelSelectorProps {
  value: number;
  onChange: (level: number) => void;
  size?: "sm" | "lg";
}

const levelColors: Record<number, { active: string; inactive: string }> = {
  5: { active: "bg-emerald-600 text-white border-emerald-600", inactive: "border-emerald-300 text-emerald-700 hover:bg-emerald-50" },
  4: { active: "bg-blue-600 text-white border-blue-600", inactive: "border-blue-300 text-blue-700 hover:bg-blue-50" },
  3: { active: "bg-amber-600 text-white border-amber-600", inactive: "border-amber-300 text-amber-700 hover:bg-amber-50" },
  2: { active: "bg-orange-600 text-white border-orange-600", inactive: "border-orange-300 text-orange-700 hover:bg-orange-50" },
  1: { active: "bg-red-600 text-white border-red-600", inactive: "border-red-300 text-red-700 hover:bg-red-50" },
};

export function LevelSelector({ value, onChange, size = "sm" }: LevelSelectorProps) {
  return (
    <div className="flex gap-2">
      {JLPT_LEVELS.map((level) => {
        const isActive = value === level;
        const colors = levelColors[level];
        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={cn(
              "rounded-lg border-2 font-semibold transition-all duration-150",
              size === "sm" ? "px-3 py-1.5 text-sm" : "px-5 py-3 text-base",
              isActive ? colors.active : colors.inactive
            )}
          >
            {jlptLevelLabel(level)}
          </button>
        );
      })}
    </div>
  );
}
