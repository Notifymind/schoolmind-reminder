import { settleSubscription } from "@/db/billing";
// Server-only job helpers; these are not client-callable Server Actions.

import webpush from "web-push";
import { deliverPushQueue } from "@/lib/push-delivery";
import {
  getPendingNotificationsForCron,
  queueReminder,
  getUsersByRole,
  getPushSubscriptions,
  deletePushSubscription,
  getExpiredSubscriptions,
} from "@/db";
import { exams, assignments } from "@/db/schema";

type Exam = typeof exams.$inferSelect;
type Assignment = typeof assignments.$inferSelect;

// Configure at runtime so production builds do not need the private key.
function configureWebPush() {
  webpush.setVapidDetails(
    "mailto:notifymind@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export async function processNotificationsAction() {
  configureWebPush();
  const pendingNotifications = await getPendingNotificationsForCron();

  const results = {
    processed: 0,
    sent: 0,
    errors: 0,
  };

  for (const item of pendingNotifications) {
    results.processed++;

    try {
      const { userId, examId, assignmentId, daysBefore, item: examOrAssignment } = item;

      const isAssignment = assignmentId !== null;
      const assignment = isAssignment ? examOrAssignment as Assignment : null;
      const exam = !isAssignment ? examOrAssignment as Exam : null;

      const itemName = assignment?.title || exam?.title || assignment?.subject || exam?.subject || "Untitled";
      const dueDate = assignment?.date || exam?.date || "TBD";
      const dueTime = assignment?.time || exam?.time;
      const dueDateDisplay = dueTime ? `${dueDate} at ${dueTime}` : dueDate;

      const daysText = daysBefore === 0 ? "today" : daysBefore === 1 ? "tomorrow" : `in ${daysBefore} days`;

      let title: string;
      let body: string;

      if (isAssignment) {
        title = `Assignment due ${daysText}!`;
        body = `${itemName} is due ${daysText}! | Date: ${dueDateDisplay}`;
      } else {
        title = `Exam ${daysText}!`;
        body = `${itemName} is ${daysText}! | Date: ${dueDateDisplay}`;
      }

      const notificationType = isAssignment ? "assignment_reminder" : "exam_reminder";
      await queueReminder(userId, examId, assignmentId, daysBefore, title, body, notificationType);
    } catch (error) {
      console.error(`[Notification] Error processing notification:`, error);
      results.errors++;
    }
  }

  const deliveries = await deliverPushQueue();
  results.sent = deliveries.sent;
  results.errors += deliveries.errors;
  return results;
}

export async function processExpiredSubscriptionsAction() {
  const expiredUsers = await getExpiredSubscriptions();

  const results = {
    processed: 0,
    downgraded: 0,
    renewed: 0,
    errors: 0,
  };

  for (const user of expiredUsers) {
    results.processed++;
    try {
      const outcome = await settleSubscription(user.id);
      if (outcome === "renewed") results.renewed++;
      if (outcome === "downgraded") results.downgraded++;
    } catch (error) {
      console.error(`[Subscription] Error downgrading user ${user.id}:`, error);
      results.errors++;
    }
  }

  return results;
}

export async function runCronJobAction() {
  console.log("[Cron] Processing subscription renewals and expirations...");
  const subscriptionResults = await processExpiredSubscriptionsAction();
  console.log("[Cron] Starting notification processing...");
  const notificationResults = await processNotificationsAction();

  console.log("[Cron] Notification processing complete:", notificationResults);

  console.log("[Cron] Subscription expiration check complete:", subscriptionResults);

  return {
    notifications: notificationResults,
    subscriptions: subscriptionResults,
  };
}

export async function testNotificationToAdminsAction() {
  configureWebPush();
  const admins = await getUsersByRole("admin");

  const results = {
    total: admins.length,
    sent: 0,
    errors: 0,
    details: [] as { user: string; success: boolean; message: string }[],
  };

  const title = "🧪 Test Notification";
  const body = "This is a test notification from NotifyMind.\nIf you received this, your notification setup is working!";

  for (const admin of admins) {
    const adminSubs = await getPushSubscriptions(admin.id);

    if (adminSubs.length === 0) {
      results.details.push({
        user: admin.name,
        success: false,
        message: "No push subscription",
      });
      results.errors++;
      continue;
    }

    let sent = false;
    for (const sub of adminSubs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title,
            body,
            icon: "/icon-192x192.png",
          })
        );
        sent = true;
      } catch (error) {
        if ([404, 410].includes((error as { statusCode: number }).statusCode)) await deletePushSubscription(admin.id, sub.endpoint);
        console.error("[Push] Test delivery failed");
      }
    }

    if (sent) {
      results.details.push({
        user: admin.name,
        success: true,
        message: "Sent successfully",
      });
      results.sent++;
    } else {
      results.details.push({
        user: admin.name,
        success: false,
        message: "Failed to send",
      });
      results.errors++;
    }
  }

  console.log("[Test] Notification results:", results);
  return results;
}

export async function sendPushNotificationAction(
  userId: string,
  title: string,
  body: string
) {
  configureWebPush();
  const userSubs = await getPushSubscriptions(userId);

  if (userSubs.length === 0) {
    return { success: false, error: "No push subscriptions found" };
  }

  let sent = false;
  for (const sub of userSubs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify({
          title,
          body,
          icon: "/icon-192x192.png",
        })
      );
      sent = true;
    } catch (error) {
      if ([404, 410].includes((error as { statusCode: number }).statusCode)) await deletePushSubscription(userId, sub.endpoint);
      console.error("[Push] Delivery failed");
    }
  }

  return { success: sent };
}
