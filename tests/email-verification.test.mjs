import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { twoFactor } from 'better-auth/plugins/two-factor';
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

function setup({ failCodeDelivery = false, env = {} } = {}) {
  const deliveries = [];
  const loginCodes = [];
  const referralLinks = [];
  const resetDeliveries = [];
  const defaultPresetUsers = [];
  const database = { user: [], session: [], account: [], verification: [] };
  const { auth: options } = load('lib/auth.ts', {
    'better-auth': { betterAuth: options => options },
    'better-auth/api': { APIError, createAuthMiddleware },
    'better-auth/plugins/two-factor': { twoFactor },
    'better-auth/adapters/drizzle': { drizzleAdapter: () => ({}) },
    '@better-auth/passkey': { passkey: () => ({}) },
    'better-auth/plugins': { admin: () => ({}) },
    '@/db/referrals': { referralCookie: 'notifymind_referral', linkReferral: async (...args) => referralLinks.push(args) },
    '@/db': { createDefaultNotificationPreset: async userId => defaultPresetUsers.push(userId) }, '@/db/schema': {}, './permissions': {},
    './email': { sendLoginCode: async message => { if (failCodeDelivery) throw new Error("Provider failed"); loginCodes.push(message); }, sendVerificationEmail: async message => deliveries.push(message), sendResetPassword: async message => resetDeliveries.push(message) },
  }, { GOOGLE_CLIENT_ID: 'test-google-client', GOOGLE_CLIENT_SECRET: 'test-google-secret', ...env });
  const auth = betterAuth({
    ...options,
    plugins: options.plugins.filter(plugin => plugin.id === "two-factor"),
    database: memoryAdapter(database),
    baseURL: 'http://localhost:3000',
    secret: 'test-only-secret-with-at-least-32-characters',
    logger: { disabled: true },
  });
  return { auth, deliveries, database, referralLinks, resetDeliveries, loginCodes, defaultPresetUsers };
}

const credentials = { email: 'student@example.com', password: 'test-password-123', name: 'Student' };
const callbackURL = 'http://localhost:3000/verify-email?verified=1';

test('new accounts get a default preset once, without recreating it on login', async () => {
  const { auth, deliveries, database, defaultPresetUsers } = setup();
  await auth.api.signUpEmail({ body: credentials });
  assert.deepEqual(defaultPresetUsers, [database.user[0].id]);
  await auth.handler(new Request(deliveries[0].url));
  await auth.api.signInEmail({ body: credentials });
  assert.deepEqual(defaultPresetUsers, [database.user[0].id]);
});

