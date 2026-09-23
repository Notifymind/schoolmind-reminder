import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { admin } from "better-auth/plugins";
import { twoFactor } from "better-auth/plugins/two-factor";
import { db, hasSellerDebt } from "@/db";
import * as schema from "@/db/schema";
import { ac, freeRole, proRole, sellerRole, adminRole } from "./permissions";
import { sendVerificationEmail, sendResetPassword, sendLoginCode } from "./email";

import { linkReferral, referralCookie } from "@/db/referrals";

export const roleNames = ["free", "pro", "seller", "admin"] as const;
export type Role = (typeof roleNames)[number];

// Better Auth 1.4 catches OTP delivery errors; report them after its endpoint finishes.
const failedCodeDeliveries = new WeakSet<object>();
// Set only on preview deployments. Keep persisted 2FA settings intact.
const bypass2FA = process.env.BYPASS_2FA === "true";

export const auth = betterAuth({
  // Email codes are mandatory. Do not expose enrollment, opt-out, or alternate factors.
  disabledPaths: [
    "/two-factor/enable", "/two-factor/disable", "/two-factor/get-totp-uri",
    "/two-factor/verify-totp", "/two-factor/verify-backup-code",
    "/two-factor/generate-backup-codes", "/two-factor/view-backup-codes",
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith("/two-factor/")) return;
      if (ctx.body?.trustDevice) {
        throw new APIError("BAD_REQUEST", { message: "An email code is required for every password login." });
      }
      // Only a pending password login may send or verify a login code.
      const cookie = ctx.context.createAuthCookie("two_factor");
      const key = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
      const challenge = key && await ctx.context.internalAdapter.findVerificationValue(key);
      if (!challenge || challenge.expiresAt <= new Date()) {
        throw new APIError("UNAUTHORIZED", { message: "Please sign in with your password again." });
      }
      if (ctx.path === "/two-factor/send-otp") {
        // This Better Auth version inserts codes on resend. Remove previous codes first.
        await ctx.context.adapter.deleteMany({
          model: "verification", where: [{ field: "identifier", value: `2fa-otp-${key}` }],
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/two-factor/send-otp" && failedCodeDeliveries.delete(ctx.context)) {
        throw new APIError("INTERNAL_SERVER_ERROR", { message: "Unable to send the code. Please try again later." });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: { before: async (user) => ({ data: { ...user, twoFactorEnabled: true } }) },
    },
    session: {
      create: {
        after: async (session, ctx) => {
          // Session creation covers password, passkey, and Google login.
          if (!ctx || (ctx.path === "/sign-in/email" && !bypass2FA) || ctx.path?.includes("impersonate")) return;
          const code = ctx.getCookie(referralCookie);
          if (!code) return;
          await linkReferral(session.userId, code);
          ctx.setCookie(referralCookie, "", { path: "/", maxAge: 0 });
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
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
      "/two-factor/send-otp": { window: 60, max: 1 },
      "/request-password-reset": { window: 60, max: 1 },
      "/send-verification-email": { window: 60, max: 1 },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  plugins: [
    passkey(),
    {
      ...twoFactor({
        otpOptions: {
          sendOTP: async (message, ctx) => {
            try {
              await sendLoginCode(message);
            } catch {
              if (ctx) failedCodeDeliveries.add(ctx.context);
            }
          },
          digits: 6,
          period: 5,
          allowedAttempts: 5,
          storeOTP: "hashed",
        },
      }),
      // Keep the plugin schema and endpoints, but skip its login challenge hooks.
      ...(bypass2FA ? { hooks: {} } : {}),
    },
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
