"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getClassNames, getUserClass, setUserClass } from "@/db";

export async function selectClassAction(className: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { error: "Please log in to choose your class." };
  }

  if (typeof className !== "string" || !className || className.length > 50) {
    return { error: "Choose a valid class." };
  }

  const [classes, currentClass] = await Promise.all([
    getClassNames(),
    getUserClass(session.user.id),
  ]);
  if (currentClass) {
    return { error: "You already have a class assigned." };
  }
  if (!classes.some((schoolClass) => schoolClass.name === className)) {
    return { error: "This class is no longer available. Refresh and choose another class." };
  }

  await setUserClass(session.user.id, className);
  revalidatePath("/app", "layout");
  return { success: true };
}
