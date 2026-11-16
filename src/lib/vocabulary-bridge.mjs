/**
 * Explicit, offline adapter for Agent 02's pre-integration vocabulary-v1 data.
 * This module does not read, modify or delete the legacy AsyncStorage key.
 * The caller decides when to commit the returned progress state.
 */
import {
  migrateProgressData,
  validateProgressData,
  vocabularyReviewKey,
} from "./progress-data.mjs";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const present = (value) => typeof value === "string" && value.trim().length > 0;
const safeId = (value) => present(value) && !["__proto__", "constructor", "prototype"].includes(value);
const validDate = (value) => value === undefined || (finite(value) && value >= 0);
const assert = (condition, reason) => {
  if (!condition) throw new Error("Invalid WordPecker migration: " + reason);
};

function readLanguagePair(courseId) {
  assert(safeId(courseId), "course ID");
  const codes = courseId.split("-");
  assert(codes.length === 2 && codes.every((code) => /^[a-z]{2,3}$/.test(code)),
    "unknown course language pair; select a supported course before import");
  return codes;
}

function validateSource(source) {
  assert(isObject(source) && source.version === 1 && Array.isArray(source.lists), "version 1 lists");
  const listIds = new Set();
  for (const list of source.lists) {
    assert(isObject(list) && safeId(list.id) && present(list.title) &&
      Array.isArray(list.words), "list metadata");
    readLanguagePair(list.courseId);
    assert(list.category === undefined || typeof list.category === "string", "list category");
    assert(!listIds.has(list.id), "duplicate list ID");
    listIds.add(list.id);
    const wordIds = new Set();
    for (const word of list.words) {
      assert(isObject(word) && safeId(word.id) && present(word.value) &&
        present(word.translation), "word ID or text");
      assert(word.example === undefined || typeof word.example === "string", "word example");
      assert(validDate(word.createdAt) && validDate(word.updatedAt), "word timestamp");
      assert(word.correct === undefined || count(word.correct), "correct count");
      assert(word.wrong === undefined || count(word.wrong), "wrong count");
      if (word.review !== undefined) {
        const r = word.review;
        assert(isObject(r) && finite(r.interval) && r.interval >= 0 &&
          finite(r.ease) && r.ease >= 1.3 && finite(r.dueAt) &&
          count(r.streak), "SRS review");
      }
      assert(!wordIds.has(word.id), "duplicate word ID");
      wordIds.add(word.id);
    }
  }
}

/**
 * Merges Agent 02's persisted lists into the single progress-v2 model.
 *
 * - The existing progress (XP, lessons, streaks, SRS) always wins.
 * - Existing word IDs are skipped when text is unchanged; changed text is a
 *   conflict, never a silent overwrite.
 * - New words import review state and counters under namespaced SRS keys.
 * - A re-run is idempotent. Neither input is mutated.
 * - A complete validation pass occurs before any caller can persist the result.
 */
export function mergeWordPeckerVocabulary(progress, source) {
  validateSource(source);
  const base = migrateProgressData(progress, 1);
  let lists = [...base.vocabularyLists];
  const courses = { ...base.courses };

  for (const legacy of source.lists) {
    const [targetCode, nativeCode] = readLanguagePair(legacy.courseId);
    const current = lists.find((list) => list.id === legacy.id);
    if (current) {
      assert(current.courseId === legacy.courseId &&
        current.targetCode === targetCode && current.nativeCode === nativeCode,
      "conflicting list course or language");
    }
    const seenWords = new Map((current?.words ?? []).map((word) => [word.id, word]));
    const additions = [];

    for (const word of legacy.words) {
      const existing = seenWords.get(word.id);
      if (existing) {
        assert(existing.target === word.value && existing.native === word.translation,
          "conflicting word translation");
        continue;
      }
      const converted = {
        id: word.id,
        target: word.value,
        native: word.translation,
        example: word.example ?? "",
        ...(word.createdAt !== undefined ? { createdAt: word.createdAt } : {}),
        ...(word.updatedAt !== undefined ? { updatedAt: word.updatedAt } : {}),
        source: "wordpecker",
      };
      additions.push(converted);
      const course = courses[legacy.courseId] ?? {
        xp: 0, completedLessons: {}, mistakes: [], wordStats: {}, srs: {},
      };
      const reviewKey = vocabularyReviewKey(legacy.id, word.id);
      courses[legacy.courseId] = {
        ...course,
        wordStats: {
          ...course.wordStats,
          // Never overwrite a previously reviewed word, even if the old key
          // already exists for a partially completed migration.
          [reviewKey]: course.wordStats[reviewKey] ?? {
            correct: word.correct ?? 0,
            wrong: word.wrong ?? 0,
            lastSeen: word.updatedAt ?? 0,
          },
        },
        srs: {
          ...course.srs,
          ...(word.review && !course.srs[reviewKey]
            ? { [reviewKey]: { ...word.review } } : {}),
        },
      };
    }

    if (current) {
      if (additions.length > 0) {
        lists = lists.map((list) =>
          list.id === legacy.id ? { ...list, words: [...list.words, ...additions] } : list
        );
      }
    } else {
      lists.push({
        id: legacy.id,
        courseId: legacy.courseId,
        title: legacy.title,
        targetCode,
        nativeCode,
        category: legacy.category ?? "",
        words: additions,
      });
    }
  }
  return validateProgressData({ ...base, courses, vocabularyLists: lists });
}
