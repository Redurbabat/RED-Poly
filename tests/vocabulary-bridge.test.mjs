import test from "node:test";
import assert from "node:assert/strict";

import {
  migrateProgressData,
  createProgressBackup,
  restoreProgressBackupToStorage,
  PROGRESS_STORAGE_KEY,
  vocabularyReviewKey,
} from "../src/lib/progress-data.mjs";
import {
  mergeWordPeckerVocabulary,
  importWordPeckerVocabularyToStorage,
  WORDPECKER_LEGACY_STORAGE_KEY,
} from "../src/lib/vocabulary-bridge.mjs";

const legacyWord = (overrides = {}) => ({
  id: "w1", value: "hola", translation: "hello", example: "hola, amigo",
  createdAt: 100, updatedAt: 200, correct: 7, wrong: 2,
  review: { interval: 3, ease: 2.35, dueAt: 123456, streak: 2 },
  ...overrides,
});

const legacy = (overrides = {}) => ({
  version: 1,
  lists: [{
    id: "travel", title: "Travel", category: "Trips", courseId: "es-en",
    words: [legacyWord()],
  }],
  ...overrides,
});

const initial = () => migrateProgressData({
  activeCourseId: "fr-en", streak: 13, onboardingDone: true, dailyGoal: 20,
  courses: {
    "es-en": {
      xp: 135, completedLessons: { lessonOne: true }, mistakes: [],
      wordStats: { hola: { correct: 2, wrong: 1, lastSeen: 88 } },
      srs: { hola: { interval: 1, ease: 2.5, dueAt: 400, streak: 1 } },
    },
    "fr-en": {
      xp: 77, completedLessons: { firstFrenchLesson: true }, mistakes: [],
      wordStats: {}, srs: {},
    },
  },
}, 0);

test("legacy WordPecker list imports its words, metadata, counts and SRS", () => {
  const merged = mergeWordPeckerVocabulary(initial(), legacy());
  const item = merged.vocabularyLists[0];
  assert.equal(item.category, "Trips");
  assert.equal(item.targetCode, "es");
  assert.equal(item.nativeCode, "en");
  assert.deepEqual(item.words[0], {
    id: "w1", target: "hola", native: "hello", example: "hola, amigo",
    createdAt: 100, updatedAt: 200, source: "wordpecker",
  });
  const key = vocabularyReviewKey("travel", "w1");
  assert.deepEqual(merged.courses["es-en"].wordStats[key], {
    correct: 7, wrong: 2, lastSeen: 200,
  });
  assert.deepEqual(merged.courses["es-en"].srs[key], legacy().lists[0].words[0].review);
});

test("migration retains all existing XP, course lessons, streak and original SRS keys", () => {
  const before = initial();
  const after = mergeWordPeckerVocabulary(before, legacy());
  assert.equal(after.streak, 13);
  assert.equal(after.courses["es-en"].xp, 135);
  assert.equal(after.courses["fr-en"].xp, 77);
  assert.equal(after.courses["es-en"].completedLessons.lessonOne, true);
  assert.equal(after.courses["fr-en"].completedLessons.firstFrenchLesson, true);
  assert.deepEqual(after.courses["es-en"].srs.hola, before.courses["es-en"].srs.hola);
  assert.deepEqual(before.vocabularyLists, []); // Input was not mutated
  assert.equal(before.courses["es-en"].srs[vocabularyReviewKey("travel", "w1")], undefined);
});

test("repeated import is idempotent and never overwrites newer shared SRS progress", () => {
  const one = mergeWordPeckerVocabulary(initial(), legacy());
  const key = vocabularyReviewKey("travel", "w1");
  const updated = {
    ...one,
    courses: {
      ...one.courses,
      "es-en": {
        ...one.courses["es-en"],
        srs: { ...one.courses["es-en"].srs, [key]: { interval: 10, ease: 2.8, dueAt: 900000, streak: 5 } },
      },
    },
  };
  const twice = mergeWordPeckerVocabulary(updated, legacy());
  assert.deepEqual(twice.vocabularyLists, updated.vocabularyLists);
  assert.deepEqual(twice.courses, updated.courses);
});

