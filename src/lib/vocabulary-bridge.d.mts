import type { PersistedProgressData } from "./progress-data.mjs";

/** Agent 02's separate, temporary vocabulary-v1 schema. */
export interface WordPeckerLegacyReview {
  interval: number;
  ease: number;
  dueAt: number;
  streak: number;
}
export interface WordPeckerLegacyWord {
  id: string;
  value: string;
  translation: string;
  example?: string;
  createdAt?: number;
  updatedAt?: number;
  correct?: number;
  wrong?: number;
  review?: WordPeckerLegacyReview;
}
export interface WordPeckerLegacyList {
  id: string;
  title: string;
  courseId: string;
  category?: string;
  words: WordPeckerLegacyWord[];
}
export interface WordPeckerLegacyData {
  version: 1;
  lists: WordPeckerLegacyList[];
}
/**
 * Pure import: converts Agent 02's vocabulary records to progress-v2 shape.
 * Throws before returning on invalid/conflicting data; does not write storage.
 */
export function mergeWordPeckerVocabulary(
  progress: PersistedProgressData,
  legacy: unknown
): PersistedProgressData;

/** Old independent Agent-02 key. Never deleted by import. */
export const WORDPECKER_LEGACY_STORAGE_KEY: "red-poly:vocabulary-v1";

export interface VocabularyMigrationStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
}
/**
 * Explicit, verified persistence bridge.
 * Caller must block edits and ensure previous Zustand writes have settled.
 * Requires a persisted progress-v2 record and an existing vocabulary-v1 record.
 */
export function importWordPeckerVocabularyToStorage(
  storage: VocabularyMigrationStorageAdapter
): Promise<{ listsAdded: number; wordsAdded: number }>;
