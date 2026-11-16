import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { isDue, reviewWord, type SrsEntry } from "./srs";
import {
  mergeWordPeckerVocabulary,
  importWordPeckerVocabularyToStorage,
} from "./vocabulary-bridge.mjs";
import { createProgressWriteGuard } from "./progress-write-guard.mjs";
import {
  exportVerifiedProgressBackup as exportGuardedBackup,
  restoreVerifiedProgressBackup as restoreGuardedBackup,
} from "./progress-transfer.mjs";
import {
  PROGRESS_STORAGE_KEY,
  PROGRESS_STORAGE_VERSION,
  addVocabularyList as insertVocabularyList,
  addVocabularyWord as insertVocabularyWord,
  createProgressBackup,
  migrateProgressData,
} from "./progress-data.mjs";
import type {
  LanguagePreferences,
  VocabularyList,
  VocabularyWord,
} from "./progress-data.mjs";

export const XP_PER_LESSON = 15;
export const XP_PERFECT_BONUS = 5;
export const DAILY_GOAL_OPTIONS = [10, 20, 30, 50] as const;
export const DEFAULT_DAILY_GOAL = 20;
export const DEFAULT_COURSE = "es-en";
/** Days of per-day history kept for the streak calendar and quests. */
const DAY_HISTORY_LIMIT = 70;

const progressWriteGuard = createProgressWriteGuard();
const trackedProgressStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) =>
    progressWriteGuard.trackWrite(AsyncStorage.setItem(key, value)),
  removeItem: (key: string) =>
    progressWriteGuard.trackWrite(AsyncStorage.removeItem(key)),
};

export type ThemePreference = "system" | "light" | "dark";
export type WordStat = { correct: number; wrong: number; lastSeen: number };
export type MistakeRef = { lessonId: string; exerciseId: string };
export type DayActivity = { xp: number; lessons: number; perfect: number };

export type CourseProgress = {
  xp: number;
  completedLessons: Record<string, true>;
  mistakes: MistakeRef[];
  wordStats: Record<string, WordStat>;
  srs: Record<string, SrsEntry>;
};

function emptyCourseProgress(): CourseProgress {
  return {
    xp: 0,
    completedLessons: {},
    mistakes: [],
    wordStats: {},
    srs: {},
  };
}

function dayString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterday(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  return dayString(d);
}

type ProgressState = {
  activeCourseId: string;
  streak: number;
  lastActiveDay: string | null;
  dailyGoal: number;
  dailyXp: number;
  dailyXpDay: string | null;
  onboardingDone: boolean;
  /** "system" follows the device's light/dark setting. */
  themePreference: ThemePreference;
  courses: Record<string, CourseProgress>;
  /** Per-day activity across courses, for the streak calendar and quests. */
  activeDays: Record<string, DayActivity>;
  /** Same persisted state as lessons and SRS. No competing vocabulary store. */
  vocabularyLists: VocabularyList[];
  /** UI language is independent of selected learning course. */
  languagePreferences: LanguagePreferences;

  addVocabularyList: (list: VocabularyList) => void;
  addVocabularyWord: (listId: string, word: VocabularyWord) => void;
  /** Explicit, additive migration from Agent 02's independent legacy data. */
  importWordPeckerVocabulary: (legacy: unknown) => void;
  /** Agent 02/03 shared review entry point, explicitly scoped to a course. */
  reviewLearningItem: (courseId: string, reviewKey: string, correct: boolean) => void;
  setLanguagePreferences: (preferences: LanguagePreferences) => void;

  course: () => CourseProgress;
  completeLesson: (lessonId: string, perfect: boolean) => void;
  addMistake: (mistake: MistakeRef) => void;
  clearMistake: (exerciseId: string) => void;
  recordWord: (target: string, correct: boolean) => void;
  reviewSrsWord: (target: string, correct: boolean) => void;
  setActiveCourse: (courseId: string) => void;
  setThemePreference: (preference: ThemePreference) => void;
  finishOnboarding: (courseId: string, goal: number) => void;
};

function bumpDailyXp(state: ProgressState, amount: number) {
  const today = dayString(new Date());
  const isSameDay = state.dailyXpDay === today;
  const dailyXp = isSameDay ? state.dailyXp + amount : amount;
  return { dailyXp, dailyXpDay: today };
}

