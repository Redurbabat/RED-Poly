import test from "node:test";
import assert from "node:assert/strict";

import {
  PROGRESS_STORAGE_KEY, RESTORE_CHECKPOINT_KEY,
  migrateProgressData, createProgressBackup, parseProgressBackup,
} from "../src/lib/progress-data.mjs";
import { createProgressWriteGuard } from "../src/lib/progress-write-guard.mjs";
import {
  exportVerifiedProgressBackup, restoreVerifiedProgressBackup,
} from "../src/lib/progress-transfer.mjs";

const initial = () => migrateProgressData({
  streak: 6, activeCourseId: "es-en", dailyXp: 15,
  onboardingDone: true, lastActiveDay: "2026-11-16",
  courses: {
    "es-en": {
      xp: 145, completedLessons: { lesson1: true }, mistakes: [],
      wordStats: { hola: { correct: 2, wrong: 1, lastSeen: 300 } },
      srs: { hola: { interval: 2, ease: 2.5, dueAt: 8000, streak: 2 } },
    },
  },
}, 0);

function device({ empty = false } = {}) {
  let live = initial();
  let hydrated = true;
  const original = JSON.stringify({ version: 1, state: live });
  const disk = new Map(empty ? [] : [[PROGRESS_STORAGE_KEY, original]]);
  const writes = [];
  const guard = createProgressWriteGuard();
  const storage = {
    async getItem(k) { return disk.get(k) ?? null; },
    async setItem(k, v) { writes.push({ k, v }); disk.set(k, v); },
    async removeItem(k) { writes.push({ k, remove: true }); disk.delete(k); },
  };
  const options = {
    storage, guard, isHydrated: () => hydrated, getState: () => live,
    async rehydrate() {
      const raw = disk.get(PROGRESS_STORAGE_KEY);
      if (raw !== undefined) {
        const parsed = JSON.parse(raw);
        live = migrateProgressData(parsed.state, parsed.version ?? 0);
      }
    },
  };
  return {
    options, original, disk, writes, guard,
    get live() { return live; },
    set live(v) { live = v; },
    set hydrated(v) { hydrated = v; },
  };
}

test("verified export returns on-disk progress with all XP and lesson history", async () => {
  const ctx = device();
  const exported = await exportVerifiedProgressBackup(ctx.options);
  assert.deepEqual(parseProgressBackup(exported).courses, ctx.live.courses);
  assert.equal(parseProgressBackup(exported).streak, 6);
  assert.deepEqual(ctx.writes, []);
});

test("verified export drains pending persistence writes and includes the newest XP", async () => {
  const ctx = device();
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  ctx.guard.trackWrite(pending);
  let finished = false;
  const exported = exportVerifiedProgressBackup(ctx.options).then((s) => {
    finished = true;
    return s;
  });
  await Promise.resolve();
  assert.equal(finished, false);
  assert.throws(() => ctx.guard.assertUnlocked(), /edits blocked during migration/);
  const newer = structuredClone(ctx.live);
  newer.courses["es-en"].xp = 200;
  ctx.live = newer;
  ctx.disk.set(PROGRESS_STORAGE_KEY, JSON.stringify({ version: 1, state: newer }));
  finish();
  const json = await exported;
  assert.equal(parseProgressBackup(json).courses["es-en"].xp, 200);
  ctx.guard.assertUnlocked();
});

test("unpersisted progress cannot be silently exported or overwritten", async () => {
  const ctx = device();
  ctx.live = { ...ctx.live, streak: 99 };
  await assert.rejects(exportVerifiedProgressBackup(ctx.options),
    /in-memory edits differ/);
  await assert.rejects(restoreVerifiedProgressBackup(createProgressBackup(initial()), ctx.options),
    /in-memory edits differ/);
  assert.equal(ctx.disk.get(PROGRESS_STORAGE_KEY), ctx.original);
  assert.equal(ctx.writes.length, 0);
  ctx.guard.assertUnlocked();
});

