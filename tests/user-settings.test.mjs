import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as orm from 'drizzle-orm';
import * as core from 'drizzle-orm/pg-core';
import * as cuid2 from '@paralleldrive/cuid2';

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
const settings = load('lib/user-settings.ts');

test('countdown bands include both endpoints and use calendar days across DST', () => {
  for (const [days, band] of [[-1, 'past'], [0, 'today'], [1, 'tomorrow'], [2, 'soon'], [3, 'soon'], [4, 'thisWeek'], [7, 'thisWeek'], [8, 'later'], [365, 'later']]) {
    assert.equal(settings.countdownBand(days), band);
  }
  const previous = process.env.TZ;
  process.env.TZ = 'Europe/Berlin';
  try {
    const tomorrow = settings.getDaysInfo(new Date(2026, 2, 30, 9), new Date(2026, 2, 29, 23));
    assert.equal(tomorrow.days, 1);
    assert.equal(tomorrow.text, 'Tomorrow');
    assert.equal(settings.getDaysInfo(new Date(2026, 9, 26), new Date(2026, 9, 25)).days, 1);
    assert.equal(settings.getDaysInfo(new Date(2026, 2, 29), new Date(2026, 2, 30)).text, '1 day ago');
    assert.equal(settings.getDaysInfo(null), null);
    assert.equal(settings.getDaysInfo('invalid'), null);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('aliases validate unique exact names and colors accept only the palette', () => {
  const aliases = [{ subject: 'MATH', alias: 'Mathematics' }];
  assert.equal(settings.validSubjectAliases(aliases), true);
  assert.equal(settings.subjectDisplayName('MATH', aliases), 'Mathematics');
  assert.equal(settings.subjectDisplayName('Math', aliases), 'Math');
  assert.equal(settings.subjectDisplayName(null, aliases), 'No subject');
  for (const invalid of [null, {}, [null], [...aliases, ...aliases], [{ subject: '', alias: 'x' }], [{ subject: 'MATH', alias: ' ' }], [{ subject: 'MATH', alias: 'x'.repeat(101) }]]) {
    assert.equal(settings.validSubjectAliases(invalid), false);
  }
  assert.equal(settings.validCountdownColors(settings.defaultCountdownColors), true);
  for (const invalid of [null, [], {}, { ...settings.defaultCountdownColors, today: '__proto__' }, { ...settings.defaultCountdownColors, today: '#ffffff' }]) {
    assert.equal(settings.validCountdownColors(invalid), false);
  }
});

test('settings migration supports isolated, idempotent saves and account deletion', async t => {
  const pg = new PGlite();
  t.after(() => pg.close());
  await pg.exec('CREATE TABLE "user" (id text PRIMARY KEY); INSERT INTO "user" VALUES (\'alice\'), (\'bob\');');
  await pg.exec(fs.readFileSync('drizzle/0016_user_settings.sql', 'utf8'));
  await pg.exec(fs.readFileSync('drizzle/0017_hidden_subjects.sql', 'utf8'));
  const schema = load('db/schema.ts', { 'drizzle-orm/pg-core': core, 'drizzle-orm': orm, '@paralleldrive/cuid2': cuid2 });
  const api = load('db/user-settings.ts', {
    'drizzle-orm': orm, '@/db': { db: drizzle(pg) }, '@/db/schema': schema, '@/lib/user-settings': settings,
  });
  const aliases = [{ subject: 'MATH', alias: 'Mathematics' }];
  const colors = { ...settings.defaultCountdownColors, tomorrow: 'red' };
  await api.saveHiddenSubjects('alice', ['MATH']);
  await api.saveSubjectAliases('alice', aliases);
  await api.saveCountdownColors('alice', colors);
  await api.saveSubjectAliases('alice', aliases);
  assert.equal((await api.getUserSettings('alice')).subjectAliases[0].alias, 'Mathematics');
  assert.equal((await api.getUserSettings('alice')).countdownColors.tomorrow, 'red');
  assert.equal((await api.getUserSettings('alice')).hiddenSubjects[0], 'MATH');
  assert.equal((await api.getUserSettings('bob')).hiddenSubjects.length, 0);
  assert.equal((await api.getUserSettings('bob')).subjectAliases.length, 0);
  assert.equal((await api.getUserSettings('bob')).countdownColors.tomorrow, 'orange');
  await api.saveSubjectAliases('alice', []);
  assert.equal((await api.getUserSettings('alice')).countdownColors.tomorrow, 'red');
  await pg.exec('DELETE FROM "user" WHERE id = \'alice\'');
  assert.equal((await pg.query('SELECT * FROM user_settings')).rows.length, 0);
});

test('sync authenticates settings writes and rejects malformed payloads', async () => {
  const calls = [];
  const { syncNotificationChangeAction: sync } = load('lib/actions/offline.ts', {
    'next/headers': { headers: async () => ({}) },
    '@/lib/auth': { auth: { api: { getSession: async () => ({ user: { id: 'alice' } }) } } },
    '@/db': {}, '@/lib/actions/notifications': {}, '@/lib/user-settings': settings,
    '@/db/user-settings': {
      saveHiddenSubjects: async (...args) => calls.push(args),
      saveSubjectAliases: async (...args) => calls.push(args),
      saveCountdownColors: async (...args) => calls.push(args),
    },
  });
  assert.ok((await sync('bob', { kind: 'subjectAliases', value: [] })).error);
  assert.ok((await sync('alice', { kind: 'subjectAliases', value: [{ subject: 'MATH', alias: 42 }] })).error);
  assert.ok((await sync('alice', { kind: 'countdownColors', value: { today: 'red' } })).error);
  assert.ok((await sync('bob', { kind: 'hiddenSubjects', value: ['MATH'] })).error);
  assert.ok((await sync('alice', { kind: 'hiddenSubjects', value: ['MATH', 'MATH'] })).error);
  assert.equal(calls.length, 0);
  assert.ok((await sync('alice', { kind: 'subjectAliases', value: [{ subject: 'MATH', alias: 'Mathematics' }] })).success);
  assert.ok((await sync('alice', { kind: 'countdownColors', value: settings.defaultCountdownColors })).success);
  assert.ok((await sync('alice', { kind: 'hiddenSubjects', value: ['MATH'] })).success);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(([userId]) => userId === 'alice'));
});


test('hidden subjects filter before pagination and keep unnamed and other subjects visible', () => {
  const now = Date.now();
  const items = Array.from({ length: 25 }, (_, id) => ({ id, subject: id < 14 ? 'MATH' : 'SCIENCE', dueDate: new Date(now + (id + 1) * 1000) }));
  const first = settings.schoolEventPage(items, ['MATH'], true, 1, now);
  assert.equal(first.items.length, 10);
  assert.equal(first.totalPages, 2);
  assert.ok(first.items.every(item => item.subject === 'SCIENCE'));
  const last = settings.schoolEventPage(items, ['MATH'], true, 99, now);
  assert.equal(last.items.length, 1);
  assert.equal(last.currentPage, 2);
  assert.equal(settings.schoolEventPage(items, ['MATH', 'SCIENCE'], true, 2, now).items.length, 0);
  assert.equal(settings.visibleSubjectEvents([{subject:null}, {subject:'MATH'}, {subject:'Math'}], ['MATH']).length, 2);
  assert.equal(settings.schoolEventPage(items, [], true, 1, now).totalPages, 3);
  for (const value of [null, [null], [''], [' MATH'], ['MATH', 'MATH'], ['x'.repeat(201)]]) {
    assert.equal(settings.validHiddenSubjects(value), false);
  }
  assert.equal(settings.validHiddenSubjects(['MATH']), true);
});
