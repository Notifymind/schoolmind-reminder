"use server";

import webpush from "web-push";
import {
  getPendingNotificationsForCron,
  markNotificationSent,
  getUsersByRole,
  getAllPushSubscriptions,
  getExpiredSubscriptions,
  downgradeExpiredUser,
  createUserNotification,
} from "@/db";
import { exams, assignments } from "@/db/schema";

type Exam = typeof exams.$inferSelect;
type Assignment = typeof assignments.$inferSelect;

type PendingNotificationItem = {
  userId: string;
  examId: number | null;
  assignmentId: number | null;
  daysBefore: number;
  item: Exam | Assignment;
  preset: { id: number; name: string };
  time: { id: number; daysBefore: number; time: string };
};

webpush.setVapidDetails(
  "mailto:schoolmind@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function processNotificationsAction() {
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
      const typeLabel = assignment ? "Assignment" : "Exam";
      const dueDate = assignment?.date || exam?.date || "TBD";
      const dueTime = assignment?.time || exam?.time;
      const dueDateDisplay = dueTime ? `${dueDate} at ${dueTime}` : dueDate;

      const daysText = daysBefore === 1 ? "tomorrow" : `in ${daysBefore} days`;

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
      await createUserNotification(userId, title, body, notificationType);
      await markNotificationSent(userId, examId, assignmentId, daysBefore);

      const subscriptions = await getAllPushSubscriptions();
      const userSubs = subscriptions.filter((s) => s.userId === userId);

      let pushSent = false;
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
          pushSent = true;
        } catch (error) {
          console.error("[Push] Error sending to subscription:", error);
        }
      }

      if (pushSent) {
        results.sent++;
      } else {
        console.log(`[Notification] No push subscriptions for user ${userId}`);
      }
    } catch (error) {
      console.error(`[Notification] Error processing notification:`, error);
      results.errors++;
    }
  }

  return results;
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
