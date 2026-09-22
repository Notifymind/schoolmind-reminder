import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chromium } from "@playwright/test";

// Uses synthetic browser data and a server with no production database access.
// Stop the server itself: browser offline emulation alone can leave SW fetches online.
test(
  "cached app supports offline edits, reloads, pagination, and mobile navigation",
  { timeout: 120_000 },
  async (t) => {
    const port = 3179;
    const origin = `http://localhost:${port}`;
    const server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
      {
        env: {
          ...process.env,
          DATABASE_URL: "postgresql://localhost/notifymind_offline_test",
          BETTER_AUTH_SECRET: "offline-browser-test-secret-not-for-production",
          BETTER_AUTH_URL: origin,
        },
        stdio: "ignore",
      },
    );
    t.after(() => {
      if (server.exitCode === null) server.kill();
    });
    let started = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null)
        throw new Error(
          "Test server exited. Run a production build first and free port 3179.",
        );
      try {
        if ((await fetch(origin)).ok) {
          started = true;
          break;
        }
      } catch {
        /* Server is starting. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(started, "Production server started");
    const browser = await chromium.launch({ headless: true });
    t.after(() => browser.close());
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      const event = (id, title) => ({
        id,
        className: "1A",
        subject: "Math",
        title,
        date: "Tomorrow",
        time: "10:00",
        type: null,
        description: "Saved description",
        dueDate: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });
      const snapshot = {
        user: {
          id: "offline-browser-test",
          name: "Offline Tester",
          email: "offline@example.test",
          role: "pro",
          image: null,
          class: "1A",
        },
        savedAt: new Date(),
        className: "1A",
        hasAssignmentsPermission: true,
        exams: Array.from({ length: 12 }, (_, i) =>
          event(i + 1, `Offline exam ${i + 1}`),
        ),
        assignments: [event(20, "Offline assignment")],
        presets: [],
        limits: { presets: 5, timesPerPreset: 7 },
        examPreferences: [],
        assignmentPreferences: [],
        notifications: [],
      };
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("notifymind-offline-v1", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("state");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const tx = request.result.transaction("state", "readwrite");
          tx.objectStore("state").put({ snapshot, queue: [] }, "current");
          tx.oncomplete = () => {
            request.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });
    const exited = once(server, "exit");
    server.kill();
    await exited;
    await context.setOffline(true);
    await page.goto(`${origin}/app/exams`);
    await page
      .getByText("Notifications are unavailable while offline.", {
        exact: false,
      })
      .waitFor();
    await page
      .getByRole("heading", { name: "Offline exam 1", exact: true })
      .waitFor();

    await page.goto(`${origin}/app/notifications`);
    for (const name of ["Morning offline", "Evening offline"]) {
      await page.getByLabel("Preset Name", { exact: true }).fill(name);
      await page.getByRole("button", { name: "Create", exact: true }).click();
      await page.getByText(name, { exact: true }).waitFor();
    }
    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Evening offline" });
    await card.getByRole("button", { name: "Add notification time" }).click();
    await page.getByRole("button", { name: "Next: choose time" }).click();
    await page.getByRole("button", { name: "Add reminder" }).click();
    await card.getByText("09:00", { exact: true }).waitFor();
    await page.reload();
    await card.getByText("09:00", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Enable Notifications", exact: true })
        .isDisabled(),
      true,
    );

    await page.goto(`${origin}/app/exams/all?page=2`);
    await page
      .getByRole("heading", { name: "Offline exam 11", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await page
      .getByRole("heading", { name: "Offline exam 1", exact: true })
      .waitFor();
    await page
      .getByRole("button", {
        name: "Notification settings for Offline exam 1",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitemradio", { name: "Evening offline", exact: true })
      .click();
    await page
      .getByText("4 changes saved on this device.", { exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", {
        name: "Notification settings for Offline exam 1",
        exact: true,
      })
      .click();
    assert.equal(
      await page
        .getByRole("menuitemradio", { name: "Evening offline", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .locator("nav")
      .getByRole("link", { name: "Assignments", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Offline assignment", exact: true })
      .waitFor();
    await page
      .getByRole("button", {
        name: "Notification settings for Offline assignment",
      })
      .click();
    await page
      .getByRole("menuitemradio", { name: "Evening offline", exact: true })
      .click();
    await page
      .getByText("5 changes saved on this device.", { exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", {
        name: "Notification settings for Offline assignment",
      })
      .click();
    assert.equal(
      await page
        .getByRole("menuitemradio", { name: "Evening offline", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    const queuedKinds = await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("notifymind-offline-v1", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const read = request.result
              .transaction("state")
              .objectStore("state")
              .get("current");
            read.onsuccess = () => {
              request.result.close();
              resolve(read.result.queue.map((entry) => entry.change.kind));
            };
          };
        }),
    );
    assert.deepEqual(queuedKinds, [
      "createPreset",
      "createPreset",
      "addTime",
      "apply",
      "apply",
    ]);
    assert.deepEqual(errors, []);
  },
);
