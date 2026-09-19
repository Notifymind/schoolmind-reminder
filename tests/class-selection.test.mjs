import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadAction(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { exports: {}, require: (name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }};
  vm.runInNewContext(source, context);
  return context.exports;
}

test('an existing user can change class; invalid selections never write', async () => {
  let saved;
  let refreshed;
  let session = { user: { id: 'student' } };
  const { selectClassAction } = loadAction('lib/actions/classes.ts', {
    'next/headers': { headers: async () => ({}) },
    'next/cache': { revalidatePath: (...args) => { refreshed = args; } },
    '@/lib/auth': { auth: { api: { getSession: async () => session } } },
    '@/db': {
      getClassNames: async () => [{ name: '1A' }, { name: '2B' }],
      getUserClass: async () => '1A',
      getUserRole: async () => 'free',
      setUserClass: async (...args) => { saved = args; },
    },
  });
  assert.equal((await selectClassAction('2B')).success, true);
  assert.deepEqual(saved, ['student', '2B']);
  assert.deepEqual(refreshed, ['/app', 'layout']);
  saved = undefined;
  for (const value of ['', null, 'missing', 'x'.repeat(51)]) {
    assert.ok((await selectClassAction(value)).error);
  }
  session = null;
  assert.ok((await selectClassAction('1A')).error);
  assert.equal(saved, undefined);
});

test('class codes cannot be generated, even by an admin', async () => {
  let created = false;
  const { generateCodeAction } = loadAction('lib/actions/seller.ts', {
    'next/headers': { headers: async () => ({}) },
    '@/lib/auth': { auth: { api: {
      getSession: async () => ({ user: { id: 'admin' } }),
      userHasPermission: async () => ({ success: true }),
    } } },
    '@/db': { createCode: async () => { created = true; } },
    '@/db/schema': {},
    'drizzle-orm': {},
  });
  assert.ok((await generateCodeAction('assign', 'once')).error);
  assert.equal(created, false);
});


test('sellers cannot change class even when the session role is stale', async () => {
  let role = 'seller';
  let saved = false;
  const { selectClassAction } = loadAction('lib/actions/classes.ts', {
    'next/headers': { headers: async () => ({}) },
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth': { auth: { api: {
      getSession: async () => ({ user: { id: 'seller-user', role: 'free' } }),
    } } },
    '@/db': {
      getUserRole: async () => role,
      getClassNames: async () => [{ name: '2B' }],
      setUserClass: async () => { saved = true; },
    },
  });
  for (const sellerRole of ['seller', 'admin,seller']) {
    role = sellerRole;
    assert.match((await selectClassAction('2B')).error, /Sellers cannot change/);
    assert.equal(saved, false);
  }
  role = 'admin';
  assert.equal((await selectClassAction('2B')).success, true);
  assert.equal(saved, true);
});
