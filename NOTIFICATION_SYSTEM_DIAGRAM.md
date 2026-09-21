# Per-Minute Notification System - Visual Overview

## Before vs After

### BEFORE (Limited to one notification per day)
```
User sets notification times:
├─ 1 day before at 09:00
└─ 1 day before at 14:30

Database tracks: (userId, examId, daysBefore)
                 (user123, exam456, 1)

Result: Only ONE notification sent per day ❌
```

### AFTER (Multiple notifications per day)
```
User sets notification times:
├─ 1 day before at 09:00
└─ 1 day before at 14:30

Database tracks: (userId, examId, daysBefore, time)
                 (user123, exam456, 1, "09:00")
                 (user123, exam456, 1, "14:30")

Result: BOTH notifications sent at their respective times ✅
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CONFIGURES NOTIFICATION                              │
│    Time Picker → "09:15"                                     │
│    Days Before → 1                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. STORED IN DATABASE                                        │
│    notification_times table:                                 │
│    - preset_id: "preset123"                                  │
│    - days_before: 1                                          │
│    - time: "09:15"                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CRON JOB CHECKS (every 5 minutes)                        │
│    getPendingNotificationsForCron():                         │
│    - Is it >= 1 day before at 09:15?                        │
│    - Check: Already sent (userId, examId, 1, "09:15")?      │
│    - If not sent → Add to pending list                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. PROCESS NOTIFICATION                                      │
│    queueReminder(userId, examId, 1, "09:15", title, body):  │
│    - Lock: [userId, examId, 1, "09:15"]                     │
│    - Create user_notifications record                        │
│    - Queue push_deliveries                                   │
│    - Mark sent: (userId, examId, 1, "09:15", sentAt)        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SEND TO USER                                              │
│    deliverPushQueue():                                       │
│    - Send via web push API                                   │
│    - User receives notification at 09:15 ✅                  │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Change

### sent_notifications table

**BEFORE:**
```
┌────────┬─────────┬─────────────┬────────────┐
│ userId │ examId  │ daysBefore  │ sentAt     │
├────────┼─────────┼─────────────┼────────────┤
│ user1  │ exam1   │ 1           │ 2026-09-20 │
└────────┴─────────┴─────────────┴────────────┘
          ↑ Only one record per day per exam
```

**AFTER:**
```
┌────────┬─────────┬────────────┬────────┬─────────────┐
│ userId │ examId  │ daysBefore │ time   │ sentAt      │
├────────┼─────────┼────────────┼────────┼─────────────┤
│ user1  │ exam1   │ 1          │ 09:00  │ 2026-09-20  │
│ user1  │ exam1   │ 1          │ 14:30  │ 2026-09-20  │
└────────┴─────────┴────────────┴────────┴─────────────┘
          ↑ Multiple records per day at different times
```

## Key Technical Points

### Deduplication Strategy
```
OLD: Check if sent today
└─ SELECT * FROM sent_notifications 
   WHERE userId = ? AND examId = ? AND daysBefore = ?

NEW: Check if sent today at this specific time
└─ SELECT * FROM sent_notifications 
   WHERE userId = ? AND examId = ? AND daysBefore = ? AND time = ?
```

### Concurrency Safety
```
Advisory Lock Key: [userId, examId, daysBefore, time]
                    └─ Prevents duplicate sends during concurrent cron runs
```

### Performance Optimization
```
INDEX: sent_notifications_time_idx ON (time)
       └─ Fast lookups for duplicate checks
```

## Example Scenario

### User Configuration
```
Preset: "Important Exams"
├─ 3 days before at 18:00  (Evening reminder)
├─ 1 day before at 08:30   (Morning reminder)
└─ 1 day before at 20:00   (Evening reminder)
```

### Timeline for Exam on Friday
```
Tuesday 18:00  → "Exam in 3 days!" ✅
Thursday 08:30 → "Exam tomorrow!" ✅
Thursday 20:00 → "Exam tomorrow!" ✅ (Second notification same day)
Friday         → Exam day
```

### Verification Query
```sql
-- See all sent notifications for an exam
SELECT 
  days_before,
  time,
  sent_at
FROM sent_notifications
WHERE user_id = 'user123' AND exam_id = 456
ORDER BY sent_at;

-- Expected result:
-- days_before | time  | sent_at
-- 3           | 18:00 | 2026-09-17 18:00
-- 1           | 08:30 | 2026-09-19 08:30
-- 1           | 20:00 | 2026-09-19 20:00
```

## Summary

✅ Users can now set notifications at **any minute** (0-59)  
✅ Multiple notifications can be sent on **the same day**  
✅ System tracks **exact time** each notification was sent  
✅ No duplicate notifications due to **proper deduplication**  
✅ Migration applied **safely** with existing data preserved  
✅ Build passes with **no TypeScript errors**

The notification system is now fully compatible with the new time picker! 🎉