test("new legacy words append without overwriting previously integrated reviews", () => {
  const first = mergeWordPeckerVocabulary(initial(), legacy());
  const more = legacy();
  more.lists[0].words.push(legacyWord({
    id: "w2", value: "adios", translation: "goodbye", correct: 1,
    review: undefined,
  }));
  const updated = mergeWordPeckerVocabulary(first, more);
  assert.equal(updated.vocabularyLists[0].words.length, 2);
  assert.equal(updated.courses["es-en"].wordStats[vocabularyReviewKey("travel", "w2")].correct, 1);
  assert.deepEqual(updated.courses["es-en"].srs[vocabularyReviewKey("travel", "w1")],
    first.courses["es-en"].srs[vocabularyReviewKey("travel", "w1")]);
  assert.equal(updated.courses["es-en"].xp, 135);
});

test("invalid and conflicting sources throw before touching the original state", () => {
  const existing = mergeWordPeckerVocabulary(initial(), legacy());
  const prior = JSON.stringify(existing);
  const cases = [
    { version: 2, lists: [] },
    { version: 1, lists: [{ ...legacy().lists[0], courseId: "bad" }] },
    { version: 1, lists: [{ ...legacy().lists[0], words: [legacyWord({ correct: -2 })] }] },
    { version: 1, lists: [{ ...legacy().lists[0], words: [legacyWord(), legacyWord()] }] },
    { version: 1, lists: [{ ...legacy().lists[0], words: [legacyWord({ value: "changed" })] }] },
    { version: 1, lists: [{ ...legacy().lists[0], courseId: "fr-en" }] },
  ];
  for (const bad of cases) {
    assert.throws(() => mergeWordPeckerVocabulary(existing, bad), /Invalid WordPecker migration/);
    assert.equal(JSON.stringify(existing), prior);
  }
});

test("simulated offline restart restores migrated lists, XP and SRS from progress-v2 bytes", async () => {
  const source = mergeWordPeckerVocabulary(initial(), legacy());
  const disk = new Map();
  const storage = {
    async getItem(key) { return disk.get(key) ?? null; },
    async setItem(key, value) { disk.set(key, value); },
    async removeItem(key) { disk.delete(key); },
  };
  await restoreProgressBackupToStorage(createProgressBackup(source), storage);
  // Offline app restart: read the exact persisted Zustand payload from storage.
  const raw = JSON.parse(await storage.getItem(PROGRESS_STORAGE_KEY));
  const rehydrated = migrateProgressData(raw.state, raw.version);
  assert.equal(rehydrated.courses["es-en"].xp, 135);
  assert.equal(rehydrated.streak, 13);
  assert.equal(rehydrated.vocabularyLists[0].words[0].example, "hola, amigo");
  assert.deepEqual(rehydrated.courses["es-en"].srs[vocabularyReviewKey("travel", "w1")],
    legacy().lists[0].words[0].review);
  assert.equal(rehydrated.courses["fr-en"].xp, 77);
});

function makeStorage(overrides = {}) {
  const original = JSON.stringify({ version: 1, state: initial() });
  const legacyRaw = JSON.stringify(legacy());
  const disk = new Map([
    [PROGRESS_STORAGE_KEY, original],
    [WORDPECKER_LEGACY_STORAGE_KEY, legacyRaw],
  ]);
  const operations = [];
  const storage = {
    async getItem(key) { return disk.get(key) ?? null; },
    async setItem(key, value) { operations.push({ key, value }); disk.set(key, value); },
    async removeItem(key) { operations.push({ key, remove: true }); disk.delete(key); },
    ...overrides,
  };
  return { original, legacyRaw, disk, operations, storage };
}

