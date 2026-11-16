import test from "node:test";
import assert from "node:assert/strict";

import { createProgressWriteGuard } from "../src/lib/progress-write-guard.mjs";
import { createSerializedProgressStorage } from "../src/lib/progress-storage.mjs";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("newer lesson XP stays on disk even if the earlier write is slow", async () => {
  const firstWrite = deferred();
  const calls = [];
  const disk = new Map();
  const guard = createProgressWriteGuard();
  const storage = createSerializedProgressStorage({
    async getItem(key) { return disk.get(key) ?? null; },
    async setItem(key, value) {
      calls.push(value);
      if (value === "xp:15") await firstWrite.promise;
      disk.set(key, value);
    },
    async removeItem(key) { disk.delete(key); },
  }, guard);

  const older = storage.setItem("progress-v2", "xp:15");
  const newer = storage.setItem("progress-v2", "xp:30");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(calls, ["xp:15"], "newer write must not overtake older write");
  firstWrite.resolve();
  await Promise.all([older, newer]);
  assert.deepEqual(calls, ["xp:15", "xp:30"]);
  assert.equal(await storage.getItem("progress-v2"), "xp:30");
});

test("migration waits for the entire queued write sequence", async () => {
  const firstWrite = deferred();
  const disk = new Map();
  const guard = createProgressWriteGuard();
  const storage = createSerializedProgressStorage({
    async getItem(key) { return disk.get(key) ?? null; },
    async setItem(key, value) {
      if (value === "old") await firstWrite.promise;
      disk.set(key, value);
    },
    async removeItem(key) { disk.delete(key); },
  }, guard);
  const a = storage.setItem("progress-v2", "old");
  const b = storage.setItem("progress-v2", "new");
  let acquired = false;
  const locked = guard.acquire().then((release) => { acquired = true; return release; });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(acquired, false);
  assert.throws(() => guard.assertUnlocked(), /edits blocked/);
  firstWrite.resolve();
  await Promise.all([a, b]);
  const release = await locked;
  assert.equal(acquired, true);
  assert.equal(await storage.getItem("progress-v2"), "new");
  release();
  guard.assertUnlocked();
});

test("removeItem cannot overtake an earlier persist write", async () => {
  const firstWrite = deferred();
  const disk = new Map();
  const calls = [];
  const storage = createSerializedProgressStorage({
    async getItem(key) { return disk.get(key) ?? null; },
    async setItem(key, value) {
      calls.push("set");
      await firstWrite.promise;
      disk.set(key, value);
    },
    async removeItem(key) { calls.push("remove"); disk.delete(key); },
  }, createProgressWriteGuard());
  const save = storage.setItem("progress-v2", "data");
  const remove = storage.removeItem("progress-v2");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(calls, ["set"]);
  firstWrite.resolve();
  await Promise.all([save, remove]);
  assert.deepEqual(calls, ["set", "remove"]);
  assert.equal(await storage.getItem("progress-v2"), null);
});

test("failed save never deadlocks the queue, and migration still reports failure", async () => {
  const guard = createProgressWriteGuard();
  const disk = new Map();
  const storage = createSerializedProgressStorage({
    async getItem(key) { return disk.get(key) ?? null; },
    async setItem(key, value) {
      if (value === "broken") throw new Error("simulated disk fault");
      disk.set(key, value);
    },
    async removeItem(key) { disk.delete(key); },
  }, guard);
  const failed = storage.setItem("progress-v2", "broken");
  const next = storage.setItem("progress-v2", "recovered");
  await assert.rejects(failed, /simulated disk fault/);
  await next;
  assert.equal(await storage.getItem("progress-v2"), "recovered");
  await assert.rejects(guard.acquire(), /an earlier save failed/);
  guard.assertUnlocked();
});
