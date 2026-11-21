import type { VocabularyWord } from "../data/storage";
import { checkWritingAnswer } from "./writing";

export type WordBankQuestion = {
  wordId: string;
  prompt: string;
  expected: string;
  tokens: { id: number; value: string }[];
};

/**
 * Build a word-order exercise using the saved translation.
 * IDs are token positions, not words, so repeated words remain selectable.
 * No API, account or dictionary is needed.
 */
export function makeWordBankQuestion(word: VocabularyWord): WordBankQuestion | null {
  const prompt = word.value.trim();
  const expected = word.translation.trim();
  const pieces = expected.split(/\s+/u).filter(Boolean);
  if (!prompt || pieces.length < 2 || pieces.length > 20) return null;
  const tokens = pieces.map((value, id) => ({ id, value }));
  // Stable deterministic permutation avoids random changes across renders.
  const rotated = tokens.slice(1).concat(tokens[0]);
  return { wordId: word.id, prompt, expected, tokens: rotated };
}

export function checkWordBankAnswer(
  question: WordBankQuestion,
  selectedTokenIds: number[],
): boolean {
  if (selectedTokenIds.length !== question.tokens.length) return false;
  const tokenById = new Map(question.tokens.map((token) => [token.id, token.value]));
  if (new Set(selectedTokenIds).size !== question.tokens.length) return false;
  const answer = selectedTokenIds.map((id) => tokenById.get(id));
  if (answer.some((value) => value === undefined)) return false;
  return checkWritingAnswer(answer.join(" "), question.expected);
}
