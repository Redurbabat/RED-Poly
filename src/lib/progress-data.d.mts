/** Public cross-agent contracts. Import types from "./progress-data.mjs". */
export interface SrsSnapshot {
  interval: number;
  ease: number;
  dueAt: number;
  streak: number;
}
export interface CourseProgressSnapshot {
  xp: number;
  completedLessons: Record<string, true>;
  mistakes: Array<{ lessonId: string; exerciseId: string }>;
  wordStats: Record<string, { correct: number; wrong: number; lastSeen: number }>;
  srs: Record<string, SrsSnapshot>;
}
export interface VocabularyWord {
  /** Stable within its list; never use target text as this identifier. */
  id: string;
  target: string;
  native: string;
  romanization?: string;
  source?: "manual" | "wordpecker" | "conversation";
}
export interface VocabularyList {
  id: string;
  /** Existing Lingo course identifier, e.g. es-en. */
  courseId: string;
  title: string;
  /** ISO/BCP-47 language tag; independent of UI language. */
  targetCode: string;
  nativeCode: string;
  words: VocabularyWord[];
}
export interface LanguagePreferences {
  uiLanguage: string;
  nativeLanguage: string;
}
export interface PersistedProgressData {
  activeCourseId: string;
  streak: number;
  lastActiveDay: string | null;
  dailyGoal: number;
  dailyXp: number;
  dailyXpDay: string | null;
  onboardingDone: boolean;
  themePreference: "system" | "light" | "dark";
  courses: Record<string, CourseProgressSnapshot>;
  activeDays: Record<string, { xp: number; lessons: number; perfect: number }>;
  vocabularyLists: VocabularyList[];
  languagePreferences: LanguagePreferences;
}
export interface ProgressStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
}
export const PROGRESS_STORAGE_KEY: "progress-v2";
export const PROGRESS_STORAGE_VERSION: 1;
export const RESTORE_CHECKPOINT_KEY: "progress-v2-restore-checkpoint";
export const BACKUP_FORMAT: "red-poly-progress";
export function migrateProgressData(value: unknown, fromVersion?: number): PersistedProgressData;
export function validateProgressData(data: unknown): PersistedProgressData;
export function createProgressBackup(state: PersistedProgressData, now?: number): string;
export function parseProgressBackup(serialized: string): PersistedProgressData;
export function restoreProgressBackupToStorage(
  serialized: string,
  storage: ProgressStorageAdapter
): Promise<PersistedProgressData>;
export function vocabularyReviewKey(listId: string, wordId: string): string;
export function addVocabularyList(lists: VocabularyList[], list: VocabularyList): VocabularyList[];
export function addVocabularyWord(
  lists: VocabularyList[], listId: string, word: VocabularyWord
): VocabularyList[];
export function dueReviewKeys(
  course: Pick<CourseProgressSnapshot, "srs">,
  now?: number
): string[];
