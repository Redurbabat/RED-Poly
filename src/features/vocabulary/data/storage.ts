import AsyncStorage from "@react-native-async-storage/async-storage";
import { isDue, reviewWord, type SrsEntry } from "../../../lib/srs";

/**
 * Isolated, versioned vocabulary adapter until Agent 01 provides a shared
 * persistence API. Does NOT modify the existing progress-v2 key.
 * Adapted concepts: WordPecker WordList/Word and exercise feedback (MIT).
 */
export const VOCABULARY_STORAGE_KEY = "red-poly:vocabulary-v1";
export type VocabularyWord = {
  id: string;
  value: string;
  translation: string;
  example: string;
  createdAt: number;
  updatedAt: number;
  correct: number;
  wrong: number;
  review?: SrsEntry;
};
export type VocabularyList = {
  id: string;
  title: string;
  category: string;
  courseId: string;
  words: VocabularyWord[];
};
export type VocabularyData = { version: 1; lists: VocabularyList[] };
export const emptyVocabulary = (): VocabularyData => ({ version: 1, lists: [] });

export function vocabularyId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function cleanVocabulary(raw: unknown): VocabularyData {
  if (!raw || typeof raw !== "object" || (raw as any).version !== 1 || !Array.isArray((raw as any).lists)) {
    throw new Error("Unsupported vocabulary data. The original data has not been changed.");
  }
  const lists: VocabularyList[] = (raw as VocabularyData).lists.map((list) => {
    if (!list || typeof list.id !== "string" || typeof list.title !== "string" || !Array.isArray(list.words)) {
      throw new Error("Invalid vocabulary list");
    }
    const words = list.words.map((word) => {
      if (!word || typeof word.id !== "string" || typeof word.value !== "string" || typeof word.translation !== "string") {
        throw new Error("Invalid vocabulary word");
      }
      const validCount = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
      if ((word.correct !== undefined && !validCount(word.correct)) ||
          (word.wrong !== undefined && !validCount(word.wrong))) {
        throw new Error("Invalid vocabulary statistics");
      }
      const review: unknown = word.review;
      if (review !== undefined && (
        !review || typeof review !== "object" ||
        !Number.isFinite((review as SrsEntry).dueAt) ||
        !Number.isFinite((review as SrsEntry).ease) ||
        !Number.isFinite((review as SrsEntry).interval) ||
        !Number.isSafeInteger((review as SrsEntry).streak) ||
        (review as SrsEntry).streak < 0 ||
        (review as SrsEntry).interval < 0 ||
        (review as SrsEntry).ease < 1.3
      )) {
        throw new Error("Invalid vocabulary review");
      }
      return { ...word, example: String(word.example ?? ""), correct: word.correct ?? 0, wrong: word.wrong ?? 0 };
    });
    return { ...list, category: String(list.category ?? ""), courseId: String(list.courseId ?? ""), words };
  });
  return { version: 1, lists };
}
export async function loadVocabulary(): Promise<VocabularyData> {
  const value = await AsyncStorage.getItem(VOCABULARY_STORAGE_KEY);
  return value === null ? emptyVocabulary() : cleanVocabulary(JSON.parse(value));
}
export async function saveVocabulary(data: VocabularyData): Promise<void> {
  const validated = cleanVocabulary(data);
  await AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(validated));
}
export function dueVocabularyWords(list: VocabularyList, now = Date.now()): VocabularyWord[] {
  return list.words.filter((word) => isDue(word.review, now));
}
export function applyVocabularyReview(data: VocabularyData, listId: string, wordId: string, correct: boolean): VocabularyData {
  return {
    ...data,
    lists: data.lists.map((list) => list.id !== listId ? list : {
      ...list,
      words: list.words.map((word) => word.id !== wordId ? word : {
        ...word,
        correct: word.correct + (correct ? 1 : 0),
        wrong: word.wrong + (correct ? 0 : 1),
        updatedAt: Date.now(),
        review: reviewWord(word.review, correct ? 2 : 0),
      }),
    }),
  };
}
