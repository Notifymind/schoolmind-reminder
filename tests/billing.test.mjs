import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomInt, randomUUID } from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as orm from 'drizzle-orm';
import * as core from 'drizzle-orm/pg-core';

function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, Date, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(source, context);
  return context.exports;
}

test('gift card billing against embedded PostgreSQL', async t => {
  const pg = new PGlite();
  t.after(() => pg.close());
  const schema = load('db/schema.ts', { 'drizzle-orm/pg-core': core, 'drizzle-orm': orm });
  const db = drizzle(pg);
  const billing = load('db/billing.ts', {
    'node:crypto': { randomInt }, 'drizzle-orm': orm, '@/db': { db }, '@/db/schema': schema,
    '@/lib/utils': { generateId: randomUUID }, '@/lib/billing': load('lib/billing.ts'),
  });
  // Pre-billing schema from the current app. Older unrelated migrations still use serial IDs.
  await pg.exec(`
    CREATE TABLE schoolclass (name varchar(50) PRIMARY KEY);
    CREATE TABLE "user" (
      id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      email_verified boolean NOT NULL DEFAULT false, image text, class varchar(50),
      role varchar(50) NOT NULL DEFAULT 'free', banned boolean DEFAULT false,
      ban_reason text, ban_expires timestamp, balance numeric(10,2) NOT NULL DEFAULT 0,
      max_debt numeric(10,2) NOT NULL DEFAULT 0, subscription_ends_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
    );
    CREATE TABLE codes (
      id text PRIMARY KEY, code varchar(11) NOT NULL UNIQUE, type varchar(20) NOT NULL,
      duration varchar(20) NOT NULL, value numeric(10,2) NOT NULL,
      seller_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      class_name varchar(50) REFERENCES schoolclass(name),
      redeemed_by text REFERENCES "user"(id) ON DELETE SET NULL,
      redeemed_at timestamp, was_redeemed_at timestamp, created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await pg.exec(`INSERT INTO "user" (id, name, email, role, balance) VALUES
    ('seller', 'Seller', 'seller@example.test', 'seller', 24),
    ('admin', 'Admin', 'admin@example.test', 'admin', 0),
    ('buyer', 'Buyer', 'buyer@example.test', 'free', 0);
    INSERT INTO codes (id, code, type, duration, value, seller_id) VALUES
    ('legacy', 'AAAAA-BBBBB', 'pro', 'month', 2, 'seller');`);
  await pg.exec(fs.readFileSync('drizzle/0009_gift_card_billing.sql', 'utf8'));
  const account = async id => (await db.select().from(schema.user).where(orm.eq(schema.user.id, id)))[0];
  const expire = async (id = 'buyer') => db.update(schema.user).set({ subscriptionEndsAt: new Date(Date.now() - 1000) }).where(orm.eq(schema.user.id, id));

  await t.test('migration preserves legacy purchasing power and original refund cost', async () => {
    const [code] = await db.select().from(schema.codes).where(orm.eq(schema.codes.id, 'legacy'));
    assert.equal(code.type, 'balance'); assert.equal(code.value, '3.00'); assert.equal(code.sellerCost, '2.00');
    assert.equal((await account('buyer')).subscriptionAutoRenew, false);
  });
  await t.test('seller pays full face value and cannot exceed debt under concurrent requests', async () => {
    const results = await Promise.all([billing.createGiftCard('seller', 24), billing.createGiftCard('seller', 24)]);
    assert.equal(results.filter(r => r.code).length, 1);
    assert.equal((await account('seller')).balance, '0.00');
    const code = results.find(r => r.code).code;
    assert.equal(code.sellerCost, '24.00');
    const refunds = await Promise.all([billing.deleteGiftCard(code.id, 'seller'), billing.deleteGiftCard(code.id, 'seller')]);
    assert.equal(refunds.filter(r => r.success).length, 1);
    assert.equal((await account('seller')).balance, '24.00');
    assert.ok((await billing.createGiftCard('buyer', 3)).error);
    for (const value of [NaN, -3, 0, 1.5, Infinity, '3', 'assign']) assert.ok((await billing.createGiftCard('seller', value)).error);
  });
  await t.test('admin-issued cards cannot create money through refunds', async () => {
    const { code } = await billing.createGiftCard('admin', 24);
    assert.equal(code.sellerCost, '0.00');
    await billing.deleteGiftCard(code.id, 'admin');
    assert.equal((await account('admin')).balance, '0.00');
  });
  await t.test('simultaneous redemptions credit once without subscribing', async () => {
    const results = await Promise.all([billing.redeemGiftCard('AAAAA-BBBBB', 'buyer'), billing.redeemGiftCard('AAAAA-BBBBB', 'buyer')]);
    assert.equal(results.filter(r => r.success).length, 1);
    assert.equal((await account('buyer')).walletBalance, '3.00');
    assert.equal((await account('buyer')).role, 'free');
    assert.ok((await billing.deleteGiftCard('legacy', 'seller')).error);
  });
  await t.test('failed credit rolls back redemption', async () => {
    const { code } = await billing.createGiftCard('seller', 3);
    await db.update(schema.user).set({ walletBalance: '99999999.99' }).where(orm.eq(schema.user.id, 'buyer'));
    await assert.rejects(billing.redeemGiftCard(code.code, 'buyer'));
    await db.update(schema.user).set({ walletBalance: '3.00' }).where(orm.eq(schema.user.id, 'buyer'));
    assert.equal((await billing.redeemGiftCard(code.code, 'buyer')).success, true);
    assert.equal((await account('buyer')).walletBalance, '6.00');
  });
  await t.test('concurrent subscription requests and renewals each charge once', async () => {
    const results = await Promise.all([billing.subscribeToPro('buyer', 'month'), billing.subscribeToPro('buyer', 'month')]);
    assert.equal(results.filter(r => r.success).length, 1);
    assert.equal((await account('buyer')).walletBalance, '3.00');
    assert.equal((await account('buyer')).role, 'pro');
    await expire();
    const renewed = await Promise.all([billing.settleSubscription('buyer'), billing.settleSubscription('buyer')]);
    assert.equal(renewed.filter(r => r === 'renewed').length, 1);
    assert.equal((await account('buyer')).walletBalance, '0.00');
    assert.ok((await account('buyer')).subscriptionEndsAt > new Date());
  });
  await t.test('insufficient funds stop renewal without going into debt', async () => {
    await expire();
    assert.equal(await billing.settleSubscription('buyer'), 'downgraded');
    const user = await account('buyer');
    assert.equal(user.role, 'free'); assert.equal(user.walletBalance, '0.00'); assert.equal(user.subscriptionAutoRenew, false);
    assert.ok((await billing.subscribeToPro('buyer', 'month')).error);
    assert.ok((await billing.subscribeToPro('buyer', 'invalid')).error);
  });
  await t.test('cancel preserves paid time; enabling renewal does not charge early', async () => {
    const { code } = await billing.createGiftCard('admin', 24);
    await billing.redeemGiftCard(code.code, 'buyer');
    await billing.subscribeToPro('buyer', 'school_year');
    const before = await account('buyer');
    assert.ok(before.subscriptionEndsAt > new Date(Date.now() + 364 * 86400000));
    await billing.cancelProRenewal('buyer');
    assert.equal((await account('buyer')).role, 'pro');
    assert.equal((await account('buyer')).subscriptionEndsAt.getTime(), before.subscriptionEndsAt.getTime());
    assert.equal((await billing.subscribeToPro('buyer', 'month')).success, true);
    assert.equal((await account('buyer')).walletBalance, '0.00');
    await billing.cancelProRenewal('buyer'); await expire();
    assert.equal(await billing.settleSubscription('buyer'), 'downgraded');
  });
  await t.test('redemption stays spent after redeemer account deletion', async () => {
    await db.delete(schema.user).where(orm.eq(schema.user.id, 'buyer'));
    assert.ok((await billing.redeemGiftCard('AAAAA-BBBBB', 'admin')).error);
    assert.ok((await billing.deleteGiftCard('legacy', 'seller')).error);
  });
});

test('billing actions require authentication and validate input before changing balances', async () => {
  let session = null;
  const calls = [];
  const actions = load('lib/actions/subscription.ts', {
    'next/headers': { headers: async () => ({}) },
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth': { auth: { api: { getSession: async () => session } } },
    '@/lib/billing': load('lib/billing.ts'),
    '@/db/billing': {
      redeemGiftCard: async (...args) => { calls.push(['redeem', ...args]); return { success: true }; },
      subscribeToPro: async (...args) => { calls.push(['subscribe', ...args]); return { success: true }; },
      cancelProRenewal: async (...args) => { calls.push(['cancel', ...args]); return { success: true }; },
    },
  });
  assert.ok((await actions.redeemCodeAction('AAAAA-BBBBB')).error);
  assert.ok((await actions.subscribeToProAction('month')).error);
  assert.ok((await actions.cancelProRenewalAction()).error);
  assert.equal(calls.length, 0);
  session = { user: { id: 'buyer' } };
  for (const value of [null, 3, '', 'unknown']) assert.ok((await actions.redeemCodeAction(value)).error);
  for (const value of [null, 'toString', '__proto__', 'free']) assert.ok((await actions.subscribeToProAction(value)).error);
  assert.equal(calls.length, 0);
  await actions.redeemCodeAction(' aaaaa-bbbbb ');
  await actions.subscribeToProAction('month');
  await actions.cancelProRenewalAction();
  assert.deepEqual(calls, [
    ['redeem', 'AAAAA-BBBBB', 'buyer'], ['subscribe', 'buyer', 'month'], ['cancel', 'buyer'],
  ]);
});
