import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const roleNames = ["free", "basic", "pro", "seller", "admin"] as const;
export type Role = (typeof roleNames)[number];

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  plugins: [
    passkey(),
    admin({
      defaultRole: "free",
      adminRoles: ["admin"],
    }),
  ],
  user: {
    additionalFields: {
      lastTrial: {
        type: "date",
        required: false,
      },
    },
  },
});
