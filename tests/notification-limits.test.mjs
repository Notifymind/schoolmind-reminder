import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture() {
  const saved = [];
  const dependencies = {
    '@/lib/auth': { auth: { api: { getSession: async () => ({ user: { id: 'user', role: 'free' } }) } } },
    'next/headers': { headers: async () => ({}) },
    '@/db': {
      getNotificationPresetById: async () => ({ id: 'preset' }),
      countPresetNotificationTimes: async () => 0,
      createNotificationTime: async (presetId, daysBefore, time) => {
        const row = { presetId, daysBefore, time };
        saved.push(row);
        return row;
      },
    },
  };
  const source = ts.transpileModule(fs.readFileSync('lib/actions/notifications.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { exports: {}, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(source, context);
  return { add: context.exports.addNotificationTimeAction, saved };
}

test('notification times allow same-day reminders through 14 days ahead', async () => {
  const { add, saved } = fixture();
  for (const days of [0, 1, 13, 14]) {
    const result = await add('preset', days, '09:00');
    assert.equal(result.notificationTime.daysBefore, days);
  }
  assert.equal(saved.length, 4);
});

test('notification times reject out-of-range and invalid days without saving', async () => {
  const { add, saved } = fixture();
  for (const days of [15, 30, -1, 1.5, NaN, Infinity, '14', null, undefined]) {
    const result = await add('preset', days, '09:00');
    assert.match(result.error, /between 0 and 14 days/);
  }
  assert.equal(saved.length, 0);
});
