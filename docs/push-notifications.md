# Push subscriptions

Apply `npx drizzle-kit migrate` before deploying this change. Migration
`0008_push_subscription_lifecycle.sql` keeps the newest existing row per endpoint,
adds endpoint uniqueness, and creates the durable delivery queue. It does not
change existing notification preferences. This migration is hand-written because
the older Drizzle snapshot does not match the current application schema.

The app reconciles an existing browser subscription on sign-in, app startup,
focus, and reconnection. The browser and server determine enabled status; the
old local-storage flag is ignored. A missing subscription requires the user to
press Enable Notifications again. Background subscription renewal is not assumed
because browser support varies.

An endpoint belongs to one account. Registration atomically updates its owner and
keys and removes queued deliveries belonging to the previous owner. Logout removes
server ownership and unsubscribes the browser before ending the session. If that
cleanup fails, logout reports an error and can be retried while online.

Scheduled reminders create their in-app notification, delivery queue entries, and
sent marker in one database transaction. Overlapping cron runs serialize creation
of the same reminder. Each device is delivered independently. The scheduled job
must run every minute and also drains previously queued deliveries. Reminders
become due at their selected time in Europe/Sarajevo, with no early lookahead.
A delayed run picks up overdue reminders.

- Successful deliveries are removed from the queue.
- HTTP 404 and 410 remove the expired subscription and its queued deliveries.
- Network failures, HTTP 408, 429, and 5xx retry with increasing delays, up to six
  attempts and no longer than 24 hours after queue creation.
- Other provider errors stop that delivery. Error logs contain status and attempt
  count, not subscription endpoints or keys.
- A worker leases one delivery for five minutes. Work is limited to 100 deliveries
  and a 15-second start budget per invocation, with a 10-second send timeout.

Delivery is at least once: a worker crash after the provider accepts a push but
before the queue entry is removed can cause a repeat. Notification tags let the
browser replace an existing notification for the same reminder. Pushes already
accepted by a provider cannot be recalled on logout or an account switch.

Validation: `node --test tests/*.test.mjs`, `npx tsc --noEmit`, and `npx next build`.
Tests exercise browser/server disagreement, cleanup failures, account transfer,
and per-device retry outcomes with mocked browser and persistence boundaries.
A real device and push provider are still needed for an end-to-end delivery check.
