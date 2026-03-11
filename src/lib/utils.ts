import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export const JLPT_LEVELS = [5, 4, 3, 2, 1] as const;
export type JlptLevel = (typeof JLPT_LEVELS)[number];

export function jlptLevelLabel(level: number): string {
  return `N${level}`;
}

export function jlptLevelColor(level: number): string {
  const colors: Record<number, string> = {
    5: "bg-emerald-100 text-emerald-800",
    4: "bg-blue-100 text-blue-800",
    3: "bg-amber-100 text-amber-800",
    2: "bg-orange-100 text-orange-800",
    1: "bg-red-100 text-red-800",
  };
  return colors[level] ?? "bg-gray-100 text-gray-800";
}
