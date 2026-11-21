import test from "node:test";
import assert from "node:assert/strict";
import { createProgressWriteGuard } from "../src/lib/progress-write-guard.mjs";

test("migration lock blocks built-in progress edits until released", async () => {
  const guard = createProgressWriteGuard();
  guard.assertUnlocked();
  const release = await guard.acquire();
  assert.throws(() => guard.assertUnlocked(), /edits blocked during migration/);
  await assert.rejects(guard.acquire(), /edits blocked during migration/);
  release();
  release();
  guard.assertUnlocked();
  const unlock = await guard.acquire();
  unlock();
});

test("migration waits for pending persistence writes before becoming ready", async () => {
  const guard = createProgressWriteGuard();
  let finishWrite;
  const pendingWrite = new Promise((resolve) => { finishWrite = resolve; });
  const tracked = guard.trackWrite(pendingWrite);
  let ready = false;
  const acquired = guard.acquire().then((release) => {
    ready = true;
    return release;
  });
  // An in-progress drain still blocks new edits.
  assert.throws(() => guard.assertUnlocked(), /edits blocked during migration/);
  await Promise.resolve();
  assert.equal(ready, false);
  finishWrite();
  await tracked;
  const release = await acquired;
  assert.equal(ready, true);
  release();
  guard.assertUnlocked();
});

test("failed storage write aborts migration and releases the lock", async () => {
  const guard = createProgressWriteGuard();
  const failure = new Error("disk failed");
  await assert.rejects(guard.trackWrite(Promise.reject(failure)), /disk failed/);
  await assert.rejects(guard.acquire(), /an earlier save failed/);
  guard.assertUnlocked();
  await assert.rejects(guard.acquire(), /an earlier save failed/);
});

test("a successful batch of writes is drained without losing results", async () => {
  const guard = createProgressWriteGuard();
  const events = [];
  const writeOne = guard.trackWrite(Promise.resolve().then(() => {
    events.push("one");
    return 1;
  }));
  const writeTwo = guard.trackWrite(Promise.resolve().then(() => {
    events.push("two");
    return 2;
  }));
  const release = await guard.acquire();
  assert.deepEqual(await Promise.all([writeOne, writeTwo]), [1, 2]);
  assert.deepEqual(events, ["one", "two"]);
  assert.throws(() => guard.assertUnlocked(), /edits blocked/);
  release();
  guard.assertUnlocked();
});


test("guard drains saves submitted while migration already holds its lock", async () => {
  const guard = createProgressWriteGuard();
  const release = await guard.acquire();
  let finishWrite;
  const delayed = new Promise((resolve) => { finishWrite = resolve; });
  let completed = false;
  guard.trackWrite(delayed);
  const draining = guard.drain().then(() => { completed = true; });
  await Promise.resolve();
  assert.equal(completed, false);
  assert.throws(() => guard.assertUnlocked(), /edits blocked/);
  finishWrite();
  await draining;
  assert.equal(completed, true);
  release();
  guard.assertUnlocked();
});

test("draining is only allowed during an active migration lock", async () => {
  const guard = createProgressWriteGuard();
  await assert.rejects(guard.drain(), /requires an active migration lock/);
  const release = await guard.acquire();
  await guard.drain();
  release();
});


test("a failed save cannot release the lock while another pending save is still running", async () => {
  const guard = createProgressWriteGuard();
  let finishSlow;
  const slow = new Promise((resolve) => { finishSlow = resolve; });
  const badWrite = guard.trackWrite(Promise.reject(new Error("write failed")));
  const slowWrite = guard.trackWrite(slow);
  let settled = false;
  const acquisition = guard.acquire().then(
    () => { settled = true; },
    () => { settled = true; },
  );
  await assert.rejects(badWrite, /write failed/);
  await Promise.resolve();
  assert.equal(settled, false);
  assert.throws(() => guard.assertUnlocked(), /edits blocked/);
  finishSlow();
  await slowWrite;
  await acquisition;
  assert.equal(settled, true);
  guard.assertUnlocked();
  await assert.rejects(guard.acquire(), /an earlier save failed/);
});
