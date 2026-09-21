This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Email verification

Email/password accounts must verify their email before signing in. Sign-up sends a
one-hour verification link through [Resend](https://resend.com/docs/send-with-nodejs).
The `/verify-email` page handles successful and expired links and lets users request
another email. Verification uses [Better Auth](https://better-auth.com/docs/authentication/email-password).
No database migration is needed.

Set these server-only environment variables locally and in your deployment:

```dotenv
BETTER_AUTH_URL=https://your-app.example.com
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=NotifyMind <noreply@your-verified-domain.com>
```

Use a sender domain verified in Resend. Keep the existing `BETTER_AUTH_SECRET` stable.
For local development, set `BETTER_AUTH_URL=http://localhost:3000`.
Delivery failures return an error; users can retry from the login page's resend link
if their account was created before email delivery failed.

Existing unverified password accounts must request a link before their next login.
Existing sessions and passkey sign-ins remain valid. Verification does not sign users
in automatically. Resend requests are limited to one per minute per IP using Better
Auth's in-memory limiter, which is local to each server instance. For a shared limit
across multiple instances, configure Better Auth with shared rate-limit storage.

## Password reset and Google sign-in

The login page links to `/forgot-password`. Reset emails use the same Resend
configuration as verification emails. Links expire after one hour and work once.
A successful reset revokes existing sessions. Requests are limited to one per
minute per IP, with the same per-instance limit described above.

Google sign-in appears on login and registration when both server variables are set:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

Create a Web application OAuth client in Google Cloud Console and configure the
consent screen. Register these authorized redirect URIs for the environments used:

- `http://localhost:3000/api/auth/callback/google`
- `https://your-app.example.com/api/auth/callback/google`

Set `BETTER_AUTH_URL` to the matching app origin. Restart the app after setting
credentials. Google sign-in creates an account on first use and returns users to
`/app`; cancellations and callback failures return to login with an error message.
Better Auth handles OAuth state and account linking. No database migration is needed.
See the [Better Auth Google setup](https://better-auth.com/docs/authentication/google).

## Required email login codes

Every email/password login now requires a six-digit code after the password is
accepted, using [Better Auth two-factor authentication](https://better-auth.com/docs/plugins/2fa).
Codes use the existing Resend settings above, expire after five minutes, and allow
five incorrect attempts. Resending replaces the previous code and is limited to
once per minute per IP on each server instance. Login challenges expire after ten
minutes. Users cannot disable the requirement or trust a device to skip it.
Google and passkey login continue to use their existing flows.

For the existing test database, which has application tables but no recorded
Drizzle migrations, use `bun x --bun drizzle-kit push --strict --verbose` and review
the SQL before accepting. Do not run `migrate` against that database: it would
replay the initial table creation. `generate` compares local schema snapshots; it
does not inspect or update the database.

For a database with migration history already applied through `0013`, apply
`drizzle/0014_required_login_code.sql` with `bun x --bun drizzle-kit migrate`.
The migration enables the requirement for existing accounts. New accounts get it
automatically. Existing sessions stay valid. Registration email verification is
still required before the first password login.

Run authentication regression tests with `node --test tests/email-verification.test.mjs`.