function pruneDays(days: Record<string, DayActivity>) {
  const keys = Object.keys(days ?? {}).sort();
  if (keys.length <= DAY_HISTORY_LIMIT) return days ?? {};
  const keep = new Set(keys.slice(-DAY_HISTORY_LIMIT));
  return Object.fromEntries(Object.entries(days).filter(([k]) => keep.has(k)));
}

function updateCourse(
  state: ProgressState,
  courseId: string,
  fn: (c: CourseProgress) => CourseProgress
): Partial<ProgressState> {
  const courses = state.courses ?? {};
  const prev = courses[courseId] ?? emptyCourseProgress();
  return { courses: { ...courses, [courseId]: fn(prev) } };
}

export const useProgress = create<ProgressState>()(
  persist(
    (unsafeSet, get) => {
      // Protect all built-in learning actions while a migration owns the lock.
      const set = ((...args: Parameters<typeof unsafeSet>) => {
        progressWriteGuard.assertUnlocked();
        return unsafeSet(...args);
      }) as typeof unsafeSet;
      return ({
      activeCourseId: DEFAULT_COURSE,
      streak: 0,
      lastActiveDay: null,
      dailyGoal: DEFAULT_DAILY_GOAL,
      dailyXp: 0,
      dailyXpDay: null,
      onboardingDone: false,
      themePreference: "system",
      courses: {},
      activeDays: {},
      vocabularyLists: [],
      languagePreferences: { uiLanguage: "en", nativeLanguage: "en" },

      course: () => (get().courses ?? {})[get().activeCourseId] ?? emptyCourseProgress(),

      completeLesson: (lessonId, perfect) =>
        set((state) => {
          const today = dayString(new Date());
          const yesterday = getYesterday();
          const streak =
            state.lastActiveDay === today
              ? state.streak
              : state.lastActiveDay === yesterday
                ? state.streak + 1
                : 1;
          const earned = XP_PER_LESSON + (perfect ? XP_PERFECT_BONUS : 0);
          const daily = bumpDailyXp(state, earned);
          const days = state.activeDays ?? {};
          const prevDay = days[today] ?? { xp: 0, lessons: 0, perfect: 0 };
          const activeDays = pruneDays({
            ...days,
            [today]: {
              xp: prevDay.xp + earned,
              lessons: prevDay.lessons + 1,
              perfect: prevDay.perfect + (perfect ? 1 : 0),
            },
          });
          const courseUpdate = updateCourse(state, state.activeCourseId, (c) => ({
            ...c,
            xp: c.xp + earned,
            completedLessons:
              lessonId === "mistakes" || lessonId === "srs"
                ? c.completedLessons
                : { ...c.completedLessons, [lessonId]: true },
          }));
          return { streak, lastActiveDay: today, activeDays, ...daily, ...courseUpdate };
        }),

      addMistake: (mistake) =>
        set((state) =>
          updateCourse(state, state.activeCourseId, (c) =>
            c.mistakes.some((m) => m.exerciseId === mistake.exerciseId)
              ? c
              : { ...c, mistakes: [...c.mistakes, mistake] }
          )
        ),

      clearMistake: (exerciseId) =>
        set((state) =>
          updateCourse(state, state.activeCourseId, (c) => ({
            ...c,
            mistakes: c.mistakes.filter((m) => m.exerciseId !== exerciseId),
          }))
        ),

      recordWord: (target, correct) =>
        set((state) =>
          updateCourse(state, state.activeCourseId, (c) => {
            const prev = c.wordStats[target] ?? { correct: 0, wrong: 0, lastSeen: 0 };
            const quality = correct ? (prev.wrong > prev.correct ? 1 : 2) : 0;
            return {
              ...c,
              wordStats: {
                ...c.wordStats,
                [target]: {
                  correct: prev.correct + (correct ? 1 : 0),
                  wrong: prev.wrong + (correct ? 0 : 1),
                  lastSeen: Date.now(),
                },
              },
              srs: { ...c.srs, [target]: reviewWord(c.srs[target], quality) },
            };
          })
        ),

      reviewSrsWord: (target, correct) =>
        set((state) =>
          updateCourse(state, state.activeCourseId, (c) => {
            const prev = c.wordStats[target] ?? { correct: 0, wrong: 0, lastSeen: 0 };
            return {
              ...c,
              wordStats: {
                ...c.wordStats,
                [target]: {
                  correct: prev.correct + (correct ? 1 : 0),
                  wrong: prev.wrong + (correct ? 0 : 1),
                  lastSeen: Date.now(),
                },
              },
              srs: { ...c.srs, [target]: reviewWord(c.srs[target], correct ? 2 : 0) },
            };
          })
        ),

      addVocabularyList: (list) =>
        set((state) => ({
          vocabularyLists: insertVocabularyList(state.vocabularyLists ?? [], list),
        })),

      addVocabularyWord: (listId, word) =>
        set((state) => ({
          vocabularyLists: insertVocabularyWord(state.vocabularyLists ?? [], listId, word),
        })),

      // This action never deletes or rewrites red-poly:vocabulary-v1.
      importWordPeckerVocabulary: (legacy) =>
        set((state) => {
          const merged = mergeWordPeckerVocabulary(state, legacy);
          return { courses: merged.courses, vocabularyLists: merged.vocabularyLists };
        }),

      reviewLearningItem: (courseId, reviewKey, correct) =>
        set((state) =>
          updateCourse(state, courseId, (c) => {
            const previous = c.wordStats[reviewKey] ?? { correct: 0, wrong: 0, lastSeen: 0 };
            return {
              ...c,
              wordStats: {
                ...c.wordStats,
                [reviewKey]: {
                  correct: previous.correct + (correct ? 1 : 0),
                  wrong: previous.wrong + (correct ? 0 : 1),
                  lastSeen: Date.now(),
                },
              },
              srs: { ...c.srs, [reviewKey]: reviewWord(c.srs[reviewKey], correct ? 2 : 0) },
            };
          })
        ),

      setLanguagePreferences: (preferences) =>
        set({ languagePreferences: preferences }),

      setActiveCourse: (courseId) => set({ activeCourseId: courseId }),

      setThemePreference: (preference) => set({ themePreference: preference }),

      finishOnboarding: (courseId, goal) =>
        set({ activeCourseId: courseId, dailyGoal: goal, onboardingDone: true }),
      });
    },
    {
      name: PROGRESS_STORAGE_KEY,
      version: PROGRESS_STORAGE_VERSION,
      storage: createJSONStorage(() => trackedProgressStorage),
      // Zustand's old unversioned payloads are v0. Keep progress-v2 unchanged.
      migrate: (persisted: unknown, fromVersion: number) =>
        migrateProgressData(persisted, fromVersion) as ProgressState,
    }
  )
);