test('preview bypass skips the code but still requires verified email and a valid password', async () => {
  const { auth, deliveries, database, loginCodes, referralLinks } = setup({ env: { BYPASS_2FA: 'true' } });
  await auth.api.signUpEmail({ body: credentials });
  assert.equal(database.user[0].twoFactorEnabled, true);
  await assert.rejects(auth.api.signInEmail({ body: credentials }), error => error.body.code === 'EMAIL_NOT_VERIFIED');
  await auth.handler(new Request(deliveries[0].url));
  await assert.rejects(auth.api.signInEmail({ body: { ...credentials, password: 'wrong-password' } }));
  assert.equal(database.session.length, 0);
  const login = await auth.api.signInEmail({
    body: credentials,
    headers: new Headers({ cookie: 'notifymind_referral=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
    returnHeaders: true,
  });
  assert.ok(login.response.token);
  assert.equal(login.response.twoFactorRedirect, undefined);
  assert.equal(database.session.length, 1);
  assert.equal(database.user[0].twoFactorEnabled, true, 'bypass must not disable 2FA on the account');
  assert.equal(loginCodes.length, 0);
  assert.ok(await auth.api.getSession({ headers: challengeHeaders(login.headers) }));
  assert.deepEqual(referralLinks, [[database.user[0].id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']]);
});

for (const value of [undefined, 'false', '1', 'TRUE']) {
  test(`2FA remains required when BYPASS_2FA is ${value}`, async () => {
    await pendingLogin({ env: { BYPASS_2FA: value } });
  });
}

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
  assert.equal(login.twoFactorRedirect, true);
  assert.equal(database.session.length, 0);
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
  const { auth, deliveries, database, referralLinks, loginCodes } = setup();
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
  assert.equal(referralLinks.length, 0, 'password alone must not consume the referral');
  const headers = challengeHeaders(response.headers, cookie);
  await auth.api.sendTwoFactorOTP({ headers, body: {} });
  const verified = await auth.api.verifyTwoFactorOTP({ headers, body: { code: loginCodes.at(-1).otp }, returnHeaders: true });
  assert.deepEqual(referralLinks, [[database.user[0].id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']]);
  assert.match(verified.headers.get('set-cookie'), /notifymind_referral=; Max-Age=0/i);
});


test('password reset changes credentials, consumes token, and revokes sessions', async () => {
  const { auth, deliveries, resetDeliveries, database, loginCodes } = setup();
  await auth.api.signUpEmail({ body: { ...credentials, callbackURL } });
  await auth.handler(new Request(deliveries[0].url));
  const login = await auth.api.signInEmail({ body: credentials, returnHeaders: true });
  const headers = challengeHeaders(login.headers);
  await auth.api.sendTwoFactorOTP({ headers, body: {} });
  await auth.api.verifyTwoFactorOTP({ headers, body: { code: loginCodes.at(-1).otp } });
  assert.equal(database.session.length, 1);
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
  assert.equal((await auth.api.signInEmail({ body: { ...credentials, password: newPassword } })).twoFactorRedirect, true);
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

function challengeHeaders(headers, extra = '') {
  const cookie = headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  return new Headers({ cookie: `${cookie}; ${extra}` });
}

async function pendingLogin(options) {
  const context = setup(options);
  await context.auth.api.signUpEmail({ body: credentials });
  await context.auth.handler(new Request(context.deliveries[0].url));
  const login = await context.auth.api.signInEmail({ body: credentials, returnHeaders: true });
  assert.equal(login.response.twoFactorRedirect, true);
  assert.equal(context.database.session.length, 0);
  return { ...context, headers: challengeHeaders(login.headers) };
}

test('password login requires a code every time, rejects wrong codes, and consumes challenges', async () => {
  const { auth, headers, loginCodes, database } = await pendingLogin();
  assert.equal(await auth.api.getSession({ headers }), null);
  await assert.rejects(auth.api.sendTwoFactorOTP({ body: {} }));
  await auth.api.sendTwoFactorOTP({ headers, body: {} });
  const code = loginCodes.at(-1).otp;
  assert.match(code, /^\d{6}$/);
  assert.ok(!database.verification.some(row => row.value.includes(code)));
  await assert.rejects(auth.api.verifyTwoFactorOTP({ headers, body: { code: 'wrong' } }));
  await assert.rejects(auth.api.verifyTwoFactorOTP({ headers, body: { code, trustDevice: true } }));
  assert.equal(database.session.length, 0);
  const verified = await auth.api.verifyTwoFactorOTP({ headers, body: { code } });
  assert.ok(verified.token);
  await assert.rejects(auth.api.verifyTwoFactorOTP({ headers, body: { code } }));
  const again = await auth.api.signInEmail({ body: credentials });
  assert.equal(again.twoFactorRedirect, true);
  for (const path of ['disable', 'enable', 'verify-totp', 'verify-backup-code']) {
    const response = await auth.handler(new Request(`http://localhost:3000/api/auth/two-factor/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body: JSON.stringify({ password: credentials.password, code }),
    }));
    assert.equal(response.status, 404);
  }
});

test('resend replaces codes, expiry and attempt limits prevent login', async () => {
  const { auth, headers, loginCodes, database } = await pendingLogin();
  await auth.api.sendTwoFactorOTP({ headers, body: {} });
  const first = database.verification.find(row => row.identifier.startsWith('2fa-otp-'));
  await auth.api.sendTwoFactorOTP({ headers, body: {} });
  assert.ok(!database.verification.some(row => row.id === first.id));
  const current = database.verification.find(row => row.identifier.startsWith('2fa-otp-'));
  assert.equal(database.verification.filter(row => row.identifier.startsWith('2fa-otp-')).length, 1);
  current.expiresAt = new Date(0);
  await assert.rejects(auth.api.verifyTwoFactorOTP({ headers, body: { code: loginCodes.at(-1).otp } }));
  await auth.api.sendTwoFactorOTP({ headers, body: {} });
  for (let i = 0; i < 5; i++) {
    await assert.rejects(auth.api.verifyTwoFactorOTP({ headers, body: { code: 'wrong' } }));
  }
  await assert.rejects(auth.api.verifyTwoFactorOTP({ headers, body: { code: loginCodes.at(-1).otp } }));
  assert.equal(database.session.length, 0);
});

test('delivery failures are reported without signing in, and expired challenges cannot send codes', async () => {
  const { auth, headers, database } = await pendingLogin({ failCodeDelivery: true });
  await assert.rejects(auth.api.sendTwoFactorOTP({ headers, body: {} }), /Unable to send the code/);
  assert.equal(database.session.length, 0);
  database.verification.find(row => row.identifier.startsWith('2fa-') && !row.identifier.startsWith('2fa-otp-')).expiresAt = new Date(0);
  await assert.rejects(auth.api.sendTwoFactorOTP({ headers, body: {} }), /sign in with your password again/);
});

test('HTTP resend endpoint enforces its one-minute rate limit', async () => {
  const { auth, headers, loginCodes } = await pendingLogin();
  const request = () => new Request('http://localhost:3000/api/auth/two-factor/send-otp', {
    method: 'POST', headers: {
      cookie: headers.get('cookie'), 'content-type': 'application/json',
      origin: 'http://localhost:3000', 'x-forwarded-for': '192.0.2.14',
    }, body: '{}',
  });
  assert.equal((await auth.handler(request())).status, 200);
  assert.equal((await auth.handler(request())).status, 429);
  assert.equal(loginCodes.length, 1);
});
