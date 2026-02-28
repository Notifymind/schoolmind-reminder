import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  class: varchar("class", { length: 50 }).references(() => schoolclass.name),
  role: varchar("role", { length: 50 }).default("free").notNull(),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  lastTrial: timestamp("last_trial"),
  balance: numeric("balance", { precision: 10, scale: 2 }).default("0").notNull(),
  maxDebt: numeric("max_debt", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const passkey = pgTable(
  "passkey",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    createdAt: timestamp("created_at"),
    aaguid: text("aaguid"),
  },
  (table) => [
    index("passkey_userId_idx").on(table.userId),
    index("passkey_credentialID_idx").on(table.credentialID),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  passkeys: many(passkey),
  class: one(schoolclass, {
    fields: [user.class],
    references: [schoolclass.name],
  }),
  notificationPresets: many(notificationPresets),
  scheduledNotifications: many(scheduledNotifications),
  examNotificationMeta: many(examNotificationMeta),
  pushSubscriptions: many(pushSubscriptions),
  sellerCodes: many(codes, { relationName: "seller" }),
  redeemedCodes: many(codes, { relationName: "redeemedBy" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id],
  }),
}));

export const schoolclass = pgTable("schoolclass", {
  name: varchar("name", { length: 50 }).primaryKey(),
  username: varchar("username", { length: 100 }).notNull(),
  password: varchar("password", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  className: varchar("class_name", { length: 50 })
    .notNull()
    .references(() => schoolclass.name),
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
  className: varchar("class_name", { length: 50 })
    .notNull()
    .references(() => schoolclass.name),
  subject: varchar("subject"),
  title: varchar("title"),
  date: varchar("date"),
  time: varchar("time"),
  type: varchar("type"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schoolclassRelations = relations(schoolclass, ({ many }) => ({
  exams: many(exams),
  assignments: many(assignments),
  users: many(user),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  class: one(schoolclass, {
    fields: [exams.className],
    references: [schoolclass.name],
  }),
  scheduledNotifications: many(scheduledNotifications),
  examNotificationMeta: many(examNotificationMeta),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  class: one(schoolclass, {
    fields: [assignments.className],
    references: [schoolclass.name],
  }),
}));

export const notificationPresets = pgTable(
  "notification_presets",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    isOneTime: boolean("is_one_time").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("notification_presets_userId_idx").on(table.userId)],
);

export const notificationTimes = pgTable(
  "notification_times",
  {
    id: serial("id").primaryKey(),
    presetId: integer("preset_id")
      .notNull()
      .references(() => notificationPresets.id, { onDelete: "cascade" }),
    daysBefore: integer("days_before").notNull(),
    time: varchar("time", { length: 5 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("notification_times_presetId_idx").on(table.presetId)],
);

export const scheduledNotifications = pgTable(
  "scheduled_notifications",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    notificationTimeId: integer("notification_time_id")
      .notNull()
      .references(() => notificationTimes.id, { onDelete: "cascade" }),
    scheduledFor: timestamp("scheduled_for").notNull(),
    sent: boolean("sent").default(false).notNull(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("scheduled_notifications_examId_idx").on(table.examId),
    index("scheduled_notifications_userId_idx").on(table.userId),
    index("scheduled_notifications_scheduledFor_idx").on(table.scheduledFor),
  ],
);

export const examNotificationMeta = pgTable(
  "exam_notification_meta",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    presetId: integer("preset_id")
      .notNull()
      .references(() => notificationPresets.id, { onDelete: "cascade" }),
    appliedAt: timestamp("applied_at").defaultNow().notNull(),
  },
  (table) => [
    index("exam_notification_meta_examId_idx").on(table.examId),
    index("exam_notification_meta_userId_idx").on(table.userId),
  ],
);

export const notificationPresetsRelations = relations(
  notificationPresets,
  ({ one, many }) => ({
    user: one(user, {
      fields: [notificationPresets.userId],
      references: [user.id],
    }),
    notificationTimes: many(notificationTimes),
    scheduledNotifications: many(scheduledNotifications),
    examNotificationMeta: many(examNotificationMeta),
  }),
);

export const notificationTimesRelations = relations(
  notificationTimes,
  ({ one, many }) => ({
    preset: one(notificationPresets, {
      fields: [notificationTimes.presetId],
      references: [notificationPresets.id],
    }),
    scheduledNotifications: many(scheduledNotifications),
  }),
);

export const scheduledNotificationsRelations = relations(
  scheduledNotifications,
  ({ one }) => ({
    exam: one(exams, {
      fields: [scheduledNotifications.examId],
      references: [exams.id],
    }),
    user: one(user, {
      fields: [scheduledNotifications.userId],
      references: [user.id],
    }),
    notificationTime: one(notificationTimes, {
      fields: [scheduledNotifications.notificationTimeId],
      references: [notificationTimes.id],
    }),
  }),
);

export const examNotificationMetaRelations = relations(
  examNotificationMeta,
  ({ one }) => ({
    exam: one(exams, {
      fields: [examNotificationMeta.examId],
      references: [exams.id],
    }),
    user: one(user, {
      fields: [examNotificationMeta.userId],
      references: [user.id],
    }),
    preset: one(notificationPresets, {
      fields: [examNotificationMeta.presetId],
      references: [notificationPresets.id],
    }),
  }),
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("push_subscriptions_userId_idx").on(table.userId)],
);

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(user, {
      fields: [pushSubscriptions.userId],
      references: [user.id],
    }),
  }),
);

export const codes = pgTable(
  "codes",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 11 }).notNull().unique(),
    type: varchar("type", { length: 20 }).notNull(),
    duration: varchar("duration", { length: 20 }).notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    redeemedBy: text("redeemed_by").references(() => user.id, { onDelete: "set null" }),
    redeemedAt: timestamp("redeemed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("codes_sellerId_idx").on(table.sellerId),
    index("codes_code_idx").on(table.code),
    index("codes_redeemedBy_idx").on(table.redeemedBy),
  ],
);

export const codesRelations = relations(codes, ({ one }) => ({
  seller: one(user, {
    fields: [codes.sellerId],
    references: [user.id],
    relationName: "seller",
  }),
  redeemedByUser: one(user, {
    fields: [codes.redeemedBy],
    references: [user.id],
    relationName: "redeemedBy",
  }),
}));
