import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import { user, exams, assignments } from "./schema";

const db = drizzle(process.env.DATABASE_URL!);

export async function getUserRole(userId: string) {
  const result = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  return result[0]?.role ?? "free";
}

export async function getUserClass(userId: string) {
  const result = await db.select({ class: user.class }).from(user).where(eq(user.id, userId));
  return result[0]?.class ?? null;
}

export async function getExamsByClass(className: string) {
  return db.select().from(exams).where(eq(exams.className, className)).orderBy(desc(exams.dueDate));
}

export async function getAssignmentsByClass(className: string) {
  return db.select().from(assignments).where(eq(assignments.className, className)).orderBy(desc(assignments.dueDate));
}

export { db };
