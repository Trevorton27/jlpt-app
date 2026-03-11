import { getOrCreateUserProfile } from "@/lib/user";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const profile = await getOrCreateUserProfile();
  if (!profile) redirect("/sign-in");

  return (
    <SettingsClient
      preferences={profile.preferences ? JSON.parse(JSON.stringify(profile.preferences)) : null}
      profile={{ name: profile.name, email: profile.email }}
    />
  );
}
