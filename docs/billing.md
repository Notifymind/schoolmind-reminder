# Gift cards and recurring Pro

Sellers issue 3, 6, 12, or 24 KM gift cards and pay the full face value from their seller balance. Existing seller debt limits still apply. Admins retain free code issuance. Deleting an unused code refunds only its original cost, including zero for admin-issued codes.

Users redeem cards into `wallet_balance`, which is separate from the seller balance and cannot go negative. Redemption never starts a subscription. Users choose Pro at 3 KM per 30 days or 24 KM per 365 days. The first payment starts access immediately and enables renewal.

The existing authenticated `/api/cron` job renews due subscriptions before processing reminders. Keep the existing external schedule running. Opening the subscription page also processes that user's due renewal. A successful renewal charges once and starts the next period at processing time. Delayed jobs do not bill for missed periods.

Insufficient funds end Pro and disable renewal. The user must top up and subscribe again. Canceling renewal preserves paid access until expiry. Re-enabling renewal during paid access schedules the chosen plan without charging early or changing the current expiry.

Billing writes use transactions and row locks. Code generation uses cryptographic randomness. Creation stores the seller's actual cost so later role changes cannot change refunds. Redemption remains final even after the redeeming account is deleted.

## Migration

Apply `drizzle/0009_gift_card_billing.sql` before deploying this application version, using the project's migration runner. It adds wallet and renewal fields and converts unused monthly/yearly Pro codes into gift cards worth 3/24 KM. Existing Pro expiry dates remain unchanged, and users must explicitly enable renewal. Used codes remain historical records.

For legacy codes, original issuance roles were not recorded. The backfill treats codes currently owned by admins as free and other codes as charged at their old stored value. Review legacy codes owned by accounts whose seller/admin role changed before applying this migration.

The older migration history has pre-existing differences from the current schema, including serial IDs where the app now uses text IDs. The billing migration assumes the current app schema; it does not repair the old migration chain. Do not substitute a schema push for this migration, because a schema push will not convert existing codes or preserve refund costs.

## Verification

Run `node --test tests/*.test.mjs`, `npx tsc --noEmit`, and `npm run build`.

Billing tests use in-memory PostgreSQL through PGlite, with no live database connection. They exercise the migration against the current pre-billing tables, full-price issuance, debt limits, duplicate requests, redemption rollback, refunds, recurring charges, cancellation, and account deletion. PGlite serializes transactions, so these tests do not simulate separate PostgreSQL connections contending on row locks.
