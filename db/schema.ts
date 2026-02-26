import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  subject: varchar("subject"),
  title: varchar("title"),
  date: varchar("date"),
  time: varchar("time"),
  type: varchar("type"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  subject: varchar("subject"),
  title: varchar("title"),
  date: varchar("date"),
  time: varchar("time"),
  type: varchar("type"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
