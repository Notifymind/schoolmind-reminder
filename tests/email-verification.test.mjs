import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';

function load(file, dependencies, env = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { exports: {}, process: { env }, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(source, context);
  return context.exports;
}

function setup() {
  const deliveries = [];
  const referralLinks = [];
  const resetDeliveries = [];
  const database = { user: [], session: [], account: [], verification: [] };
  const { auth: options } = load('lib/auth.ts', {
    'better-auth': { betterAuth: options => options },
    'better-auth/api': {},
    'better-auth/adapters/drizzle': { drizzleAdapter: () => ({}) },
    '@better-auth/passkey': { passkey: () => ({}) },
    'better-auth/plugins': { admin: () => ({}) },
    '@/db/referrals': { referralCookie: 'notifymind_referral', linkReferral: async (...args) => referralLinks.push(args) },
    '@/db': {}, '@/db/schema': {}, './permissions': {},
    './email': { sendVerificationEmail: async message => deliveries.push(message), sendResetPassword: async message => resetDeliveries.push(message) },
  }, { GOOGLE_CLIENT_ID: 'test-google-client', GOOGLE_CLIENT_SECRET: 'test-google-secret' });
  const auth = betterAuth({
    ...options,
    plugins: [],
    database: memoryAdapter(database),
    baseURL: 'http://localhost:3000',
    secret: 'test-only-secret-with-at-least-32-characters',
    logger: { disabled: true },
  });
  return { auth, deliveries, database, referralLinks, resetDeliveries };
}

const credentials = { email: 'student@example.com', password: 'test-password-123', name: 'Student' };
const callbackURL = 'http://localhost:3000/verify-email?verified=1';

test('signup requires verification, resend works, and valid links unlock password login', async () => {
  const { auth, deliveries, database } = setup();
  const signup = await auth.api.signUpEmail({ body: { ...credentials, callbackURL } });
  assert.equal(signup.token, null);
  assert.equal(database.session.length, 0);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].user.email, credentials.email);
  await assert.rejects(auth.api.signInEmail({ body: credentials }), error => error.body.code === 'EMAIL_NOT_VERIFIED');
  assert.equal(deliveries.length, 1, 'login should not automatically send mail');
  await auth.api.sendVerificationEmail({ body: { email: credentials.email, callbackURL } });
  assert.equal(deliveries.length, 2);
  const response = await auth.handler(new Request(deliveries[1].url));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), callbackURL);
  assert.equal(database.user[0].emailVerified, true);
  assert.equal(database.session.length, 0, 'verification does not create a session');
  const login = await auth.api.signInEmail({ body: credentials });
  assert.ok(login.token);
  await auth.api.sendVerificationEmail({ body: { email: credentials.email, callbackURL } });
  await auth.api.sendVerificationEmail({ body: { email: 'unknown@example.com', callbackURL } });
  assert.equal(deliveries.length, 2, 'verified and unknown accounts do not receive mail');
});

test('invalid and expired verification links do not verify users', async () => {
  const { auth, deliveries, database } = setup();
  await auth.api.signUpEmail({ body: { ...credentials, callbackURL } });
  const invalid = new URL(deliveries[0].url);
  invalid.searchParams.set('token', 'invalid-token');
  const response = await auth.handler(new Request(invalid));
  assert.equal(new URL(response.headers.get('location')).searchParams.get('error'), 'invalid_token');
  assert.equal(database.user[0].emailVerified, false);
  // Sign an already expired token with the same test secret.
  const { SignJWT } = await import('jose');
  const token = await new SignJWT({ email: credentials.email })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime(1)
    .sign(new TextEncoder().encode('test-only-secret-with-at-least-32-characters'));
  invalid.searchParams.set('token', token);
  const expired = await auth.handler(new Request(invalid));
  assert.equal(new URL(expired.headers.get('location')).searchParams.get('error'), 'token_expired');
  assert.equal(database.user[0].emailVerified, false);
});

test('Resend receives the verification link and delivery failures are reported', async () => {
  let payload;
  let failure = null;
  const env = { RESEND_API_KEY: 'test-key', RESEND_FROM_EMAIL: 'NotifyMind <mail@example.com>' };
  const { sendVerificationEmail } = load('lib/email.ts', {
    resend: { Resend: class {
      constructor(key) { assert.equal(key, env.RESEND_API_KEY); }
      emails = { send: async message => { payload = message; return { error: failure }; } };
    } },
  }, env);
  const message = { user: { email: credentials.email }, url: 'https://example.com/verify?token=test' };
  await sendVerificationEmail(message);
  assert.equal(payload.to, credentials.email);
  assert.equal(payload.from, env.RESEND_FROM_EMAIL);
  assert.ok(payload.text.includes(message.url));
  failure = { message: 'private provider error' };
  await assert.rejects(sendVerificationEmail(message), /Unable to send/);
  delete env.RESEND_API_KEY;
  await assert.rejects(sendVerificationEmail(message), /Set RESEND_API_KEY/);
});


