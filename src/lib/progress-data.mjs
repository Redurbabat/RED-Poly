/**
 * RED POLY local-first persistence primitives. No React, Expo, network or UI dependency.
 * The installed Lingo Lessons store remains the source of truth.
 */
export const PROGRESS_STORAGE_KEY = "progress-v2";
export const PROGRESS_STORAGE_VERSION = 1;
export const RESTORE_CHECKPOINT_KEY = "progress-v2-restore-checkpoint";
export const BACKUP_FORMAT = "red-poly-progress";

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const nonNegative = (value) => finite(value) && value >= 0;
const text = (value) => typeof value === "string" && value.trim().length > 0;
const safeId = (value) => text(value) && !["__proto__", "prototype", "constructor"].includes(value);
const assert = (ok, message) => { if (!ok) throw new Error("Invalid RED POLY progress: " + message); };

function verifyCourse(course) {
  assert(object(course), "course must be an object");
  assert(nonNegative(course.xp), "course XP");
  assert(object(course.completedLessons), "completed lessons");
  assert(Array.isArray(course.mistakes), "mistakes");
  assert(object(course.wordStats), "word statistics");
  assert(object(course.srs), "SRS entries");
  for (const [id, completed] of Object.entries(course.completedLessons)) {
    assert(safeId(id) && completed === true, "completed lesson");
  }
  for (const mistake of course.mistakes) {
    assert(object(mistake) && safeId(mistake.lessonId) &&
      safeId(mistake.exerciseId), "mistake reference");
  }
  for (const [key, stat] of Object.entries(course.wordStats)) {
    assert(safeId(key) && object(stat), "word statistics key");
    assert(nonNegative(stat.correct) && nonNegative(stat.wrong) &&
      nonNegative(stat.lastSeen), "word statistics entry");
  }
  for (const [key, entry] of Object.entries(course.srs)) {
    assert(safeId(key) && object(entry), "SRS key");
    assert(nonNegative(entry.interval) && finite(entry.ease) &&
      finite(entry.dueAt) && nonNegative(entry.streak), "SRS entry");
  }
}

function verifyWord(word) {
  assert(object(word) && safeId(word.id), "vocabulary word ID");
  assert(text(word.target) && text(word.native), "vocabulary word text");
  assert(word.source === undefined ||
    ["manual", "wordpecker", "conversation"].includes(word.source), "word source");
}

function verifyList(list) {
  assert(object(list) && safeId(list.id) && safeId(list.courseId), "list/course ID");
  assert(text(list.title) && text(list.targetCode) && text(list.nativeCode), "list metadata");
  assert(Array.isArray(list.words), "list words");
  const ids = new Set();
  for (const word of list.words) {
    verifyWord(word);
    assert(!ids.has(word.id), "duplicate vocabulary word ID");
    ids.add(word.id);
  }
}

/** Pure, idempotent migration. Throws before touching AsyncStorage on unknown versions. */
export function migrateProgressData(value, fromVersion = 0) {
  assert(Number.isInteger(fromVersion) && fromVersion >= 0 &&
    fromVersion <= PROGRESS_STORAGE_VERSION, "unsupported schema version");
  assert(object(value), "state must be an object");
  const old = value;
  const hasCourses = object(old.courses);
  const courses = hasCourses ? old.courses : {
    "es-en": {
      xp: old.xp ?? 0,
      completedLessons: old.completedLessons ?? {},
      mistakes: old.mistakes ?? [],
      wordStats: old.wordStats ?? {},
      srs: old.srs ?? {},
    },
  };
  const migrated = {
    ...old,
    activeCourseId: old.activeCourseId ?? "es-en",
    streak: old.streak ?? 0,
    lastActiveDay: old.lastActiveDay ?? null,
    dailyGoal: old.dailyGoal ?? 20,
    dailyXp: old.dailyXp ?? 0,
    dailyXpDay: old.dailyXpDay ?? null,
    onboardingDone: old.onboardingDone ?? false,
    themePreference: old.themePreference ?? "system",
    activeDays: old.activeDays ?? {},
    courses,
    vocabularyLists: old.vocabularyLists ?? [],
    languagePreferences: old.languagePreferences ?? { uiLanguage: "en", nativeLanguage: "en" },
  };
  // Never silently replace malformed user data with an empty default.
  validateProgressData(migrated);
  return migrated;
}

