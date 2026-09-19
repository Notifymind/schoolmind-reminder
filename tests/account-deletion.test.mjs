import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { APIError } from 'better-auth/api';

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { exports: {}, process: { env: {} }, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(source, context);
  return context.exports;
}

test('deletion hook uses the current seller balance and blocks debt', async () => {
  let account;
  let queriedId;
  const db = { select: () => ({ from: () => ({ where: async () => account ? [account] : [] }) }) };
  const { hasSellerDebt } = load('db/index.ts', {
    'dotenv/config': {},
    'drizzle-orm/node-postgres': { drizzle: () => db },
    'drizzle-orm': { eq: (_field, id) => { queriedId = id; } },
    './schema': { user: { id: 'id', role: 'role', balance: 'balance' } },
    '@/lib/utils': {},
  });
  const { auth: options } = load('lib/auth.ts', {
    'better-auth': { betterAuth: options => options },
    'better-auth/api': { APIError },
    'better-auth/adapters/drizzle': { drizzleAdapter: () => ({}) },
    '@better-auth/passkey': { passkey: () => ({}) },
    'better-auth/plugins': { admin: () => ({}) },
    '@/db': { db, hasSellerDebt },
    '@/db/schema': {},
    './permissions': {},
  });
  const beforeDelete = options.user.deleteUser.beforeDelete;
  for (const role of ['seller', 'admin,seller']) {
    for (const balance of ['-0.01', '-50.00']) {
      account = { role, balance };
      await assert.rejects(beforeDelete({ id: 'user-1', role: 'free' }), error => {
        assert.equal(error.status, 'FORBIDDEN');
        assert.match(error.message, /settle your seller debt/);
        return true;
      });
      assert.equal(queriedId, 'user-1');
    }
  }
  for (const [role, balance] of [['seller', '0.00'], ['seller', '2.00'], ['free', '-5.00'], ['admin', '-5.00']]) {
    account = { role, balance };
    await assert.doesNotReject(beforeDelete({ id: 'user-1' }));
  }
});