test("guarded restore updates disk and rehydrates the app before unlocking", async () => {
  const ctx = device();
  const replacement = structuredClone(ctx.live);
  replacement.streak = 20;
  replacement.courses["es-en"].xp = 777;
  const backup = createProgressBackup(replacement);
  const originalRehydrate = ctx.options.rehydrate;
  ctx.options.rehydrate = async () => {
    assert.throws(() => ctx.guard.assertUnlocked(), /edits blocked/);
    await originalRehydrate();
  };
  await restoreVerifiedProgressBackup(backup, ctx.options);
  assert.equal(ctx.disk.get(RESTORE_CHECKPOINT_KEY), ctx.original);
  assert.equal(ctx.live.courses["es-en"].xp, 777);
  assert.equal(ctx.live.streak, 20);
  assert.equal(JSON.parse(ctx.disk.get(PROGRESS_STORAGE_KEY)).state.courses["es-en"].xp, 777);
  ctx.guard.assertUnlocked();
});

test("bad backup, unhydrated app and missing on-disk export are rejected without writes", async () => {
  const ctx = device();
  await assert.rejects(restoreVerifiedProgressBackup("not json", ctx.options),
    /invalid backup JSON/);
  ctx.hydrated = false;
  await assert.rejects(exportVerifiedProgressBackup(ctx.options), /finish loading first/);
  await assert.rejects(restoreVerifiedProgressBackup(createProgressBackup(initial()), ctx.options),
    /finish loading first/);
  assert.equal(ctx.writes.length, 0);
  const empty = device({ empty: true });
  await assert.rejects(exportVerifiedProgressBackup(empty.options),
    /no saved progress is available/);
  assert.equal(empty.writes.length, 0);
});

test("guarded restore on a fresh install can accept a valid external backup", async () => {
  const ctx = device({ empty: true });
  const replacement = initial();
  replacement.courses["es-en"].xp = 888;
  await restoreVerifiedProgressBackup(createProgressBackup(replacement), ctx.options);
  assert.equal(ctx.live.courses["es-en"].xp, 888);
  assert.equal(JSON.parse(ctx.disk.get(PROGRESS_STORAGE_KEY)).state.streak, 6);
  ctx.guard.assertUnlocked();
});

test("restore rolls disk and memory back if app rehydration fails", async () => {
  const ctx = device();
  const replacement = initial();
  replacement.streak = 30;
  let tries = 0;
  const good = ctx.options.rehydrate;
  ctx.options.rehydrate = async () => {
    if (++tries === 1) throw new Error("simulated hydration failure");
    await good();
  };
  await assert.rejects(restoreVerifiedProgressBackup(
    createProgressBackup(replacement), ctx.options), /simulated hydration failure/);
  assert.equal(ctx.disk.get(PROGRESS_STORAGE_KEY), ctx.original);
  assert.equal(ctx.disk.get(RESTORE_CHECKPOINT_KEY), ctx.original);
  assert.equal(ctx.live.streak, 6);
  ctx.guard.assertUnlocked();
});

test("late disk mutation aborts restore at the final commit fence without clobbering XP", async () => {
  const ctx = device();
  let reads = 0;
  const rawGet = ctx.options.storage.getItem;
  ctx.options.storage.getItem = async (key) => {
    if (key === PROGRESS_STORAGE_KEY && ++reads === 2) {
      const mutated = structuredClone(ctx.live);
      mutated.courses["es-en"].xp = 999;
      ctx.disk.set(PROGRESS_STORAGE_KEY, JSON.stringify({ version: 1, state: mutated }));
    }
    return rawGet(key);
  };
  await assert.rejects(restoreVerifiedProgressBackup(
    createProgressBackup(initial()), ctx.options), /progress changed during import/);
  assert.equal(JSON.parse(ctx.disk.get(PROGRESS_STORAGE_KEY)).state.courses["es-en"].xp, 999);
  assert.equal(ctx.writes.length, 0);
  ctx.guard.assertUnlocked();
});
