"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getClassNames, getUserRole, setUserClass } from "@/db";

export async function selectClassAction(className: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { error: "Please log in to choose your class." };
  }

  if (typeof className !== "string" || !className || className.length > 50) {
    return { error: "Choose a valid class." };
  }

  const role = await getUserRole(session.user.id);
  if (role.split(",").includes("seller")) {
    return { error: "Sellers cannot change their class. Contact an administrator." };
  }

  const classes = await getClassNames();
  if (!classes.some((schoolClass) => schoolClass.name === className)) {
    return { error: "This class is no longer available. Refresh and choose another class." };
  }

  await setUserClass(session.user.id, className);
  revalidatePath("/app", "layout");
  return { success: true };
}
