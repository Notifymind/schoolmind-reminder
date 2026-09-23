import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { defaultCountdownColors, type CountdownColors, type SubjectAlias, type UserSettings } from "@/lib/user-settings";

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const [saved] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return {
    subjectAliases: saved?.subjectAliases ?? [],
    countdownColors: { ...defaultCountdownColors, ...saved?.countdownColors },
  };
}

export async function saveSubjectAliases(userId: string, subjectAliases: SubjectAlias[]) {
  await db.insert(userSettings).values({ userId, subjectAliases })
    .onConflictDoUpdate({ target: userSettings.userId, set: { subjectAliases } });
}

export async function saveCountdownColors(userId: string, countdownColors: CountdownColors) {
  await db.insert(userSettings).values({ userId, countdownColors })
    .onConflictDoUpdate({ target: userSettings.userId, set: { countdownColors } });
}
