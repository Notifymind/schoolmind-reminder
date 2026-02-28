"use server";

import webpush from "web-push";
import {
  getPendingNotifications,
  markNotificationSent,
  applyPresetToNewExams,
  getUserClass,
  getUsersByRole,
  getAllPushSubscriptions,
  getExpiredSubscriptions,
  downgradeExpiredUser,
} from "@/db";
import { exams, assignments } from "@/db/schema";

type Exam = typeof exams.$inferSelect;
type Assignment = typeof assignments.$inferSelect;

type PendingNotificationItem = {
  notification: { id: number };
  notificationTime: { daysBefore: number };
  preset: { id: number; name: string };
  exam: Exam | null;
  assignment: Assignment | null;
  user: { id: string; name: string; email: string };
};

webpush.setVapidDetails(
  "mailto:schoolmind@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function processNotificationsAction() {
  const pendingNotifications = await getPendingNotifications() as PendingNotificationItem[];

  const results = {
    processed: 0,
    sent: 0,
    errors: 0,
  };

  for (const item of pendingNotifications) {
    results.processed++;

    try {
      const { user, exam, assignment, notification, notificationTime } = item;

      let title: string;
      let body: string;

      if (assignment) {
        title = "📝 Assignment Reminder";
        body =
          `${assignment.title || assignment.subject || "Untitled Assignment"}\n` +
          `📅 ${assignment.date || "TBD"} at ${assignment.time || "TBD"}\n` +
          `This assignment is due in ${notificationTime.daysBefore} day(s)!`;
      } else if (exam) {
        title = "📚 Exam Reminder";
        body =
          `${exam.title || exam.subject || "Untitled Exam"}\n` +
          `📅 ${exam.date || "TBD"} at ${exam.time || "TBD"}\n` +
          `This exam is in ${notificationTime.daysBefore} day(s)!`;
      } else {
        console.error("[Notification] No exam or assignment found");
        results.errors++;
        continue;
      }

      const subscriptions = await getAllPushSubscriptions();
      const userSubs = subscriptions.filter((s) => s.userId === user.id);

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
          console.error("[Push] Error sending to subscription:", error);
        }
      }

      if (sent) {
        await markNotificationSent(notification.id);
        results.sent++;
      } else {
        console.log(`[Notification] No push subscriptions for user ${user.id}`);
        results.errors++;
      }
    } catch (error) {
      console.error(`[Notification] Error processing notification:`, error);
      results.errors++;
    }
  }

  return results;
}

export async function syncNewExamsAction(userId: string) {
  const userClass = await getUserClass(userId);
  if (!userClass) {
    return { applied: 0, error: "User has no class" };
  }

  const result = await applyPresetToNewExams(userId);
  return result;
}

export async function processExpiredSubscriptionsAction() {
  const expiredUsers = await getExpiredSubscriptions();

  const results = {
    processed: 0,
    downgraded: 0,
    errors: 0,
  };

  for (const user of expiredUsers) {
    results.processed++;
    try {
      await downgradeExpiredUser(user.id);
      results.downgraded++;
      console.log(`[Subscription] Downgraded user ${user.id} (${user.name}) from ${user.role} to free`);
    } catch (error) {
      console.error(`[Subscription] Error downgrading user ${user.id}:`, error);
      results.errors++;
    }
  }

  return results;
}

export async function runCronJobAction() {
  console.log("[Cron] Starting notification processing...");

  const notificationResults = await processNotificationsAction();

  console.log("[Cron] Notification processing complete:", notificationResults);

  console.log("[Cron] Starting subscription expiration check...");
  const subscriptionResults = await processExpiredSubscriptionsAction();
  console.log("[Cron] Subscription expiration check complete:", subscriptionResults);

  return {
    notifications: notificationResults,
    subscriptions: subscriptionResults,
  };
}

export async function testNotificationToAdminsAction() {
  const admins = await getUsersByRole("admin");

  const results = {
    total: admins.length,
    sent: 0,
    errors: 0,
    details: [] as { user: string; success: boolean; message: string }[],
  };

  const title = "🧪 Test Notification";
  const body = "This is a test notification from SchoolMind Reminder.\nIf you received this, your notification setup is working!";

  for (const admin of admins) {
    const subscriptions = await getAllPushSubscriptions();
    const adminSubs = subscriptions.filter((s) => s.userId === admin.id);

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
        console.error("[Push] Error sending test notification:", error);
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
  const subscriptions = await getAllPushSubscriptions();
  const userSubs = subscriptions.filter((s) => s.userId === userId);

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
      console.error("[Push] Error sending notification:", error);
    }
  }

  return { success: sent };
}
