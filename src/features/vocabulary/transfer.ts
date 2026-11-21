import {
  cleanVocabulary, type VocabularyData, type VocabularyList,
} from "./storage";

export const MAX_VOCABULARY_IMPORT_BYTES = 1_000_000;

/** Portable, local-only backup; does not include course XP or progress-v2. */
export function exportVocabularyJson(data: VocabularyData): string {
  return JSON.stringify(cleanVocabulary(data), null, 2);
}

/**
 * Additive import: existing lists and review history are never overwritten.
 * Matching list IDs are skipped to make restoring the same backup idempotent.
 * Validation happens completely before any data is persisted.
 */
export function mergeVocabularyJson(existing: VocabularyData, json: string): {
  data: VocabularyData;
  addedLists: number;
  skippedLists: number;
} {
  if (json.length > MAX_VOCABULARY_IMPORT_BYTES) {
    throw new Error("The backup is too large (maximum 1 MB).");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON. Paste a RED POLY vocabulary backup.");
  }
  const imported = cleanVocabulary(parsed);
  if (imported.lists.length > 500) throw new Error("Too many vocabulary lists (maximum 500).");

  const currentIds = new Set(existing.lists.map((list) => list.id));
  const incomingIds = new Set<string>();
  const additions: VocabularyList[] = [];

  for (const list of imported.lists) {
    if (!list.id.trim() || !list.title.trim() || !list.courseId.trim()) {
      throw new Error("Each imported list needs an ID, title and course.");
    }
    if (list.words.length > 10_000) throw new Error("Too many words in a list.");
    const wordIds = new Set<string>();
    for (const word of list.words) {
      if (!word.id.trim() || !word.value.trim() || !word.translation.trim()) {
        throw new Error("Each word needs an ID, text and translation.");
      }
      if (wordIds.has(word.id)) throw new Error("Duplicate word IDs in imported list.");
      wordIds.add(word.id);
      if (!Number.isFinite(word.correct) || !Number.isFinite(word.wrong) || word.correct < 0 || word.wrong < 0) {
        throw new Error("Invalid word statistics in backup.");
      }
      if (word.review && (
        !Number.isFinite(word.review.dueAt) ||
        !Number.isFinite(word.review.ease) ||
        !Number.isFinite(word.review.interval) ||
        !Number.isFinite(word.review.streak)
      )) {
        throw new Error("Invalid review schedule in backup.");
      }
    }
    if (incomingIds.has(list.id)) throw new Error("Duplicate list IDs in backup.");
    incomingIds.add(list.id);
    if (!currentIds.has(list.id)) additions.push(list);
  }

  return {
    data: { version: 1, lists: [...existing.lists, ...additions] },
    addedLists: additions.length,
    skippedLists: imported.lists.length - additions.length,
  };
}