test('referral cookie links only after successful authentication and is consumed', async () => {
  const { auth, deliveries, database, referralLinks } = setup();
  const cookie = 'notifymind_referral=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  await auth.api.signUpEmail({ body: { ...credentials, callbackURL }, headers: new Headers({ cookie }) });
  assert.equal(referralLinks.length, 0);
  await assert.rejects(auth.api.signInEmail({ body: credentials, headers: new Headers({ cookie }) }));
  assert.equal(referralLinks.length, 0);
  await auth.handler(new Request(deliveries[0].url));
  const response = await auth.handler(new Request('http://localhost:3000/api/auth/sign-in/email', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', cookie }, body: JSON.stringify(credentials),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(referralLinks, [[database.user[0].id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']]);
  assert.match(response.headers.get('set-cookie'), /notifymind_referral=; Max-Age=0/i);
});


test('password reset changes credentials, consumes token, and revokes sessions', async () => {
  const { auth, deliveries, resetDeliveries, database } = setup();
  await auth.api.signUpEmail({ body: { ...credentials, callbackURL } });
  await auth.handler(new Request(deliveries[0].url));
  await auth.api.signInEmail({ body: credentials });
  const body = { email: credentials.email, redirectTo: 'http://localhost:3000/reset-password' };
  const known = await auth.api.requestPasswordReset({ body });
  const unknown = await auth.api.requestPasswordReset({ body: { ...body, email: 'unknown@example.com' } });
  assert.deepEqual(known, unknown);
  assert.equal(resetDeliveries.length, 1);
  const response = await auth.handler(new Request(resetDeliveries[0].url));
  const redirect = new URL(response.headers.get('location'));
  assert.equal(redirect.pathname, '/reset-password');
  const token = redirect.searchParams.get('token');
  const newPassword = 'new-test-password-456';
  await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: 'short' } }));
  await auth.api.resetPassword({ body: { token, newPassword } });
  assert.equal(database.session.length, 0);
  await assert.rejects(auth.api.resetPassword({ body: { token, newPassword } }));
  await assert.rejects(auth.api.signInEmail({ body: credentials }));
  assert.ok((await auth.api.signInEmail({ body: { ...credentials, password: newPassword } })).token);
});

test('expired reset tokens cannot change passwords', async () => {
  const { auth, resetDeliveries, database } = setup();
  await auth.api.signUpEmail({ body: { ...credentials, callbackURL } });
  await auth.api.requestPasswordReset({ body: { email: credentials.email, redirectTo: 'http://localhost:3000/reset-password' } });
  const token = new URL(resetDeliveries[0].url).pathname.split('/').pop();
  const record = database.verification.find(record => record.identifier === `reset-password:${token}`);
  assert.ok(record);
  record.expiresAt = new Date(0);
  await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: 'replacement-password' } }));
});

test('Google sign-in generates an authorization URL with state and the callback', async () => {
  const { auth } = setup();
  const result = await auth.api.signInSocial({ body: {
    provider: 'google', callbackURL: 'http://localhost:3000/app',
    errorCallbackURL: 'http://localhost:3000/login?error=google',
  } });
  const url = new URL(result.url);
  assert.equal(url.hostname, 'accounts.google.com');
  assert.equal(url.searchParams.get('client_id'), 'test-google-client');
  assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:3000/api/auth/callback/google');
  assert.ok(url.searchParams.get('state'));
});

test('reset email sends the reset link through Resend', async () => {
  let payload;
  const { sendResetPassword } = load('lib/email.ts', {
    resend: { Resend: class {
      emails = { send: async message => { payload = message; return {}; } };
    } },
  }, { RESEND_API_KEY: 'test', RESEND_FROM_EMAIL: 'mail@example.com' });
  await sendResetPassword({ user: { email: credentials.email }, url: 'https://example.com/reset?token=test' });
  assert.equal(payload.to, credentials.email);
  assert.match(payload.subject, /Reset/);
  assert.match(payload.text, /https:\/\/example.com\/reset\?token=test/);
});
