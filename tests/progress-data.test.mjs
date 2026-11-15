import test from "node:test";
import assert from "node:assert/strict";

import {
  PROGRESS_STORAGE_KEY, PROGRESS_STORAGE_VERSION, RESTORE_CHECKPOINT_KEY,
  migrateProgressData, createProgressBackup, parseProgressBackup,
  restoreProgressBackupToStorage, vocabularyReviewKey,
  addVocabularyList, addVocabularyWord, dueReviewKeys,
} from "../src/lib/progress-data.mjs";

const srs = { interval: 1, ease: 2.5, dueAt: 1000, streak: 1 };
const list = {
  id: "travel", courseId: "es-en", title: "Travel",
  targetCode: "es", nativeCode: "en", words: [],
};
const word = { id: "hello", target: "hola", native: "hello", source: "manual" };

function initial() {
  return migrateProgressData({
    activeCourseId: "fr-en", streak: 7, lastActiveDay: "2026-11-14",
    dailyGoal: 30, dailyXp: 15, dailyXpDay: "2026-11-14", onboardingDone: true,
    themePreference: "dark",
    activeDays: { "2026-11-14": { xp: 15, lessons: 1, perfect: 0 } },
    courses: {
      "es-en": { xp: 105, completedLessons: { l1: true }, mistakes: [],
        wordStats: { hola: { correct: 4, wrong: 1, lastSeen: 1 } }, srs: { hola: srs } },
      "fr-en": { xp: 20, completedLessons: { l2: true }, mistakes: [],
        wordStats: {}, srs: {} },
    },
  }, 0);
}

test("v0 course migration preserves XP, streak, lessons, SRS and multiple courses", () => {
  const state = initial();
  assert.equal(state.courses["es-en"].xp, 105);
  assert.equal(state.courses["fr-en"].xp, 20);
  assert.deepEqual(state.courses["es-en"].completedLessons, { l1: true });
  assert.deepEqual(state.courses["es-en"].srs.hola, srs);
  assert.equal(state.streak, 7);
  assert.equal(state.themePreference, "dark");
  assert.equal(state.onboardingDone, true);
  assert.equal(state.vocabularyLists.length, 0);
});

test("v0 flat progress migrates into default course without clearing old data", () => {
  const state = migrateProgressData({ xp: 32, streak: 2,
    completedLessons: { first: true }, mistakes: [],
    wordStats: {}, srs: { hola: srs } }, 0);
  assert.equal(state.courses["es-en"].xp, 32);
  assert.equal(state.courses["es-en"].completedLessons.first, true);
  assert.deepEqual(state.courses["es-en"].srs.hola, srs);
});

test("migration is idempotent and rejects future versions", () => {
  const before = initial();
  assert.deepEqual(migrateProgressData(before, 1), before);
  assert.throws(() => migrateProgressData(before, 99), /unsupported schema/);
});

test("backup roundtrip preserves all course data and custom vocabulary", () => {
  const original = initial();
  original.vocabularyLists = addVocabularyWord(addVocabularyList([], list), list.id, word);
  original.languagePreferences = { uiLanguage: "de", nativeLanguage: "ku" };
  const json = createProgressBackup(original, Date.UTC(2026, 10, 15));
  const decoded = JSON.parse(json);
  assert.equal(decoded.version, PROGRESS_STORAGE_VERSION);
  assert.equal(decoded.format, "red-poly-progress");
  assert.equal("recordWord" in decoded.state, false);
  const restored = parseProgressBackup(json);
  assert.deepEqual(restored.courses, original.courses);
  assert.deepEqual(restored.vocabularyLists, original.vocabularyLists);
  assert.deepEqual(restored.activeDays, original.activeDays);
  assert.deepEqual(restored.languagePreferences, original.languagePreferences);
});

test("invalid, future or corrupt backup is rejected before touching storage", async () => {
  const store = new Map([[PROGRESS_STORAGE_KEY, "original data"]]);
  const storage = {
    async getItem(key) { return store.get(key) ?? null; },
    async setItem(key, value) { store.set(key, value); },
    async removeItem(key) { store.delete(key); },
  };
  for (const input of ["not JSON", "{}", JSON.stringify({
    format: "red-poly-progress", version: 8, state: initial(),
  }), JSON.stringify({
    format: "red-poly-progress", version: 1, state: { ...initial(), courses: { "es-en": { xp: -1 } } },
  })]) {
    await assert.rejects(restoreProgressBackupToStorage(input, storage), /Invalid RED POLY/);
    assert.equal(store.get(PROGRESS_STORAGE_KEY), "original data");
  }
});

