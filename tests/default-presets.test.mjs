import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as orm from 'drizzle-orm';
import * as core from 'drizzle-orm/pg-core';
import * as cuid2 from '@paralleldrive/cuid2';

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, Date, process: { env: {} }, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(source, context);
  return context.exports;
}

test('default presets belong to each new user and save both reminders atomically', async t => {
  const pg = new PGlite();
  t.after(() => pg.close());
  const schema = load('db/schema.ts', { 'drizzle-orm/pg-core': core, 'drizzle-orm': orm, '@paralleldrive/cuid2': cuid2 });
  const db = drizzle(pg);
  const actions = load('db/index.ts', {
    'dotenv/config': {}, 'drizzle-orm': orm, './schema': schema,
    'drizzle-orm/node-postgres': { drizzle: () => db },
    '@/lib/utils': { generateId: randomUUID },
    '@/lib/notification-schedule': {},
  });
  await pg.exec(`
    CREATE TABLE "user" (id text PRIMARY KEY);
    INSERT INTO "user" VALUES ('first'), ('second'), ('failed');
    CREATE TABLE notification_presets (id text PRIMARY KEY, user_id text REFERENCES "user"(id), name varchar(100),
      is_active_for_exams boolean DEFAULT false, is_active_for_assignments boolean DEFAULT false,
      activated_for_exams_at timestamp, activated_for_assignments_at timestamp,
      created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now());
    CREATE TABLE notification_times (id text PRIMARY KEY, preset_id text REFERENCES notification_presets(id),
      days_before integer, time varchar(5), created_at timestamp DEFAULT now());
  `);
  for (const userId of ['first', 'second']) {
    await actions.createDefaultNotificationPreset(userId);
    const presets = await actions.getNotificationPresets(userId);
    assert.equal(presets.length, 1);
    const [preset] = presets;
    assert.equal(preset.name, 'default');
    assert.equal(preset.isActiveForExams, true);
    assert.equal(preset.isActiveForAssignments, true);
    assert.ok(preset.activatedForExamsAt instanceof Date);
    assert.ok(preset.activatedForAssignmentsAt instanceof Date);
    const times = await actions.getNotificationTimes(preset.id);
    assert.deepEqual(times.map(({ daysBefore, time }) => ({ daysBefore, time })).sort((a, b) => a.daysBefore - b.daysBefore), [
      { daysBefore: 1, time: '18:00' },
      { daysBefore: 2, time: '17:00' },
    ]);
  }
  await pg.exec(`ALTER TABLE notification_times ADD CONSTRAINT reject_new_times CHECK (days_before < 2) NOT VALID`);
  await assert.rejects(actions.createDefaultNotificationPreset('failed'));
  assert.equal((await actions.getNotificationPresets('failed')).length, 0);
  assert.equal((await pg.query('SELECT * FROM notification_times')).rows.length, 4);
});
