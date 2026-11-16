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
