# Gift cards and recurring Pro

Admins manage Pro plans at `/app/admin/pricing` and seller gift card options at `/app/admin/gift-cards`. Both pages are linked in the admin sidebar. Gift card options have separate seller cost and gift card value fields. Sellers choose an option and pay its configured cost from their seller balance. The seeded options are 3, 6, 12, and 24 KM, initially priced at face value. Existing seller debt limits still apply. Admins retain free code issuance. Deleting an unused code refunds only its original cost, including zero for admin-issued codes.

Users redeem cards into `wallet_balance`, which is separate from the seller balance and cannot go negative. Redemption never starts a subscription. Users choose a configured Pro plan. The initial plans remain 3 KM per 30 days and 24 KM per 365 days. Admins can add plans such as 12 KM for three calendar months. Month durations preserve UTC time and clamp to the last valid day of the target month. The first payment starts access immediately and enables renewal.

The existing authenticated `/api/cron` job renews due subscriptions before processing reminders. Keep the existing external schedule running. Opening the subscription page also processes that user's due renewal. A successful renewal charges once and starts the next period at processing time. Delayed jobs do not bill for missed periods.

Insufficient funds end Pro and disable renewal. The user must top up and subscribe again. Canceling renewal preserves paid access until expiry. Re-enabling renewal during paid access schedules the chosen plan without charging early or changing the current expiry.

Billing writes use transactions and row locks. Code generation uses cryptographic randomness. Creation stores the seller's actual cost so later role changes cannot change refunds. Redemption remains final even after the redeeming account is deleted.

Edits to Pro prices and durations apply to new subscriptions and future renewals; they do not change already-paid expiry dates. Gift card edits affect future issuance only. Issued cards retain their stored value and seller cost.

## Migration

Apply `drizzle/0010_billing_options.sql` after `0009_gift_card_billing.sql` and before deploying this version. It creates and seeds the configurable options without changing existing cards or subscriptions. This migration has been verified against embedded PostgreSQL; it has not been applied to the configured database.

Apply `drizzle/0009_gift_card_billing.sql` if it has not already been applied, using the project's migration runner. It adds wallet and renewal fields and converts unused monthly/yearly Pro codes into gift cards worth 3/24 KM. Existing Pro expiry dates remain unchanged, and users must explicitly enable renewal. Used codes remain historical records.

For legacy codes, original issuance roles were not recorded. The backfill treats codes currently owned by admins as free and other codes as charged at their old stored value. Review legacy codes owned by accounts whose seller/admin role changed before applying this migration.

The older migration history has pre-existing differences from the current schema, including serial IDs where the app now uses text IDs. The billing migration assumes the current app schema; it does not repair the old migration chain. Do not substitute a schema push for this migration, because a schema push will not convert existing codes or preserve refund costs.

## Verification

Run `node --test tests/*.test.mjs`, `npx tsc --noEmit`, and `npm run build`.

Billing tests use in-memory PostgreSQL through PGlite, with no live database connection. They exercise the migration against the current pre-billing tables, configured seller costs, editable plan terms, month boundaries, admin authorization, input validation, debt limits, duplicate requests, redemption rollback, refunds, recurring charges, cancellation, and account deletion. PGlite serializes transactions, so these tests do not simulate separate PostgreSQL connections contending on row locks.

Pro options support optional marketing text, up to 160 characters, in Admin → Pro pricing. For example, use “1 month free” for 25 KM / 6 months or “4 months free” for 40 KM / 12 months when the monthly price is 5 KM. This text appears on subscription plan cards and the public pricing carousel. It does not change billing terms.

Apply migration `0013_pro_plan_marketing` with `npx drizzle-kit migrate` before deploying this change. Existing plans start with blank marketing text.