test("verified storage import commits WordPecker lists without touching legacy bytes", async () => {
  const { original, legacyRaw, disk, operations, storage } = makeStorage();
  const result = await importWordPeckerVocabularyToStorage(storage);
  assert.deepEqual(result, { listsAdded: 1, wordsAdded: 1 });
  assert.equal(disk.get(WORDPECKER_LEGACY_STORAGE_KEY), legacyRaw);
  assert.equal(operations.some((x) => x.key === WORDPECKER_LEGACY_STORAGE_KEY), false);
  assert.equal(disk.get("progress-v2-restore-checkpoint"), original);
  const raw = JSON.parse(disk.get(PROGRESS_STORAGE_KEY));
  assert.equal(raw.state.courses["es-en"].xp, 135);
  assert.equal(raw.state.courses["fr-en"].xp, 77);
  assert.equal(raw.state.streak, 13);
  assert.equal(raw.state.vocabularyLists[0].words[0].target, "hola");
  assert.deepEqual(
    raw.state.courses["es-en"].srs[vocabularyReviewKey("travel", "w1")],
    legacy().lists[0].words[0].review
  );
});

test("verified import is repeatable and keeps the first checkpoint", async () => {
  const { original, disk, storage } = makeStorage();
  assert.deepEqual(await importWordPeckerVocabularyToStorage(storage),
    { listsAdded: 1, wordsAdded: 1 });
  const once = disk.get(PROGRESS_STORAGE_KEY);
  assert.deepEqual(await importWordPeckerVocabularyToStorage(storage),
    { listsAdded: 0, wordsAdded: 0 });
  assert.equal(disk.get(PROGRESS_STORAGE_KEY), once);
  assert.equal(disk.get("progress-v2-restore-checkpoint"), original);
});

test("invalid migration never writes either key or checkpoint", async () => {
  const { disk, operations, storage } = makeStorage();
  disk.set(WORDPECKER_LEGACY_STORAGE_KEY, JSON.stringify({ version: 9, lists: [] }));
  const saved = disk.get(PROGRESS_STORAGE_KEY);
  await assert.rejects(importWordPeckerVocabularyToStorage(storage), /Invalid WordPecker migration/);
  assert.equal(disk.get(PROGRESS_STORAGE_KEY), saved);
  assert.equal(operations.length, 0);
});

test("stale progress snapshot aborts without overwriting concurrent edits", async () => {
  const { disk, operations, storage } = makeStorage();
  let progressReads = 0;
  const concurrent = {
    ...storage,
    async getItem(key) {
      if (key === PROGRESS_STORAGE_KEY && ++progressReads === 2) {
        const modified = JSON.parse(disk.get(key));
        modified.state.courses["es-en"].xp = 999;
        disk.set(key, JSON.stringify(modified));
      }
      return storage.getItem(key);
    },
  };
  await assert.rejects(importWordPeckerVocabularyToStorage(concurrent), /progress changed during import/);
  assert.equal(JSON.parse(disk.get(PROGRESS_STORAGE_KEY)).state.courses["es-en"].xp, 999);
  assert.equal(operations.length, 0);
});

test("failed progress write restores original bytes and retains WordPecker data", async () => {
  const { original, legacyRaw, disk, storage } = makeStorage();
  let first = true;
  const failing = {
    ...storage,
    async setItem(key, value) {
      if (key === PROGRESS_STORAGE_KEY && first) {
        first = false;
        disk.set(key, "partial write");
        throw new Error("simulated device storage failure");
      }
      return storage.setItem(key, value);
    },
  };
  await assert.rejects(importWordPeckerVocabularyToStorage(failing),
    /simulated device storage failure/);
  assert.equal(disk.get(PROGRESS_STORAGE_KEY), original);
  assert.equal(disk.get("progress-v2-restore-checkpoint"), original);
  assert.equal(disk.get(WORDPECKER_LEGACY_STORAGE_KEY), legacyRaw);
});
