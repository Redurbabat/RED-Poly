import type { VocabularyList, VocabularyWord } from "./storage";

export type MultipleChoiceQuestion = {
  wordId: string;
  prompt: string;
  options: { wordId: string; label: string }[];
  correctWordId: string;
};

/**
 * Creates a translation quiz without a service or network.
 * Only unique translations are eligible: otherwise two correct-looking
 * options could be shown for the same prompt.
 */
export function makeMultipleChoiceQuestion(
  list: VocabularyList,
  wordId: string,
): MultipleChoiceQuestion | null {
  const target = list.words.find((word) => word.id === wordId);
  if (!target) return null;
  const normalize = (value: string) => value.trim().normalize("NFC").toLocaleLowerCase();
  const correctLabel = normalize(target.translation);
  if (!target.value.trim() || !correctLabel) return null;
  const seen = new Set([correctLabel]);
  const distractors: VocabularyWord[] = [];
  for (const candidate of list.words) {
    if (candidate.id === target.id) continue;
    const label = normalize(candidate.translation);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }
  if (!distractors.length) return null;

  const options = [target, ...distractors]
    .map((word) => ({ wordId: word.id, label: word.translation.trim() }))
    .sort((a, b) => a.wordId.localeCompare(b.wordId));
  return { wordId: target.id, prompt: target.value, options, correctWordId: target.id };
}

export function checkMultipleChoiceAnswer(
  question: MultipleChoiceQuestion,
  selectedWordId: string,
): boolean {
  return question.correctWordId === selectedWordId &&
    question.options.some((option) => option.wordId === selectedWordId);
}