test("backup restore makes and verifies a separate original-data checkpoint", async () => {
  const map = new Map([[PROGRESS_STORAGE_KEY, "original bytes"]]);
  const storage = {
    async getItem(k) { return map.get(k) ?? null; },
    async setItem(k, v) { map.set(k, v); },
    async removeItem(k) { map.delete(k); },
  };
  const expected = initial();
  const result = await restoreProgressBackupToStorage(createProgressBackup(expected), storage);
  assert.equal(map.get(RESTORE_CHECKPOINT_KEY), "original bytes");
  assert.equal(JSON.parse(map.get(PROGRESS_STORAGE_KEY)).version, PROGRESS_STORAGE_VERSION);
  assert.deepEqual(result.courses, expected.courses);
});

test("failed storage write rolls back to original bytes", async () => {
  const map = new Map([[PROGRESS_STORAGE_KEY, "original bytes"]]);
  let writes = 0;
  const storage = {
    async getItem(k) { return map.get(k) ?? null; },
    async setItem(k, v) {
      if (k === PROGRESS_STORAGE_KEY && ++writes === 1) {
        map.set(k, "interrupted");
        throw new Error("disk full");
      }
      map.set(k, v);
    },
    async removeItem(k) { map.delete(k); },
  };
  await assert.rejects(
    restoreProgressBackupToStorage(createProgressBackup(initial()), storage), /disk full/
  );
  assert.equal(map.get(PROGRESS_STORAGE_KEY), "original bytes");
  assert.equal(map.get(RESTORE_CHECKPOINT_KEY), "original bytes");
});

test("vocabulary IDs are idempotent and conflicts never overwrite existing words", () => {
  const one = addVocabularyList([], list);
  assert.strictEqual(addVocabularyList(one, list), one);
  const two = addVocabularyWord(one, "travel", word);
  assert.deepEqual(addVocabularyWord(two, "travel", word), two);
  assert.throws(() => addVocabularyWord(two, "travel", { ...word, native: "HI" }), /conflicting word/);
  assert.throws(() => addVocabularyList(one, { ...list, title: "Conflicting" }), /conflicting list/);
  assert.equal(two[0].words[0].native, "hello");
  assert.equal(vocabularyReviewKey("travel", "hello"), "vocab:travel:hello");
  assert.notEqual(vocabularyReviewKey("travel", "hello"), "hola");
});

test("shared due review combines existing course and custom-word keys", () => {
  const custom = vocabularyReviewKey("travel", "hello");
  const course = { srs: { hola: srs, [custom]: { ...srs, dueAt: 5000 } } };
  assert.deepEqual(dueReviewKeys(course, 2000), ["hola"]);
  assert.deepEqual(dueReviewKeys(course, 6000), ["hola", custom]);
});


test("version 1 backups must contain every required state field", async () => {
  const valid = initial();
  const raw = JSON.parse(createProgressBackup(valid));
  for (const missing of ["courses", "streak", "vocabularyLists", "activeDays", "languagePreferences"]) {
    const damaged = JSON.parse(JSON.stringify(raw));
    delete damaged.state[missing];
    assert.throws(
      () => parseProgressBackup(JSON.stringify(damaged)),
      /Invalid RED POLY/,
      "should reject missing " + missing
    );
  }
});

test("v0 migration rejects invalid courses rather than silently replacing them", () => {
  assert.throws(
    () => migrateProgressData({ courses: null, xp: 80 }, 0),
    /Invalid RED POLY/
  );
  assert.throws(
    () => migrateProgressData({ courses: "broken", xp: 80 }, 0),
    /Invalid RED POLY/
  );
});

test("repeated imports preserve the first original-data checkpoint", async () => {
  const map = new Map([[PROGRESS_STORAGE_KEY, "original state"]]);
  const storage = {
    async getItem(k) { return map.get(k) ?? null; },
    async setItem(k, v) { map.set(k, v); },
    async removeItem(k) { map.delete(k); },
  };
  const first = initial();
  const second = initial();
  second.courses["es-en"].xp = 999;
  await restoreProgressBackupToStorage(createProgressBackup(first), storage);
  await restoreProgressBackupToStorage(createProgressBackup(second), storage);
  assert.equal(map.get(RESTORE_CHECKPOINT_KEY), "original state");
  assert.equal(JSON.parse(map.get(PROGRESS_STORAGE_KEY)).state.courses["es-en"].xp, 999);
});
