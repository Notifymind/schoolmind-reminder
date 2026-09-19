import {
  pgTable,
  check,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

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
  balance: numeric("balance", { precision: 10, scale: 2 }).default("0").notNull(),
  maxDebt: numeric("max_debt", { precision: 10, scale: 2 }).default("0").notNull(),
  walletBalance: numeric("wallet_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  subscriptionPlan: varchar("subscription_plan", { length: 20 }),
  subscriptionAutoRenew: boolean("subscription_auto_renew").default(false).notNull(),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, (table) => [check("wallet_balance_nonnegative", sql`${table.walletBalance} >= 0`)]);

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
  notificationPreferences: many(notificationPreferences),
  sentNotifications: many(sentNotifications),
  pushSubscriptions: many(pushSubscriptions),
  userNotifications: many(userNotifications),
  sellerCodes: many(codes, { relationName: "seller" }),
  redeemedCodes: many(codes, { relationName: "redeemedBy" }),
  sellerBalanceHistory: many(balanceHistory, { relationName: "sellerBalanceHistory" }),
  adminBalanceHistory: many(balanceHistory, { relationName: "adminBalanceHistory" }),
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
  notificationPreferences: many(notificationPreferences),
  sentNotifications: many(sentNotifications),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  class: one(schoolclass, {
    fields: [assignments.className],
    references: [schoolclass.name],
  }),
  notificationPreferences: many(notificationPreferences),
  sentNotifications: many(sentNotifications),
}));

export const notificationPresets = pgTable(
  "notification_presets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    isActiveForExams: boolean("is_active_for_exams").default(false).notNull(),
    isActiveForAssignments: boolean("is_active_for_assignments").default(false).notNull(),
    activatedForExamsAt: timestamp("activated_for_exams_at"),
    activatedForAssignmentsAt: timestamp("activated_for_assignments_at"),
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
    id: text("id").primaryKey(),
    presetId: text("preset_id")
      .notNull()
      .references(() => notificationPresets.id, { onDelete: "cascade" }),
    daysBefore: integer("days_before").notNull(),
    time: varchar("time", { length: 5 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("notification_times_presetId_idx").on(table.presetId)],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    examId: integer("exam_id").references(() => exams.id, { onDelete: "cascade" }),
    assignmentId: integer("assignment_id").references(() => assignments.id, { onDelete: "cascade" }),
    presetId: text("preset_id")
      .references(() => notificationPresets.id, { onDelete: "cascade" }),
    disabled: boolean("disabled").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_preferences_userId_idx").on(table.userId),
    index("notification_preferences_examId_idx").on(table.examId),
    index("notification_preferences_assignmentId_idx").on(table.assignmentId),
  ],
);

export const sentNotifications = pgTable(
  "sent_notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    examId: integer("exam_id").references(() => exams.id, { onDelete: "cascade" }),
    assignmentId: integer("assignment_id").references(() => assignments.id, { onDelete: "cascade" }),
    daysBefore: integer("days_before").notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (table) => [
    index("sent_notifications_userId_idx").on(table.userId),
    index("sent_notifications_examId_idx").on(table.examId),
    index("sent_notifications_assignmentId_idx").on(table.assignmentId),
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
    notificationPreferences: many(notificationPreferences),
  }),
);

export const notificationTimesRelations = relations(
  notificationTimes,
  ({ one }) => ({
    preset: one(notificationPresets, {
      fields: [notificationTimes.presetId],
      references: [notificationPresets.id],
    }),
  }),
);

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(user, {
      fields: [notificationPreferences.userId],
      references: [user.id],
    }),
    exam: one(exams, {
      fields: [notificationPreferences.examId],
      references: [exams.id],
    }),
    assignment: one(assignments, {
      fields: [notificationPreferences.assignmentId],
      references: [assignments.id],
    }),
    preset: one(notificationPresets, {
      fields: [notificationPreferences.presetId],
      references: [notificationPresets.id],
    }),
  }),
);

export const sentNotificationsRelations = relations(
  sentNotifications,
  ({ one }) => ({
    user: one(user, {
      fields: [sentNotifications.userId],
      references: [user.id],
    }),
    exam: one(exams, {
      fields: [sentNotifications.examId],
      references: [exams.id],
    }),
    assignment: one(assignments, {
      fields: [sentNotifications.assignmentId],
      references: [assignments.id],
    }),
  }),
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
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

export const userNotifications = pgTable(
  "user_notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_notifications_userId_idx").on(table.userId),
    index("user_notifications_read_idx").on(table.read),
  ],
);

export const userNotificationsRelations = relations(
  userNotifications,
  ({ one }) => ({
    user: one(user, {
      fields: [userNotifications.userId],
      references: [user.id],
    }),
  }),
);

export const codes = pgTable(
  "codes",
  {
    id: text("id").primaryKey(),
    code: varchar("code", { length: 11 }).notNull().unique(),
    type: varchar("type", { length: 20 }).notNull(),
    duration: varchar("duration", { length: 20 }).notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    sellerCost: numeric("seller_cost", { precision: 10, scale: 2 }).default("0").notNull(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    className: varchar("class_name", { length: 50 }).references(() => schoolclass.name),
    redeemedBy: text("redeemed_by").references(() => user.id, { onDelete: "set null" }),
    redeemedAt: timestamp("redeemed_at"),
    wasRedeemedAt: timestamp("was_redeemed_at"),
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

export const balanceHistory = pgTable(
  "balance_history",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    adminId: text("admin_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 10 }).notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    previousBalance: numeric("previous_balance", { precision: 10, scale: 2 }).notNull(),
    newBalance: numeric("new_balance", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("balance_history_sellerId_idx").on(table.sellerId),
    index("balance_history_adminId_idx").on(table.adminId),
    index("balance_history_createdAt_idx").on(table.createdAt),
  ],
);

export const balanceHistoryRelations = relations(balanceHistory, ({ one }) => ({
  seller: one(user, {
    fields: [balanceHistory.sellerId],
    references: [user.id],
    relationName: "sellerBalanceHistory",
  }),
  admin: one(user, {
    fields: [balanceHistory.adminId],
    references: [user.id],
    relationName: "adminBalanceHistory",
  }),
}));

// Each device is retried independently. Removing a subscription cancels its queue.
export const pushDeliveries = pgTable("push_deliveries", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull().references(() => pushSubscriptions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [index("push_deliveries_due_idx").on(table.nextAttemptAt)]);

export const proPlans = pgTable("pro_plans", {
  id: varchar("id", { length: 20 }).primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(),
  unit: varchar("unit", { length: 10 }).notNull(),
}, table => [
  check("pro_price_positive", sql`${table.price} > 0`),
  check("pro_duration_valid", sql`${table.duration} BETWEEN 1 AND 3650`),
  check("pro_unit_valid", sql`${table.unit} IN ('days', 'months')`),
]);

export const giftCardOptions = pgTable("gift_card_options", {
  id: serial("id").primaryKey(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  sellerCost: numeric("seller_cost", { precision: 10, scale: 2 }).notNull(),
}, table => [
  check("gift_value_positive", sql`${table.value} > 0`),
  check("gift_cost_nonnegative", sql`${table.sellerCost} >= 0`),
]);
