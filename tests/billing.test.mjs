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
import * as cuid2 from '@paralleldrive/cuid2';

function load(file, dependencies = {}, env = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, Date, URL, process: { env }, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(source, context);
  return context.exports;
}

test('gift card billing against embedded PostgreSQL', async t => {
  const pg = new PGlite();
  t.after(() => pg.close());
  const schema = load('db/schema.ts', { 'drizzle-orm/pg-core': core, 'drizzle-orm': orm, '@paralleldrive/cuid2': cuid2 });
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
  await pg.exec(fs.readFileSync('drizzle/0010_billing_options.sql', 'utf8'));
  await pg.exec(fs.readFileSync('drizzle/0011_referrals.sql', 'utf8'));
  await pg.exec(fs.readFileSync('drizzle/0012_remove_referral_total_cap.sql', 'utf8'));
  await pg.exec(fs.readFileSync('drizzle/0013_pro_plan_marketing.sql', 'utf8'));
  await pg.exec(fs.readFileSync('drizzle/0014_required_login_code.sql', 'utf8'));
  assert.ok((await db.select().from(schema.user)).every(user => user.twoFactorEnabled));
  const account = async id => (await db.select().from(schema.user).where(orm.eq(schema.user.id, id)))[0];
  const expire = async (id = 'buyer') => db.update(schema.user).set({ subscriptionEndsAt: new Date(Date.now() - 1000) }).where(orm.eq(schema.user.id, id));

  await t.test('migration preserves legacy purchasing power and original refund cost', async () => {
    const [code] = await db.select().from(schema.codes).where(orm.eq(schema.codes.id, 'legacy'));
    assert.equal(code.type, 'balance'); assert.equal(code.value, '3.00'); assert.equal(code.sellerCost, '2.00');
    assert.equal((await account('buyer')).subscriptionAutoRenew, false);
  });
  await t.test('seller pays full face value and cannot exceed debt under concurrent requests', async () => {
    const results = await Promise.all([billing.createGiftCard('seller', 4), billing.createGiftCard('seller', 4)]);
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
    const { code } = await billing.createGiftCard('admin', 4);
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
    const { code } = await billing.createGiftCard('seller', 1);
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
    const { code } = await billing.createGiftCard('admin', 4);
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
  await t.test('custom options use configured costs, preserve issued cards, and refund original cost', async () => {
    const [option] = await db.insert(schema.giftCardOptions).values({ value: '12.00', sellerCost: '5.50' }).returning();
    const before = Number((await account('seller')).balance);
    const { code } = await billing.createGiftCard('seller', option.id);
    assert.equal(code.value, '12.00');
    assert.equal(code.sellerCost, '5.50');
    assert.equal(Number((await account('seller')).balance), before - 5.5);
    await db.update(schema.giftCardOptions).set({ value: '15.00', sellerCost: '6.25' }).where(orm.eq(schema.giftCardOptions.id, option.id));
    await billing.deleteGiftCard(code.id, 'seller');
    assert.equal(Number((await account('seller')).balance), before);
    const next = await billing.createGiftCard('seller', option.id);
    assert.equal(next.code.value, '15.00');
    assert.equal(next.code.sellerCost, '6.25');
    assert.ok((await billing.createGiftCard('seller', 999)).error);
  });
  await t.test('custom plans support months and edited terms at renewal without changing paid access', async () => {
    await db.insert(schema.proPlans).values({ id: 'quarter', label: 'Three months', price: '12.00', duration: 3, unit: 'months' });
    await db.update(schema.user).set({ walletBalance: '40.00' }).where(orm.eq(schema.user.id, 'buyer'));
    assert.equal((await billing.subscribeToPro('buyer', 'quarter')).success, true);
    const before = await account('buyer');
    assert.equal(before.walletBalance, '28.00');
    assert.ok(before.subscriptionEndsAt > new Date(Date.now() + 89 * 86400000));
    await db.update(schema.proPlans).set({ price: '10.00', duration: 2 }).where(orm.eq(schema.proPlans.id, 'quarter'));
    assert.equal((await account('buyer')).subscriptionEndsAt.getTime(), before.subscriptionEndsAt.getTime());
    await expire();
    assert.equal(await billing.settleSubscription('buyer'), 'renewed');
    assert.equal((await account('buyer')).walletBalance, '18.00');
    assert.ok((await account('buyer')).subscriptionEndsAt < new Date(Date.now() + 63 * 86400000));
  });
  await t.test('referrals enforce eligibility, permanent links, caps and atomic rewards', async () => {
    const referralApi = load('db/referrals.ts', { 'drizzle-orm': orm, '@/db': { db }, '@/db/schema': schema }, { BETTER_AUTH_URL: 'https://school.example.test/api/auth' });
    for (const id of ['referrer', 'friend1', 'friend2', 'friend3', 'friend4', 'friend5']) {
      await db.insert(schema.user).values({ id, name: id, email: `${id}@example.test` });
    }
    const refCode = (await account('referrer')).referralCode;
    assert.match(refCode, /^[a-z][a-z0-9]{11}$/);
    assert.ok(referralApi.validReferralCode(refCode));
    const legacyCode = (await account('seller')).referralCode;
    assert.match(legacyCode, /^[0-9a-f-]{36}$/);
    assert.ok(referralApi.validReferralCode(legacyCode));
    for (const invalid of ['', 'abc', 'a'.repeat(11), 'a'.repeat(13), '1abcdefghijk', 'ABCDEFGHIJKL', 'abcd_efghijk']) {
      assert.equal(referralApi.validReferralCode(invalid), false);
    }
    assert.equal((await referralApi.getReferralSummary('referrer')).link, `https://school.example.test/?referral=${refCode}`);
    assert.equal((await referralApi.getReferralSummary('referrer')).referred, 0);
    assert.notEqual(refCode, (await account('friend1')).referralCode);
    await referralApi.linkReferral('referrer', refCode);
    await referralApi.linkReferral('seller', refCode);
    await referralApi.linkReferral('friend1', 'invalid');
    assert.equal((await db.select().from(schema.referrals)).length, 0);
    const oldCard = (await billing.createGiftCard('admin', 1)).code;
    await billing.redeemGiftCard(oldCard.code, 'friend1');
    for (const id of ['friend1', 'friend2', 'friend3', 'friend4', 'friend5']) await referralApi.linkReferral(id, refCode);
    assert.equal((await referralApi.getReferralSummary('referrer')).referred, 5);
    await referralApi.linkReferral('friend1', (await account('seller')).referralCode);
    assert.equal((await db.select().from(schema.referrals).where(orm.eq(schema.referrals.referredId, 'friend1')))[0].referrerId, 'referrer');
    await assert.rejects(pg.exec("UPDATE referrals SET referrer_id = 'seller' WHERE referred_id = 'friend1'"));
    await assert.rejects(pg.exec("DELETE FROM referrals WHERE referred_id = 'friend1'"));
    await assert.rejects(pg.exec("UPDATE \"user\" SET referral_code = 'changed' WHERE id = 'referrer'"));
    await pg.query('SELECT reward_referral($1)', [oldCard.id]);
    assert.equal((await account('referrer')).walletBalance, '0.00');
    const [option] = await db.insert(schema.giftCardOptions).values({ value: '30.00', sellerCost: '0' }).returning();
    for (const id of ['friend1', 'friend2', 'friend3', 'friend4', 'friend5']) {
      const cards = await Promise.all([billing.createGiftCard('admin', option.id), billing.createGiftCard('admin', option.id)]);
      await Promise.all(cards.flatMap(({code}) => [billing.redeemGiftCard(code.code, id), billing.redeemGiftCard(code.code, id)]));
      await pg.query('SELECT reward_referral($1)', [cards[0].code.id]);
    }
    assert.equal((await account('referrer')).walletBalance, '25.00');
    const cappedCard = (await billing.createGiftCard('admin', option.id)).code;
    await billing.redeemGiftCard(cappedCard.code, 'friend5');
    assert.equal((await account('referrer')).walletBalance, '25.00');
    const rewards = await db.select().from(schema.referralRewards);
    assert.equal(rewards.filter(r => r.referredId === 'friend1').reduce((s,r) => s + Number(r.amount), 0), 5);
    assert.equal(rewards.filter(r => r.referredId === 'friend5').reduce((s,r) => s + Number(r.amount), 0), 5);
    await db.insert(schema.user).values({ id: 'sellerFriend', name: 'Friend', email: 'sf@example.test' });
    await referralApi.linkReferral('sellerFriend', (await account('seller')).referralCode);
    const before = (await account('seller')).balance;
    const card = (await billing.createGiftCard('admin', 1)).code;
    // A failed referrer credit must roll back the load, ledger and redemption together.
    await db.update(schema.user).set({ balance: '99999999.99' }).where(orm.eq(schema.user.id, 'seller'));
    await assert.rejects(billing.redeemGiftCard(card.code, 'sellerFriend'));
    assert.equal((await account('sellerFriend')).walletBalance, '0.00');
    assert.equal((await db.select().from(schema.referralRewards).where(orm.eq(schema.referralRewards.codeId, card.id))).length, 0);
    await db.update(schema.user).set({ balance: before }).where(orm.eq(schema.user.id, 'seller'));
    assert.equal((await billing.redeemGiftCard(card.code, 'sellerFriend')).success, true);
    assert.equal(Number((await account('seller')).balance), Number(before) + 0.3);
    await db.update(schema.user).set({ role: 'seller' }).where(orm.eq(schema.user.id, 'sellerFriend'));
    const next = (await billing.createGiftCard('admin', 1)).code;
    await billing.redeemGiftCard(next.code, 'sellerFriend');
    assert.equal(Number((await account('seller')).balance), Number(before) + 0.3);
    await db.delete(schema.user).where(orm.eq(schema.user.id, 'friend1'));
    assert.equal((await referralApi.getReferralSummary('referrer')).earned, '25.00');
    assert.equal((await referralApi.getReferralSummary('referrer')).referred, 5);
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
  for (const value of [null, '', 3, 'x'.repeat(21)]) assert.ok((await actions.subscribeToProAction(value)).error);
  assert.equal(calls.length, 0);
  await actions.redeemCodeAction(' aaaaa-bbbbb ');
  await actions.subscribeToProAction('month');
  await actions.cancelProRenewalAction();
  assert.deepEqual(calls, [
    ['redeem', 'AAAAA-BBBBB', 'buyer'], ['subscribe', 'buyer', 'month'], ['cancel', 'buyer'],
  ]);
});


test('month durations clamp to the last day and preserve UTC time', () => {
  const { subscriptionEnd } = load('lib/billing.ts');
  assert.equal(subscriptionEnd({ duration: 1, unit: 'months' }, new Date('2028-01-31T14:30:00Z')).toISOString(), '2028-02-29T14:30:00.000Z');
});

test('only admins can save billing options; invalid inputs never reach the database', async () => {
  let session = null;
  let allowed = false;
  const actions = load('lib/actions/billing-options.ts', {
    'next/headers': { headers: async () => ({}) },
    'next/cache': { revalidatePath: () => {} },
    'node:crypto': { randomUUID },
    'drizzle-orm': orm,
    '@/db': { db: {} },
    '@/db/schema': {},
    '@/lib/auth': { auth: { api: { getSession: async () => session, userHasPermission: async () => ({ success: allowed }) } } },
  });
  const plan = { label: 'Three months', price: '12', duration: 3, unit: 'months' };
  const gift = { value: '12', sellerCost: '10' };
  for (const user of [null, { user: { id: 'seller' } }]) {
    session = user;
    assert.ok((await actions.saveProPlanAction(plan)).error);
    assert.ok((await actions.saveGiftCardOptionAction(gift)).error);
  }
  allowed = true;
  for (const marketingText of ['x'.repeat(161), null, 12]) assert.ok((await actions.saveProPlanAction({ ...plan, marketingText })).error);
  for (const price of ['-1', '0', 'NaN', '1.001', '100000000', null]) assert.ok((await actions.saveProPlanAction({ ...plan, price })).error);
  for (const duration of [0, -1, 1.5, 3651, NaN]) assert.ok((await actions.saveProPlanAction({ ...plan, duration })).error);
  assert.ok((await actions.saveProPlanAction({ ...plan, unit: 'years' })).error);
  for (const sellerCost of ['-1', 'NaN', '1.001', null]) assert.ok((await actions.saveGiftCardOptionAction({ ...gift, sellerCost })).error);
  assert.ok((await actions.saveGiftCardOptionAction({ ...gift, value: '0' })).error);
});
