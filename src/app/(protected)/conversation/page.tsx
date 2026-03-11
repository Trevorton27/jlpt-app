import { getOrCreateUserProfile } from "@/lib/user";
import { redirect } from "next/navigation";
import { ConversationClient } from "./conversation-client";

export default async function ConversationPage() {
  const profile = await getOrCreateUserProfile();
  if (!profile) redirect("/sign-in");

  return <ConversationClient defaultLevel={profile.preferences?.jlptLevel ?? 5} />;
}