export function currentLessonIndex(
  completed: Record<string, true> = {},
  lessonIds: string[] = []
) {
  const firstIncomplete = lessonIds.findIndex((id) => !completed[id]);
  return firstIncomplete === -1 ? lessonIds.length : firstIncomplete;
}

export function dailyXpToday(state: Pick<ProgressState, "dailyXp" | "dailyXpDay">) {
  const today = dayString(new Date());
  return state.dailyXpDay === today ? state.dailyXp : 0;
}

/**
 * The streak as it should be displayed *now*: the stored value goes stale if a
 * full day was missed (it's only recomputed on lesson completion).
 */
export function currentStreak(
  state: Pick<ProgressState, "streak" | "lastActiveDay">,
  now = new Date()
) {
  const today = dayString(now);
  const yesterday = getYesterday(now);
  return state.lastActiveDay === today || state.lastActiveDay === yesterday
    ? state.streak
    : 0;
}

/** True once a lesson has been completed today (used to light up the flame). */
export function activeToday(state: Pick<ProgressState, "lastActiveDay">) {
  return state.lastActiveDay === dayString(new Date());
}

export function todayActivity(
  state: Pick<ProgressState, "activeDays">
): DayActivity {
  return (
    (state.activeDays ?? {})[dayString(new Date())] ?? { xp: 0, lessons: 0, perfect: 0 }
  );
}

export type Quest = {
  id: string;
  label: string;
  target: number;
  value: number;
  done: boolean;
};

