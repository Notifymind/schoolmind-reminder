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
  const database = { user: [], session: [], account: [], verification: [] };
  const { auth: options } = load('lib/auth.ts', {
    'better-auth': { betterAuth: options => options },
    'better-auth/api': {},
    'better-auth/adapters/drizzle': { drizzleAdapter: () => ({}) },
    '@better-auth/passkey': { passkey: () => ({}) },
    'better-auth/plugins': { admin: () => ({}) },
    '@/db': {}, '@/db/schema': {}, './permissions': {},
    './email': { sendVerificationEmail: async message => deliveries.push(message) },
  });
  const auth = betterAuth({
    ...options,
    plugins: [],
    database: memoryAdapter(database),
    baseURL: 'http://localhost:3000',
    secret: 'test-only-secret-with-at-least-32-characters',
    logger: { disabled: true },
  });
  return { auth, deliveries, database };
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
