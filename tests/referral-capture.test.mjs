import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, URL, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(source, context);
  return context.exports;
}

test('referral capture stays on the public origin behind a reverse proxy', async () => {
  const { GET } = load('app/api/referrals/capture/route.ts', {
    'next/server': { NextRequest, NextResponse },
    '@/lib/auth': { auth: { api: { getSession: async () => null } } },
    '@/db/referrals': {
      referralCookie: 'notifymind_referral', validReferralCode: () => true,
      linkReferral: async () => {},
    },
  });
  const response = await GET(new NextRequest(
    'http://localhost:3000/api/referrals/capture?referral=xjq4v9f0wrka',
    { headers: { 'x-forwarded-host': 'notifymind.org', 'x-forwarded-proto': 'https' } },
  ));
  assert.equal(response.status, 307);
  assert.equal(
    new URL(response.headers.get('location'), 'https://notifymind.org/api/referrals/capture').href,
    'https://notifymind.org/',
  );
  assert.equal(response.cookies.get('notifymind_referral').value, 'xjq4v9f0wrka');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('referral landing captures before navigation and supports guests and existing sessions', async () => {
  const code = 'a1b2c3d4e5f6';
  const server = { NextRequest, NextResponse };
  const { proxy } = load('proxy.ts', { 'next/server': server });
  const redirect = proxy(new NextRequest(`https://notifymind.org/?referral=${code}`));
  const location = redirect.headers.get('location');
  assert.equal(location, `https://notifymind.org/api/referrals/capture?referral=${code}`);
  let session = null;
  const links = [];
  const { GET } = load('app/api/referrals/capture/route.ts', {
    'next/server': server,
    '@/lib/auth': { auth: { api: { getSession: async () => session } } },
    '@/db/referrals': {
      referralCookie: 'notifymind_referral', validReferralCode: value => value === code,
      linkReferral: async (...args) => links.push(args),
    },
  });
  const guest = await GET(new NextRequest(location));
  assert.equal(guest.headers.get('location'), '/');
  assert.equal(guest.cookies.get('notifymind_referral').value, code);
  assert.match(guest.headers.get('set-cookie'), /HttpOnly/);
  assert.match(guest.headers.get('set-cookie'), /Secure/);
  assert.equal(links.length, 0);
  session = { user: { id: 'existing-user' }, session: {} };
  const loggedIn = await GET(new NextRequest(location));
  assert.deepEqual(links, [['existing-user', code]]);
  assert.equal(loggedIn.cookies.get('notifymind_referral').value, '');
  session.session.impersonatedBy = 'admin';
  await GET(new NextRequest(location));
  await GET(new NextRequest('https://notifymind.org/api/referrals/capture?referral=invalid'));
  assert.equal(links.length, 1);
});
