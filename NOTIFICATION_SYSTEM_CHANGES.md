# Per-Minute Notification Scheduling - Implementation Summary

## Overview
Successfully enabled per-minute notification scheduling to work with the new clock-style time picker. Users can now set notifications at any minute of the hour (e.g., 09:15, 14:47, 22:03), and the system will send multiple notifications on the same day at different times.

## Problem Statement
The previous system tracked sent notifications using only `(userId, examId/assignmentId, daysBefore)`, which meant:
- Only one notification could be sent per day per exam/assignment
- The exact time wasn't tracked, preventing multiple notifications at different times on the same day
- The new time picker allowed minute selection, but the backend couldn't support it

## Changes Made

### 1. Database Schema (`db/schema.ts`)
**Added `time` field to `sentNotifications` table:**
```typescript
time: varchar("time", { length: 5 }).notNull(),
```

**Added index for performance:**
```typescript
index("sent_notifications_time_idx").on(table.time),
```

This allows the system to track the exact time each notification was sent, enabling multiple notifications per day.

### 2. Database Migration (`drizzle/0015_striped_post.sql`)
Applied a safe migration that:
1. Added the `time` column as nullable
2. Backfilled existing records with '09:00' (doesn't affect future notifications)
3. Made the column NOT NULL
4. Created an index for efficient querying

### 3. Database Queries (`db/index.ts`)

**Updated `markNotificationSent` function:**
- Added `time: string` parameter
- Now stores the exact time when marking a notification as sent

**Updated `getPendingNotificationsForCron` function:**
- Modified all 4 duplicate-check queries to include the `time` field
- Now checks: `(userId, examId/assignmentId, daysBefore, time)` instead of just `(userId, examId/assignmentId, daysBefore)`
- This enables multiple notifications per day at different times

**Updated `queueReminder` function:**
- Added `time: string` parameter
- Updated the deduplication key to include time: `[userId, examId, assignmentId, daysBefore, time]`
- Updated the transaction's duplicate check to include `eq(sentNotifications.time, time)`
- Stores the time when inserting the sent notification record

### 4. Cron Job Processing (`lib/actions/cron.ts`)

**Updated `processNotificationsAction` function:**
- Now extracts `time` from pending notifications: `const { userId, examId, assignmentId, daysBefore, time, item: examOrAssignment } = item;`
- Passes `time.time` to `queueReminder` function
- The notification system now respects the exact minute specified in the user's preset

## How It Works Now

### User Experience
1. User opens notification settings
2. Creates/edits a preset and adds notification times
3. Uses the time picker to select any minute (e.g., "1 day before at 08:47")
4. Can add multiple times for the same day (e.g., "1 day before at 09:00" AND "1 day before at 14:30")
5. Both notifications will be sent at their respective times

### System Flow
1. **Cron job runs** (typically every 5 minutes via scheduled task)
2. **`getPendingNotificationsForCron`** checks which notifications are due:
   - For each preset with notification times
   - Checks if current time >= scheduled time using `isNotificationDue()`
   - Verifies no duplicate exists for `(userId, examId, daysBefore, time)` combination
3. **`processNotificationsAction`** processes each pending notification:
   - Creates the notification message
   - Calls `queueReminder` with the exact time
4. **`queueReminder`** enqueues the notification:
   - Uses advisory lock with key including time to prevent duplicates
   - Creates user notification record
   - Queues push deliveries
   - Marks as sent in `sentNotifications` with the exact time
5. **`deliverPushQueue`** sends the actual push notifications

### Deduplication
The system now prevents duplicate notifications using:
- **Advisory lock during queueing:** Prevents race conditions from concurrent cron runs
- **Sent notification tracking:** Records `(userId, examId, assignmentId, daysBefore, time)` for each sent notification
- **Duplicate checks:** All queries now include the `time` field, allowing multiple notifications per day

## Files Modified

1. ✅ `db/schema.ts` - Added `time` field and index to `sentNotifications` table
2. ✅ `drizzle/0015_striped_post.sql` - Database migration with safe backfill
3. ✅ `db/index.ts` - Updated all notification query and insert functions
4. ✅ `lib/actions/cron.ts` - Updated cron processing to pass time parameter

## Files That Didn't Need Changes

- ✅ `components/ui/time-picker.tsx` - Already supports any minute selection
- ✅ `app/app/notifications/page.tsx` - Already captures time from picker in "HH:MM" format
- ✅ `lib/notification-schedule.ts` - Already compares exact hours and minutes
- ✅ `lib/actions/notifications.ts` - Already stores time as varchar(5) in "HH:MM" format

## Testing Checklist

To verify the implementation works:

1. **Create a test preset:**
   - Add two notification times for the same day (e.g., "1 day before at 09:15" and "1 day before at 14:30")

2. **Create a test exam/assignment:**
   - Set due date to tomorrow
   - Apply the test preset

3. **Wait for notifications:**
   - First notification should arrive at 09:15
   - Second notification should arrive at 14:30
   - Check that both were sent (not just one)

4. **Verify in database:**
   ```sql
   SELECT * FROM sent_notifications ORDER BY sent_at DESC LIMIT 10;
   ```
   Should show separate records with different `time` values

## Performance Considerations

- **Index added:** `sent_notifications_time_idx` ensures fast duplicate lookups
- **No N+1 queries:** All duplicate checks are done with indexed lookups
- **Advisory locks:** Prevent duplicate processing during concurrent cron runs
- **5-minute buffer:** `nowWithBuffer` in `getPendingNotificationsForCron` ensures notifications aren't missed between cron runs

## Backward Compatibility

- ✅ Existing sent notifications backfilled with '09:00' (harmless default)
- ✅ No impact on existing presets or user data
- ✅ System gracefully handles the transition

## Migration Status

✅ **Migration applied successfully!**

The database now has the `time` column in `sent_notifications` table and the system is ready to support per-minute notification scheduling.
