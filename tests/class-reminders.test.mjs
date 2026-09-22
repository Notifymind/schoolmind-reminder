import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as orm from 'drizzle-orm';
import * as core from 'drizzle-orm/pg-core';
import * as cuid2 from '@paralleldrive/cuid2';

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, Date, process: { env: {} }, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(source, context);
  return context.exports;
}

test('class changes stop old exam and assignment reminders', async t => {
  const pg = new PGlite();
  t.after(() => pg.close());
  const schema = load('db/schema.ts', { 'drizzle-orm/pg-core': core, 'drizzle-orm': orm, '@paralleldrive/cuid2': cuid2 });
  const db = drizzle(pg);
  const actions = load('db/index.ts', {
    'dotenv/config': {}, 'drizzle-orm': orm, './schema': schema,
    'drizzle-orm/node-postgres': { drizzle: () => db },
    '@/lib/utils': { generateId: randomUUID },
    '@/lib/notification-schedule': { isNotificationDue: () => true },
  });
  await pg.exec(`
    CREATE TABLE schoolclass (name varchar(50) PRIMARY KEY);
    INSERT INTO schoolclass VALUES ('1A'), ('2B'), ('empty');
    CREATE TABLE "user" (id text PRIMARY KEY, class varchar(50) REFERENCES schoolclass(name), updated_at timestamp DEFAULT now());
    INSERT INTO "user" (id, class) VALUES ('student', '1A'), ('other', '1A');
    CREATE TABLE exams (id serial PRIMARY KEY, class_name varchar(50) NOT NULL,
      subject varchar, title varchar, date varchar, time varchar, type varchar, description text,
      due_date timestamp DEFAULT now(), created_at timestamp DEFAULT now());
    CREATE TABLE assignments (LIKE exams INCLUDING ALL);
    INSERT INTO exams (id, class_name) VALUES (1, '1A'), (2, '2B');
    INSERT INTO assignments (id, class_name) VALUES (1, '1A'), (2, '2B');
    CREATE TABLE notification_presets (id text PRIMARY KEY, user_id text, name varchar(100),
      is_active_for_exams boolean DEFAULT false, is_active_for_assignments boolean DEFAULT false,
      activated_for_exams_at timestamp, activated_for_assignments_at timestamp,
      created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now());
    INSERT INTO notification_presets (id, user_id, name) VALUES ('preset', 'student', 'Saved'), ('other-preset', 'other', 'Other');
    CREATE TABLE notification_times (id text PRIMARY KEY, preset_id text, days_before integer, time varchar(5), created_at timestamp DEFAULT now());
    INSERT INTO notification_times (id, preset_id, days_before, time) VALUES ('time', 'preset', 0, '09:00'), ('other-time', 'other-preset', 0, '09:00');
    CREATE TABLE notification_preferences (id text PRIMARY KEY, user_id text, exam_id integer, assignment_id integer,
      preset_id text, disabled boolean DEFAULT false, created_at timestamp DEFAULT now());
    INSERT INTO notification_preferences (id, user_id, exam_id, assignment_id, preset_id) VALUES
      ('old-exam', 'student', 1, NULL, 'preset'), ('old-assignment', 'student', NULL, 1, 'preset'),
      ('new-exam', 'student', 2, NULL, 'preset'), ('other-exam', 'other', 1, NULL, 'other-preset');
    CREATE TABLE push_subscriptions (id text PRIMARY KEY, user_id text, endpoint text, p256dh text, auth text, created_at timestamp DEFAULT now());
    INSERT INTO push_subscriptions (id, user_id) VALUES ('device', 'student');
    CREATE TABLE push_deliveries (id text PRIMARY KEY, user_id text, subscription_id text, payload text, attempts integer DEFAULT 0, next_attempt_at timestamp DEFAULT now(), created_at timestamp DEFAULT now());
    INSERT INTO push_deliveries (id, user_id) VALUES ('queued', 'student'), ('other-queued', 'other');
    CREATE TABLE user_notifications (id text PRIMARY KEY, user_id text, title varchar(255), message text, type varchar(50), read boolean DEFAULT false, created_at timestamp DEFAULT now());
    CREATE TABLE sent_notifications (id text PRIMARY KEY, user_id text, exam_id integer, assignment_id integer,
      days_before integer, time varchar(5), sent_at timestamp DEFAULT now());
  `);
  const ids = async table => (await pg.query(`SELECT id FROM ${table} ORDER BY id`)).rows.map(row => row.id);

  await t.test('saving the same class preserves subscriptions and pending deliveries', async () => {
    await actions.setUserClass('student', '1A');
    assert.equal((await ids('notification_preferences')).length, 4);
    assert.equal((await ids('push_deliveries')).length, 2);
  });
  await t.test('changing class removes old preferences and pending deliveries, preserving presets and devices', async () => {
    await actions.setUserClass('student', '2B');
    assert.equal(await actions.getUserClass('student'), '2B');
    assert.deepEqual(await ids('notification_preferences'), ['new-exam', 'other-exam']);
    assert.deepEqual(await ids('push_deliveries'), ['other-queued']);
    assert.deepEqual(await ids('notification_presets'), ['other-preset', 'preset']);
    assert.deepEqual(await ids('push_subscriptions'), ['device']);
  });
  await t.test('cron ignores stale old-class preferences left by earlier class changes', async () => {
    await pg.exec(`INSERT INTO notification_preferences (id, user_id, exam_id, assignment_id, preset_id) VALUES
      ('stale-exam', 'student', 1, NULL, 'preset'), ('stale-assignment', 'student', NULL, 1, 'preset');`);
    const pending = await actions.getPendingNotificationsForCron();
    assert.deepEqual(Array.from(pending.filter(item => item.userId === 'student'), item => item.item.className), ['2B']);
    assert.equal(pending.filter(item => item.userId === 'other').length, 1);
  });
  await t.test('a reminder collected before the class change cannot be queued afterward', async () => {
    for (const [examId, assignmentId] of [[1, null], [null, 1]]) {
      assert.equal(await actions.queueReminder('student', examId, assignmentId, 0, '09:00', 'Old', 'Old', 'exam_reminder'), false);
    }
  });
  await t.test('new-class exam and assignment reminders still queue exactly once', async () => {
    for (const [examId, assignmentId] of [[2, null], [null, 2]]) {
      const args = ['student', examId, assignmentId, 0, '09:00', 'New', 'New', 'exam_reminder'];
      assert.equal(await actions.queueReminder(...args), true);
      assert.equal(await actions.queueReminder(...args), false);
    }
    assert.equal((await ids('user_notifications')).length, 2);
    assert.equal((await ids('sent_notifications')).length, 2);
    assert.equal((await pg.query("SELECT id FROM push_deliveries WHERE user_id = 'student'")).rows.length, 2);
  });
  await t.test('cleanup failure rolls back the class and preference changes', async () => {
    await pg.exec(`CREATE FUNCTION reject_delivery_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'test cleanup failure'; END $$;
      CREATE TRIGGER reject_delivery_delete BEFORE DELETE ON push_deliveries
      FOR EACH ROW EXECUTE FUNCTION reject_delivery_delete();`);
    const before = await ids('notification_preferences');
    try {
      await assert.rejects(actions.setUserClass('student', '1A'));
      assert.equal(await actions.getUserClass('student'), '2B');
      assert.deepEqual(await ids('notification_preferences'), before);
    } finally {
      await pg.exec('DROP TRIGGER reject_delivery_delete ON push_deliveries');
    }
  });
  await t.test('failed class updates leave preferences intact', async () => {
    const before = await ids('notification_preferences');
    await assert.rejects(actions.setUserClass('student', 'missing'));
    assert.equal(await actions.getUserClass('student'), '2B');
    assert.deepEqual(await ids('notification_preferences'), before);
  });
  await t.test('moving to a class without items removes all previous item preferences', async () => {
    await actions.setUserClass('student', 'empty');
    assert.deepEqual(await ids('notification_preferences'), ['other-exam']);
  });
});
