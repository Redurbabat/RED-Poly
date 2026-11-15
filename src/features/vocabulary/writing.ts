/** Strict offline answer validation: case/spacing-insensitive, accent-sensitive. */
export function normalizeWritingAnswer(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

export function checkWritingAnswer(answer: string, expected: string): boolean {
  const normalized = normalizeWritingAnswer(answer);
  return normalized.length > 0 && normalized === normalizeWritingAnswer(expected);
}
