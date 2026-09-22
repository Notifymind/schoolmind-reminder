import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies, DateClass = Date) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { exports: {}, Date: DateClass, process: { env: {} }, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(source, context);
  return context.exports;
}

async function pending(path, now, dueDate, time = '18:00', daysBefore = 1) {
  const item = { id: 1, className: '1A', dueDate: new Date(dueDate) };
  const preset = { id: 'preset', userId: 'student' };
  const explicit = path.startsWith('explicit');
  const exam = path.endsWith('exam');
  const pref = { userId: 'student', presetId: 'preset', examId: exam ? 1 : null, assignmentId: exam ? null : 1 };
  const times = [{ daysBefore, time }];
  const activeRows = [[preset], [{ class: '1A' }], times, [item], []];
  const rows = explicit
    ? [[pref], [], [], [{ class: '1A' }], [preset], times, [item], []]
    : exam ? [[], ...activeRows, []] : [[], [], ...activeRows];
  const db = { select: () => ({ from: () => {
    const result = rows.shift();
    assert.ok(result, 'Unexpected query');
    return { then: resolve => resolve(result), where: async () => result };
  } }) };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
  }
  const helperPath = 'lib/notification-schedule.ts';
  const dependencies = {
    'dotenv/config': {},
    'drizzle-orm/node-postgres': { drizzle: () => db },
    'drizzle-orm': Object.fromEntries(['eq', 'and', 'gt', 'isNotNull'].map(key => [key, () => {}])),
    './schema': Object.fromEntries(['user', 'exams', 'assignments', 'notificationPresets', 'notificationTimes', 'notificationPreferences', 'sentNotifications'].map(key => [key, {}])),
    '@/lib/utils': {},
    '@/lib/notification-schedule': load(helperPath, {}),
  };
  return (await load('db/index.ts', dependencies, Clock).getPendingNotificationsForCron()).length;
}

for (const path of ['active-exam', 'active-assignment', 'explicit-exam', 'explicit-assignment']) {
  test(`${path}: 18:00 Sarajevo reminder is due at 16:00 UTC in summer`, async () => {
    assert.equal(await pending(path, '2026-09-19T16:00:00Z', '2026-09-20T08:00:00Z'), 1);
  });
  test(`${path}: arbitrary-minute reminders wait until their scheduled time and catch up after it`, async () => {
    const dueDate = '2026-09-20T08:00:00Z';
    for (const now of ['2026-09-19T16:32:00Z', '2026-09-19T16:36:59Z']) {
      assert.equal(await pending(path, now, dueDate, '18:37'), 0);
    }
    for (const now of ['2026-09-19T16:37:00Z', '2026-09-19T16:39:00Z']) {
      assert.equal(await pending(path, now, dueDate, '18:37'), 1);
    }
  });
  test(`${path}: winter and daylight-saving calendar boundaries`, async () => {
    assert.equal(await pending(path, '2026-01-19T17:00:00Z', '2026-01-20T08:00:00Z'), 1);
    assert.equal(await pending(path, '2026-03-28T17:00:00Z', '2026-03-29T08:00:00Z'), 1);
    assert.equal(await pending(path, '2026-10-24T16:00:00Z', '2026-10-25T08:00:00Z'), 1);
    assert.equal(await pending(path, '2026-03-29T01:00:00Z', '2026-03-29T08:00:00Z', '02:30', 0), 1);
    assert.equal(await pending(path, '2026-10-25T00:30:00Z', '2026-10-25T08:00:00Z', '02:30', 0), 1);
    assert.equal(await pending(path, '2026-09-19T15:45:00Z', '2026-09-20T08:00:00Z'), 0);
    assert.equal(await pending(path, '2026-09-19T22:15:00Z', '2026-09-20T08:00:00Z', '00:15', 0), 1);
  });
}