export function dailyQuests(
  state: Pick<ProgressState, "activeDays" | "dailyGoal">
): Quest[] {
  const today = todayActivity(state);
  const goal = Math.max(1, state.dailyGoal || DEFAULT_DAILY_GOAL);
  const make = (id: string, label: string, target: number, value: number): Quest => ({
    id,
    label,
    target,
    value: Math.min(value, target),
    done: value >= target,
  });
  return [
    make("xp", `Earn ${goal} XP`, goal, today.xp),
    make("lessons", "Complete 3 lessons", 3, today.lessons),
    make("perfect", "Get 1 perfect lesson", 1, today.perfect),
  ];
}

/** Rolling 7-day window ending today, for the streak calendar strip. */
export function lastSevenDays(state: Pick<ProgressState, "activeDays">) {
  const out: { day: string; weekday: string; active: boolean; isToday: boolean }[] = [];
  const now = new Date();
  const days = state.activeDays ?? {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const day = dayString(date);
    out.push({
      day,
      weekday: ["S", "M", "T", "W", "T", "F", "S"][date.getDay()],
      active: (days[day]?.lessons ?? 0) > 0,
      isToday: i === 0,
    });
  }
  return out;
}

export function dueSrsWords(srs: Record<string, SrsEntry> = {}, now = Date.now()) {
  return Object.entries(srs ?? {})
    .filter(([, entry]) => isDue(entry, now))
    .map(([target]) => target);
}

/**
 * Export the current persisted learning snapshot (no actions or secrets).
 * The caller chooses where to save/share the returned JSON.
 */
export function exportProgressBackup(): string {
  // Compatibility API: synchronous in-memory snapshot, not disk-verified.
  progressWriteGuard.assertUnlocked();
  return createProgressBackup(useProgress.getState());
}

/** Safe, disk-verified backup: waits for pending Zustand persistence writes. */
export async function exportPersistedProgressBackup(): Promise<string> {
  return exportGuardedBackup({
    storage: AsyncStorage,
    guard: progressWriteGuard,
    getState: () => useProgress.getState(),
    isHydrated: () => useProgress.persist.hasHydrated(),
  });
}

/**
 * Explicit, guarded restore; never called automatically.
 * Drains pending writes and blocks normal learning actions until the saved
 * data is verified and the in-memory Zustand state has been rehydrated.
 */
export async function restoreProgressBackup(serialized: string): Promise<void> {
  await restoreGuardedBackup(serialized, {
    storage: AsyncStorage,
    guard: progressWriteGuard,
    getState: () => useProgress.getState(),
    isHydrated: () => useProgress.persist.hasHydrated(),
    rehydrate: () => useProgress.persist.rehydrate(),
  });
}


/**
 * Safe entry point for an explicit, user-approved WordPecker migration.
 *
 * Guards standard learning actions while waiting for previously submitted
 * Zustand writes, rejects mismatched disk / memory snapshots, verifies storage
 * through the core migration adapter, and rehydrates the live store.
 *
 * Do not call while external code writes directly to AsyncStorage: its API
 * does not provide a cross-process transaction or compare-and-swap.
 */
export async function importWordPeckerVocabularyFromDevice(): Promise<{
  listsAdded: number;
  wordsAdded: number;
}> {
  if (!useProgress.persist.hasHydrated()) {
    throw new Error("RED POLY progress: load your progress before importing");
  }
  const release = await progressWriteGuard.acquire();
  try {
    const raw = await trackedProgressStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw === null) {
      throw new Error("RED POLY progress: no saved progress to migrate");
    }
    let envelope: unknown;
    try { envelope = JSON.parse(raw); }
    catch { throw new Error("RED POLY progress: corrupt stored progress"); }
    if (!envelope || typeof envelope !== "object" || !("state" in envelope)) {
      throw new Error("RED POLY progress: invalid stored progress envelope");
    }
    const stored = envelope as { state: unknown; version?: number };
    const persisted = migrateProgressData(stored.state, stored.version ?? 0);
    // Compare only persisted data, not live Zustand functions.
    const liveSnapshot = JSON.parse(createProgressBackup(useProgress.getState())).state;
    const diskSnapshot = JSON.parse(createProgressBackup(persisted)).state;
    if (JSON.stringify(liveSnapshot) !== JSON.stringify(diskSnapshot)) {
      throw new Error("RED POLY progress: local edits are not reflected on disk");
    }

    const result = await importWordPeckerVocabularyToStorage(AsyncStorage);
    await useProgress.persist.rehydrate();
    return result;
  } finally {
    release();
  }
}
