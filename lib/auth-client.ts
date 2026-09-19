import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { adminClient } from "better-auth/client/plugins";
import { ac, freeRole, proRole, sellerRole, adminRole } from "./permissions";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    passkeyClient(),
    adminClient({
      ac,
      roles: {
        free: freeRole,
        pro: proRole,
        seller: sellerRole,
        admin: adminRole,
      },
    }),
  ],
});

export type Role = "free" | "pro" | "seller" | "admin";

export type Session = {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: Role;
    class?: string | null;
    subscriptionEndsAt: Date | null;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
};
