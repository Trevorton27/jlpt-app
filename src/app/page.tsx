import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BookOpen, MessageCircle, Mic, TrendingUp } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">声</span>
            <span className="text-lg font-bold">KoeJLPT</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          Voice-first JLPT preparation
        </div>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight">
          Master Japanese with your{" "}
          <span className="text-primary">voice</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Vocabulary, conversation, and pronunciation practice tailored to your
          JLPT level. Build real speaking confidence, not just test knowledge.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-primary px-8 py-3 text-base font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all"
          >
            Start studying free
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-border px-8 py-3 text-base font-medium hover:bg-surface-hover transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Level badges */}
        <div className="mt-12 flex items-center justify-center gap-3">
          {["N5", "N4", "N3", "N2", "N1"].map((level) => (
            <span
              key={level}
              className="rounded-full border border-border px-4 py-1 text-sm font-medium text-muted"
            >
              {level}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<BookOpen className="h-6 w-6" />}
            title="Level-matched vocab"
            description="Study vocabulary curated for each JLPT level with smart tracking and spaced review."
          />
          <FeatureCard
            icon={<MessageCircle className="h-6 w-6" />}
            title="Voice conversation"
            description="Practice real conversations adapted to your level with AI-powered voice partners."
          />
          <FeatureCard
            icon={<Mic className="h-6 w-6" />}
            title="Pronunciation drills"
            description="Listen, repeat, and improve your pronunciation with instant voice feedback."
          />
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6" />}
            title="Track progress"
            description="See your study sessions, streaks, and improvement over time across all modes."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <p>KoeJLPT — Voice-first JLPT study companion</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 transition-all hover:shadow-md hover:border-primary/20">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}
