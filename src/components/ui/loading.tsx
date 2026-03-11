import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
      <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
      <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 animate-pulse">
      <div className="h-4 w-1/3 bg-border rounded mb-3" />
      <div className="h-3 w-2/3 bg-border rounded mb-2" />
      <div className="h-3 w-1/2 bg-border rounded" />
    </div>
  );
}
