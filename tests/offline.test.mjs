import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { randomUUID } from "node:crypto";

function load(file, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const context = {
    exports: {},
    structuredClone,
    Date,
    crypto: { randomUUID },
    ...globals,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  };
  vm.runInNewContext(source, context);
  return context.exports;
}
const model = load("lib/offline/model.ts");
function snapshot(userId = "alice") {
  return {
    user: { id: userId, role: "pro", name: "Alice" },
    savedAt: new Date(),
    className: "1A",
    hasAssignmentsPermission: true,
    exams: [{ id: 1, dueDate: new Date(Date.now() + 86400000) }],
    assignments: [{ id: 2, dueDate: new Date(Date.now() + 86400000) }],
    presets: [],
    limits: { presets: 5, timesPerPreset: 7 },
    examPreferences: [],
    assignmentPreferences: [],
    notifications: [],
  };
}
function fixture() {
  let disk = { snapshot: snapshot(), queue: [] };
  let server = snapshot();
  let responseError;
  let loseResponse = false;
  let failStorage = false;
  const calls = [];
  const navigator = {
    onLine: false,
    locks: { request: async (_key, work) => work() },
  };
  const storage = {
    readSavedState: async () => structuredClone(disk),
    writeSavedState: async (value) => {
      if (failStorage) throw new Error("Quota");
      disk = structuredClone(value);
    },
  };
  const actions = {
    getOfflineSnapshotAction: async () => ({
      snapshot: structuredClone(server),
    }),
    syncNotificationChangeAction: async (userId, change) => {
      calls.push({ userId, change });
      if (responseError) return { error: responseError };
      server = model.applyChange(server, change);
      if (loseResponse) {
        loseResponse = false;
        throw new Error("Connection lost after commit");
      }
      return { success: true };
    },
  };
  const client = () =>
    load(
      "lib/offline/store.ts",
      {
        react: { useSyncExternalStore() {} },
        "@/lib/actions/offline": actions,
        "./model": model,
        "./storage": storage,
      },
      { navigator },
    );
  return {
    client,
    navigator,
    calls,
    disk: () => disk,
    server: () => server,
    reject: (value) => {
      responseError = value;
    },
    loseResponse: () => {
      loseResponse = true;
    },
    failStorage: () => {
      failStorage = true;
    },
    switchAccount: () => {
      server = snapshot("bob");
    },
  };
}

test("offline presets, times and event choices survive a fresh client and synchronize in order", async () => {
  const f = fixture();
  const client = f.client();
  const id = randomUUID();
  const timeId = randomUUID();
  for (const change of [
    { kind: "createPreset", id, name: "Morning" },
    { kind: "addTime", id: timeId, presetId: id, daysBefore: 1, time: "08:15" },
    { kind: "apply", target: "exams", itemId: 1, presetId: id },
    { kind: "apply", target: "assignments", itemId: 2, presetId: id },
  ])
    assert.equal((await client.queueChange(change)).success, true);
  const reloaded = f.client();
  await reloaded.initializeOffline();
  assert.equal(reloaded.getOfflineState().pending, 4);
  assert.equal(
    reloaded.getOfflineState().snapshot.presets[0].times[0].time,
    "08:15",
  );
  assert.equal(
    reloaded.getOfflineState().snapshot.examPreferences[0].presetId,
    id,
  );
  f.navigator.onLine = true;
  await reloaded.synchronizeOffline();
  assert.equal(f.disk().queue.length, 0);
  assert.deepEqual(
    f.calls.map((c) => c.change.kind),
    ["createPreset", "addTime", "apply", "apply"],
  );
  assert.equal(f.server().assignmentPreferences[0].presetId, id);
});

test("lost acknowledgements retain intent without duplicating optimistic records on retry", async () => {
  const f = fixture();
  const client = f.client();
  const id = randomUUID();
  await client.queueChange({ kind: "createPreset", id, name: "Morning" });
  f.navigator.onLine = true;
  f.loseResponse();
  await client.synchronizeOffline();
  assert.equal(f.disk().queue.length, 1);
  assert.equal(f.server().presets.length, 1);
  await client.synchronizeOffline();
  assert.equal(client.getOfflineState().snapshot.presets.length, 1);
  assert.equal(client.getOfflineState().pending, 0);
});

test("server rejection retains the failed change and its dependents for retry or explicit discard", async () => {
  const f = fixture();
  const client = f.client();
  const id = randomUUID();
  await client.queueChange({ kind: "createPreset", id, name: "Morning" });
  await client.queueChange({
    kind: "addTime",
    id: randomUUID(),
    presetId: id,
    daysBefore: 1,
    time: "08:15",
  });
  f.navigator.onLine = true;
  f.reject("Plan limit reached");
  await client.synchronizeOffline();
  assert.equal(f.disk().queue.length, 2);
  assert.equal(client.getOfflineState().error, "Plan limit reached");
  assert.equal(f.calls.length, 1);
  f.reject(undefined);
  await client.discardPendingChanges();
  assert.equal(f.disk().queue.length, 0);
  assert.equal(client.getOfflineState().snapshot.presets.length, 0);
});

test("pending edits are never replayed under a different account; logout clears the local copy", async () => {
  const f = fixture();
  const client = f.client();
  await client.queueChange({
    kind: "createPreset",
    id: randomUUID(),
    name: "Private",
  });
  f.switchAccount();
  f.navigator.onLine = true;
  await client.synchronizeOffline();
  assert.equal(f.calls.length, 0);
  assert.equal(client.getOfflineState().snapshot.user.id, "bob");
  assert.equal(client.getOfflineState().snapshot.presets.length, 0);
  await client.clearOfflineData();
  assert.equal(f.disk(), null);
  assert.equal(client.getOfflineState().snapshot, null);
});

