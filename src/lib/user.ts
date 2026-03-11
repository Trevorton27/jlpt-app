import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export async function getOrCreateUserProfile() {
  const { userId } = await auth();
  if (!userId) return null;

  let profile = await db.userProfile.findUnique({
    where: { clerkId: userId },
    include: { preferences: true },
  });

  if (!profile) {
    const user = await currentUser();
    profile = await db.userProfile.create({
      data: {
        clerkId: userId,
        email: user?.emailAddresses[0]?.emailAddress,
        name: user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : null,
        imageUrl: user?.imageUrl,
        preferences: {
          create: { jlptLevel: 5 },
        },
      },
      include: { preferences: true },
    });
  }

  return profile;
}

export async function getUserProfile() {
  const { userId } = await auth();
  if (!userId) return null;

  return db.userProfile.findUnique({
    where: { clerkId: userId },
    include: { preferences: true },
  });
}

export async function requireUserProfile() {
  const profile = await getOrCreateUserProfile();
  if (!profile) throw new Error("Unauthorized");
  return profile;
}
