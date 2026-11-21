import type { VocabularyList } from "../data/storage";

export type VocabularyStatistics = {
  lists: number;
  words: number;
  practicedWords: number;
  attempts: number;
  correct: number;
  wrong: number;
  accuracyPercent: number | null;
  dueNow: number;
  scheduled: number;
  mastered: number;
};

/** Summary of locally recorded vocabulary only; course XP is intentionally excluded. */
export function vocabularyStatistics(
  lists: readonly VocabularyList[],
  now = Date.now(),
): VocabularyStatistics {
  let words = 0;
  let practicedWords = 0;
  let correct = 0;
  let wrong = 0;
  let dueNow = 0;
  let scheduled = 0;
  let mastered = 0;

  for (const list of lists) {
    for (const word of list.words) {
      words++;
      const right = Number.isFinite(word.correct) ? Math.max(0, word.correct) : 0;
      const incorrect = Number.isFinite(word.wrong) ? Math.max(0, word.wrong) : 0;
      correct += right;
      wrong += incorrect;
      if (right + incorrect > 0) practicedWords++;
      if (!word.review || word.review.dueAt <= now) {
        dueNow++;
      } else {
        scheduled++;
      }
      // Mastery = 3 consecutive successful reviews and the next review lies ahead.
      if (word.review && word.review.streak >= 3 && word.review.dueAt > now) {
        mastered++;
      }
    }
  }
  const attempts = correct + wrong;
  return {
    lists: lists.length,
    words,
    practicedWords,
    attempts,
    correct,
    wrong,
    accuracyPercent: attempts ? Math.round((correct / attempts) * 100) : null,
    dueNow,
    scheduled,
    mastered,
  };
}
