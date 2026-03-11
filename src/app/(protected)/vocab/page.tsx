import { getOrCreateUserProfile } from "@/lib/user";
import { redirect } from "next/navigation";
import { VocabClient } from "./vocab-client";

export default async function VocabPage() {
  const profile = await getOrCreateUserProfile();
  if (!profile) redirect("/sign-in");

  const level = profile.preferences?.jlptLevel ?? 5;

  return <VocabClient defaultLevel={level} />;
}
