import { getOrCreateUserProfile } from "@/lib/user";
import { redirect } from "next/navigation";
import { PronunciationClient } from "./pronunciation-client";

export default async function PronunciationPage() {
  const profile = await getOrCreateUserProfile();
  if (!profile) redirect("/sign-in");

  return <PronunciationClient defaultLevel={profile.preferences?.jlptLevel ?? 5} />;
}
