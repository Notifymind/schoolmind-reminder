import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [passkeyClient(), adminClient()],
});

export type Role = "free" | "basic" | "pro" | "seller" | "admin";

export type Session = {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: Role;
    lastTrial: Date | null;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
};