test("failed durable storage does not acknowledge an edit or display it as saved", async () => {
  const f = fixture();
  const client = f.client();
  await client.initializeOffline();
  f.failStorage();
  const result = await client.queueChange({
    kind: "createPreset",
    id: randomUUID(),
    name: "Morning",
  });
  assert.match(result.error, /Could not save/);
  assert.equal(client.getOfflineState().pending, 0);
  assert.equal(client.getOfflineState().snapshot.presets.length, 0);
});

test("local validation enforces downloaded plan limits and notification time bounds", () => {
  let data = snapshot();
  data.limits.presets = 1;
  data = model.applyChange(data, {
    kind: "createPreset",
    id: "preset",
    name: "Morning",
  });
  assert.match(
    model.validateChange(data, {
      kind: "createPreset",
      id: "another",
      name: "Evening",
    }),
    /limit/,
  );
  for (const [daysBefore, time] of [
    [15, "09:00"],
    [-1, "09:00"],
    [1, "25:00"],
    [1, "12:99"],
  ]) {
    assert.match(
      model.validateChange(data, {
        kind: "addTime",
        id: "time",
        presetId: "preset",
        daysBefore,
        time,
      }),
      /valid time/,
    );
  }
  data.hasAssignmentsPermission = false;
  assert.match(
    model.validateChange(data, {
      kind: "apply",
      target: "assignments",
      itemId: 2,
      presetId: "preset",
    }),
    /plan/,
  );
});

test("sync rejects a mismatched account and assignment access before any mutation", async () => {
  const calls = [];
  const { syncNotificationChangeAction } = load("lib/actions/offline.ts", {
    "next/headers": { headers: async () => ({}) },
    "@/lib/auth": {
      auth: {
        api: {
          getSession: async () => ({ user: { id: "bob" } }),
          userHasPermission: async () => ({ success: false }),
        },
      },
    },
    "@/db": {},
    "@/lib/actions/notifications": {
      createPresetAction: async () => calls.push("create"),
    },
  });
  assert.match(
    (
      await syncNotificationChangeAction("alice", {
        kind: "createPreset",
        id: randomUUID(),
        name: "Morning",
      })
    ).error,
    /original account/,
  );
  assert.match(
    (
      await syncNotificationChangeAction("bob", {
        kind: "apply",
        target: "assignments",
        itemId: 1,
        presetId: "preset",
      })
    ).error,
    /plan/,
  );
  assert.equal(calls.length, 0);
});

test("server retries return an existing preset or time before checking plan limits", async () => {
  const id = randomUUID();
  const { createPresetAction, addNotificationTimeAction } = load(
    "lib/actions/notifications.ts",
    {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": {
        auth: {
          api: {
            getSession: async () => ({ user: { id: "alice", role: "free" } }),
          },
        },
      },
      "@/db": {
        getNotificationPresetById: async () => ({ id }),
        getNotificationTimes: async () => [{ id, time: "09:00" }],
        countUserPresets: () => assert.fail("Must return before limit check"),
        countPresetNotificationTimes: () =>
          assert.fail("Must return before limit check"),
      },
    },
  );
  assert.equal((await createPresetAction("Morning", id)).preset.id, id);
  assert.equal(
    (await addNotificationTimeAction("preset", 1, "09:00", id)).notificationTime
      .id,
    id,
  );
});

test("service worker caches the complete public shell, falls back for app navigations, and leaves private requests alone", async () => {
  const handlers = new Map();
  const entries = new Map();
  let connected = true;
  const cache = {
    match: async (key) => entries.get(typeof key === "string" ? key : key.url),
    put: async (key, value) =>
      entries.set(typeof key === "string" ? key : key.url, value),
    add: async (key) => entries.set(key, new Response("font")),
  };
  const html =
    '<script src="/_next/static/app.js"></script><link href="/_next/static/app.css">';
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://example.test" },
      addEventListener: (event, fn) => handlers.set(event, fn),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => cache,
      match: cache.match,
      keys: async () => [],
    },
    URL,
    Response,
    fetch: async (request) => {
      if (!connected) throw new Error("Offline");
      return new Response(
        request === "/offline"
          ? html
          : request.endsWith(".css")
            ? "body { font-family: sans-serif }"
            : "script",
      );
    },
  });
  let install;
  handlers.get("install")({
    waitUntil: (work) => {
      install = work;
    },
  });
  await install;
  assert.ok(entries.has("/_next/static/app.js"));
  assert.ok(entries.has("/_next/static/app.css"));
  assert.ok(entries.has("/offline"));
  connected = false;
  let response;
  handlers.get("fetch")({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://example.test/app/exams/all?page=2",
    },
    respondWith: (work) => {
      response = work;
    },
  });
  assert.equal(await (await response).text(), html);
  for (const request of [
    { method: "POST", url: "https://example.test/app/notifications" },
    { method: "GET", url: "https://example.test/api/auth/get-session" },
    { method: "GET", url: "https://example.test/app?_rsc=private" },
    { method: "GET", url: "https://other.test/_next/static/script.js" },
  ])
    handlers.get("fetch")({
      request,
      respondWith: () =>
        assert.fail("Must not intercept private or cross-origin requests"),
    });
});
