import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { exports: {}, process: { env: {} }, console: { error() {} }, ...globals,
    require: name => { assert.ok(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name]; } };
  vm.runInNewContext(source, context);
  return context.exports;
}

function browserFixture() {
  let enabled = true;
  let sub = { endpoint: 'https://push.example/device', toJSON: () => ({ endpoint: 'https://push.example/device', keys: { p256dh: 'key', auth: 'auth' } }),
    unsubscribe: async () => { events.push('browser-delete'); sub = null; return true; } };
  const events = [];
  let response = { success: true };
  const state = { setSubscribed: value => { enabled = value; } };
  const reg = { pushManager: { getSubscription: async () => sub } };
  const client = load('lib/push-client.ts', {
    '@/lib/actions/notifications': {
      subscribeToPushAction: async () => { events.push('server-save'); return response; },
      unsubscribeFromPushAction: async () => { events.push('server-delete'); return response; },
    },
    '@/lib/stores/push-notifications': { usePushNotificationStore: { getState: () => state } },
  }, { navigator: { serviceWorker: { getRegistration: async () => reg, ready: Promise.resolve(reg) },
    locks: { request: async (_name, work) => work() } }, window: { PushManager: {}, Notification: {} },
    Notification: { permission: 'granted', requestPermission: async () => 'granted' } });
  return { client, events, enabled: () => enabled, fail: () => { response = { error: 'Not authenticated' }; }, clear: () => { sub = null; } };
}

test('reconciliation does not trust stale UI state when browser subscription is missing', async () => {
  const f = browserFixture(); f.clear(); await f.client.syncPushSubscription(); assert.equal(f.enabled(), false);
});
test('failed server registration never reports enabled', async () => {
  const f = browserFixture(); f.fail(); await assert.rejects(f.client.syncPushSubscription(), /Not authenticated/); assert.equal(f.enabled(), false);
});
test('logout removes server ownership and browser subscription before ending session', async () => {
  const f = browserFixture(); await f.client.disablePush(async () => { f.events.push('logout'); });
  assert.deepEqual(f.events, ['server-delete', 'browser-delete', 'logout']); assert.equal(f.enabled(), false);
});
test('failed server removal preserves browser endpoint for retry and prevents logout', async () => {
  const f = browserFixture(); f.fail(); await assert.rejects(f.client.disablePush(async () => { f.events.push('logout'); }));
  assert.deepEqual(f.events, ['server-delete']);
});

test('device queue retries only temporary failures, prunes expired endpoints, and skips old owners', async () => {
  const rows = [
    ['ok', null], ['temporary', 503], ['gone', 410], ['missing', 404], ['limited', 429], ['bad', 400], ['network', undefined], ['exhausted', 503], ['old-owner', null],
  ].map(([id, status]) => ({ id, status, userId: 'user', attempts: id === 'exhausted' ? 6 : 1,
    createdAt: new Date(), payload: '{}', subscription: id === 'old-owner' ? undefined : { endpoint: id, p256dh: 'key', auth: 'auth' } }));
  const statuses = new Map(rows.map(row => [row.id, row.status]));
  const finished = new Map(); const deleted = []; const sent = [];
  const { deliverPushQueue } = load('lib/push-delivery.ts', {
    'web-push': { default: { sendNotification: async sub => {
      sent.push(sub.endpoint); const status = statuses.get(sub.endpoint);
      if (status !== null) throw { statusCode: status };
    } } },
    '@/db': { claimPushDelivery: async () => rows.shift() ?? null,
      finishPushDelivery: async (id, retryAt) => finished.set(id, retryAt),
      deletePushSubscription: async (user, endpoint) => deleted.push([user, endpoint]) },
  });
  const result = await deliverPushQueue();
  assert.equal(result.sent, 1); assert.equal(result.errors, 7);
  assert.deepEqual(deleted, [['user', 'gone'], ['user', 'missing']]);
  for (const id of ['temporary', 'limited', 'network']) assert.ok(finished.get(id).getTime() > Date.now());
  for (const id of ['ok', 'gone', 'missing', 'bad', 'exhausted', 'old-owner']) assert.equal(finished.get(id), undefined);
  assert.equal(sent.includes('old-owner'), false);
});

test('registering the same browser transfers ownership, refreshes keys, and cancels old-owner deliveries', async () => {
  let row;
  let deliveries = [{ subscriptionId: 'device-id', userId: 'alice' }];
  const tx = {
    insert: () => ({ values: values => ({ onConflictDoUpdate: conflict => ({ returning: async () => {
      row = row ? { ...row, ...conflict.set } : values;
      return [row];
    } }) }) }),
    delete: () => ({ where: async condition => { deliveries = deliveries.filter(item => !condition(item)); } }),
  };
  const { createPushSubscription } = load('db/index.ts', {
    'dotenv/config': {},
    'drizzle-orm/node-postgres': { drizzle: () => ({ transaction: fn => fn(tx) }) },
    'drizzle-orm': {
      eq: (field, value) => item => item[field] === value,
      and: (...conditions) => item => conditions.every(fn => fn(item)),
      sql: (_parts, field, value) => item => item[field] !== value,
    },
    './schema': { pushSubscriptions: { endpoint: 'endpoint' }, pushDeliveries: { subscriptionId: 'subscriptionId', userId: 'userId' } },
    '@/lib/utils': { generateId: () => 'device-id' },
  });
  await createPushSubscription('alice', 'https://push.example/device', 'old-key', 'old-auth');
  assert.equal(deliveries.length, 1);
  await createPushSubscription('bob', 'https://push.example/device', 'new-key', 'new-auth');
  assert.equal(row.userId, 'bob'); assert.equal(row.p256dh, 'new-key'); assert.equal(row.auth, 'new-auth');
  assert.equal(deliveries.length, 0);
});

test('notification settings show the actual failure instead of desktop home-screen advice', async () => {
  const source = fs.readFileSync('app/app/notifications/page.tsx', 'utf8');
  const handler = source.match(/async function subscribeToPush\(\) \{[\s\S]*?\n  \}/)[0];
  const messages = [];
  const context = {
    enablePush: async () => { throw new Error('Could not save notification settings. Please try again.'); },
    setIsLoading() {}, console: { error() {} }, toast: { error: text => messages.push(text) }, Error,
  };
  vm.createContext(context);
  await vm.runInContext(`${handler}; subscribeToPush()`, context);
  assert.equal(messages[0], 'Could not save notification settings. Please try again.');
});
