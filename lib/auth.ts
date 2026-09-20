import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { admin } from "better-auth/plugins";
import { db, hasSellerDebt } from "@/db";
import * as schema from "@/db/schema";
import { ac, freeRole, proRole, sellerRole, adminRole } from "./permissions";
import { sendVerificationEmail } from "./email";

export const roleNames = ["free", "pro", "seller", "admin"] as const;
export type Role = (typeof roleNames)[number];

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail,
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
  },
  rateLimit: {
    enabled: true,
    customRules: {
      "/send-verification-email": { window: 60, max: 1 },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  plugins: [
    passkey(),
    admin({
      defaultRole: "free",
      ac,
      roles: {
        free: freeRole,
        pro: proRole,
        seller: sellerRole,
        admin: adminRole,
      },
    }),
  ],
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        if (await hasSellerDebt(user.id)) {
          throw new APIError("FORBIDDEN", {
            message: "Please settle your seller debt before deleting your account.",
          });
        }
      },
    },
    additionalFields: {
      class: {
        type: "string",
        required: false,
      },
      subscriptionEndsAt: {
        type: "date",
        required: false,
      },
    },
  },
});
