import webpush from "web-push";
import { claimPushDelivery, finishPushDelivery, deletePushSubscription } from "@/db";

export async function deliverPushQueue() {
  let sent = 0;
  let errors = 0;
  const deadline = Date.now() + 15_000;
  // Bound work per invocation; unclaimed rows remain durable for the next cron.
  for (let i = 0; i < 100 && Date.now() < deadline; i++) {
    const delivery = await claimPushDelivery();
    if (!delivery) break;
    const { subscription: sub } = delivery;
    if (!sub || Date.now() - delivery.createdAt.getTime() > 24 * 60 * 60_000) {
      await finishPushDelivery(delivery.id);
      continue;
    }
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, delivery.payload, { timeout: 10_000, TTL: 3600 });
      await finishPushDelivery(delivery.id);
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await deletePushSubscription(delivery.userId, sub.endpoint);
        await finishPushDelivery(delivery.id);
      } else {
        const retryable = !status || status === 408 || status === 429 || status >= 500;
        await finishPushDelivery(delivery.id, retryable && delivery.attempts < 6
          ? new Date(Date.now() + Math.min(240, 15 * 2 ** (delivery.attempts - 1)) * 60_000)
          : undefined);
      }
      // Do not log endpoints, encryption keys, or push provider response bodies.
      console.error("[Push] Delivery failed", { status, attempt: delivery.attempts });
      errors++;
    }
  }
  return { sent, errors };
}
