# Notification architecture research

Checked against official documentation on 2026-09-19. These are platform facts and design recommendations, not a production delivery test.

## What the platform supports

Web Push with VAPID is an appropriate transport for a web reminder app. The browser receives messages through its push service and wakes a service worker; the app page need not remain open. On iOS and iPadOS, Web Push requires a Home Screen web app and notification permission requested in response to user interaction. This is a product onboarding requirement, not something a different backend provider removes. [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

A push service accepting a request does not establish that a person received or read the reminder. The protocol uses TTL to expire queued messages; a zero TTL discards a message if the device is unreachable. Expired subscriptions return 404 or 410 and should be removed. A 429 response should respect Retry-After. [Google Web Push documentation](https://web.dev/articles/push-notifications-web-push-protocol)

Netlify scheduled functions use UTC cron expressions and have a 30-second execution limit. They run automatically only for published deploys. Deploy previews and branch deploys need manual invocation. A design that scans all reminders and sends sequentially inside one invocation therefore has a fixed runtime budget. The scheduling timezone does not automatically convert a student's chosen wall-clock time into UTC. [Netlify scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/)

Exported Server Actions must be treated as public HTTP endpoints and authenticate and authorize each privileged mutation. Secure action identifiers and dead-code elimination do not substitute for authorization. Internal scheduling code should live in a server-only module, with a separately authorized admin action where needed. [Next.js data security](https://nextjs.org/docs/app/guides/data-security)

## Implementation choices

- Keep cron and direct Web Push for a small app. Persist due work, claim a bounded batch, track attempts, and retry transient failures on a later run. This minimizes infrastructure. A database job table can be enough; a separate queue vendor is optional. This is a recommendation based on the runtime and delivery constraints above.
- Add a transactional outbox when database changes must reliably create delivery work. Write the notification and its delivery job in the same transaction, then send outside that transaction. Consumers still need idempotency because deliveries can repeat. An outbox closes the database-to-job gap; it does not prove end-device delivery or make network sends exactly once. [AWS transactional outbox](https://docs.aws.amazon.com/en_en/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- Use a managed HTTP job queue when retries, backoff, rate control, failure inspection, and more concurrent work justify another dependency. QStash provides scheduling, flow control, dead-letter handling, and automatic retries. A non-2xx response triggers retries; swallowing a push failure and returning success defeats that mechanism. Queue delivery to your endpoint remains separate from notification delivery to the browser. [QStash overview](https://upstash.com/docs/qstash/overall/getstarted), [retry behavior](https://upstash.com/docs/qstash/features/retry)
- Use a managed notification service when subscription management, dashboards, campaigns, and reporting are worth outsourcing. OneSignal supports permission prompts, browser/device subscriptions, throttling, TTL, click behavior, and reporting. It still requires HTTPS, user permission, a service worker, and Home Screen installation on iOS. It cannot repair the app's incorrect reminder timestamps or missing authorization. [OneSignal web push setup](https://documentation.onesignal.com/docs/en/web-push-setup)

## Suggested direction for this app

Keep Web Push and the in-app inbox. First fix authorization, reminder identity, timezone handling, durable delivery state, and subscription cleanup. Split inbox creation from per-device push status so failed push can retry without duplicating the inbox entry. Record push acceptance separately from user read state. Select only subscriptions for the intended user and process a bounded amount of work per run. Add a managed queue if measured runtime or operational needs warrant it; switching push providers alone does not address those correctness problems.

Treat the service worker as the delivery/display component. Browser-side timers or an open-page connection are a poor substitute for reminders that must arrive while the app is closed. Provide installation and permission guidance for iOS, and consider an optional second channel for students who cannot enable push. That is a product choice rather than a prerequisite for fixing the existing system.