/** Rejects invalid imports rather than partially restoring them. */
export function validateProgressData(data) {
  assert(object(data), "state object");
  assert(safeId(data.activeCourseId), "active course ID");
  assert(nonNegative(data.streak) && nonNegative(data.dailyXp) &&
    nonNegative(data.dailyGoal), "streak or daily totals");
  assert(typeof data.onboardingDone === "boolean", "onboarding flag");
  assert(["system", "light", "dark"].includes(data.themePreference), "theme preference");
  assert(data.lastActiveDay === null || text(data.lastActiveDay), "last active day");
  assert(data.dailyXpDay === null || text(data.dailyXpDay), "daily XP day");
  assert(object(data.courses), "courses object");
  for (const [id, course] of Object.entries(data.courses)) {
    assert(safeId(id), "course ID");
    verifyCourse(course);
  }
  assert(object(data.activeDays), "activity history");
  for (const [day, activity] of Object.entries(data.activeDays)) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(day) && object(activity), "activity day");
    assert(nonNegative(activity.xp) && nonNegative(activity.lessons) &&
      nonNegative(activity.perfect), "activity totals");
  }
  assert(Array.isArray(data.vocabularyLists), "vocabulary lists");
  const ids = new Set();
  for (const list of data.vocabularyLists) {
    verifyList(list);
    assert(!ids.has(list.id), "duplicate vocabulary list ID");
    ids.add(list.id);
  }
  assert(object(data.languagePreferences) &&
    text(data.languagePreferences.uiLanguage) &&
    text(data.languagePreferences.nativeLanguage), "language preferences");
  return data;
}

const fields = [
  "activeCourseId", "streak", "lastActiveDay", "dailyGoal", "dailyXp",
  "dailyXpDay", "onboardingDone", "themePreference", "courses", "activeDays",
  "vocabularyLists", "languagePreferences",
];
const snapshot = (data) =>
  Object.fromEntries(fields.map((key) => [key, data[key]]));

/** Portable JSON backup; excludes Zustand actions and runtime objects. */
export function createProgressBackup(state, now = Date.now()) {
  const data = snapshot(migrateProgressData(state, PROGRESS_STORAGE_VERSION));
  return JSON.stringify({
    format: BACKUP_FORMAT, version: PROGRESS_STORAGE_VERSION,
    exportedAt: new Date(now).toISOString(), state: data,
  });
}

/** Strict validation precedes every restore or import. */
export function parseProgressBackup(serialized) {
  assert(typeof serialized === "string" && serialized.length <= 8_000_000, "backup size");
  let backup;
  try { backup = JSON.parse(serialized); }
  catch { throw new Error("Invalid RED POLY progress: invalid backup JSON"); }
  assert(object(backup) && backup.format === BACKUP_FORMAT, "backup format");
  assert(backup.version === PROGRESS_STORAGE_VERSION, "backup version");
  assert(object(backup.state), "backup state");
  return migrateProgressData(backup.state, backup.version);
}

/**
 * Durable best-effort restore with a retained original checkpoint.
 * Caller must suspend edits and rehydrate Zustand after this resolves.
 * On a failed write or verification, the original bytes are restored.
 */
export async function restoreProgressBackupToStorage(serialized, storage) {
  const nextState = parseProgressBackup(serialized);
  const original = await storage.getItem(PROGRESS_STORAGE_KEY);
  if (original !== null) {
    await storage.setItem(RESTORE_CHECKPOINT_KEY, original);
    assert(await storage.getItem(RESTORE_CHECKPOINT_KEY) === original, "checkpoint verification");
  }
  const newValue = JSON.stringify({ state: snapshot(nextState), version: PROGRESS_STORAGE_VERSION });
  try {
    await storage.setItem(PROGRESS_STORAGE_KEY, newValue);
    assert(await storage.getItem(PROGRESS_STORAGE_KEY) === newValue, "restore verification");
  } catch (error) {
    if (original === null) await storage.removeItem(PROGRESS_STORAGE_KEY);
    else await storage.setItem(PROGRESS_STORAGE_KEY, original);
    throw error;
  }
  return nextState;
}

/** Stable namespacing prevents user words overwriting course-pack SRS keys. */
export function vocabularyReviewKey(listId, wordId) {
  assert(safeId(listId) && safeId(wordId), "review key");
  return "vocab:" + encodeURIComponent(listId) + ":" + encodeURIComponent(wordId);
}

/** Idempotent insertion; rejects conflicting IDs instead of losing existing words. */
export function addVocabularyList(lists, list) {
  assert(Array.isArray(lists), "lists");
  verifyList(list);
  const found = lists.find((entry) => entry.id === list.id);
  if (found) {
    assert(JSON.stringify(found) === JSON.stringify(list), "conflicting list ID");
    return lists;
  }
  return [...lists, list];
}

export function addVocabularyWord(lists, listId, word) {
  assert(Array.isArray(lists) && safeId(listId), "list ID");
  verifyWord(word);
  assert(lists.some((list) => list.id === listId), "unknown list");
  return lists.map((list) => {
    if (list.id !== listId) return list;
    verifyList(list);
    const prior = list.words.find((existing) => existing.id === word.id);
    if (prior) {
      assert(JSON.stringify(prior) === JSON.stringify(word), "conflicting word ID");
      return list;
    }
    return { ...list, words: [...list.words, word] };
  });
}

/** Read-only helper for all course lessons and user-vocabulary SRS entries. */
export function dueReviewKeys(course, now = Date.now()) {
  return Object.entries(course?.srs ?? {})
    .filter(([, entry]) => entry.dueAt <= now)
    .map(([key]) => key);
}
