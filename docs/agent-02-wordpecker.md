# Agent 02 — WordPecker vocabulary integration

## Provenance and scope
Source reviewed: `integrations/wordpecker/frontend/src/types/index.ts`, `frontend/src/utils/answerValidation.ts`, `backend/src/api/words/model.ts`, and WordPecker's MIT license (Copyright 2025 Batur Arslan). Vocabulary list/word concepts and review feedback are **adapted**, not a copy of WordPecker's web UI. Keep WordPecker's original LICENSE. No MongoDB, accounts, hosted AI services or server endpoints are imported.

## Implemented on this branch
- Personal vocabulary lists scoped to the active existing course; optional topic/category.
- Add, edit and delete words with translations and example sentences.
- Duplicate word guard per list.
- Portable JSON export and additive JSON import via the existing vocabulary screen; validates input size, list IDs, word IDs and review data before persistence; repeated import skips existing list IDs.
- Offline flashcard reveal and remembered/again grading.
- Offline multiple-choice translation quiz using up to four unique translation options; correct/incorrect responses persist through the existing vocabulary SRS adapter.
- Offline writing practice: free-text translation, case/whitespace-insensitive but accent-sensitive matching, expected-answer feedback, saved SRS grading.
- Due-word selection and review scheduling **using the existing** `src/lib/srs.ts` SM-2-like algorithm.
- Per-word correct/wrong counts; a separate local storage key `red-poly:vocabulary-v1`.
- Link from the existing Practice tab; no second Expo app, tab bar or login.

## Temporary data adapter — Agent 01 coordination required
- The existing `progress-v2` and `src/lib/store.ts` remain unchanged.
- Isolated storage module: `src/features/vocabulary/storage.ts`.
- Data contract: `VocabularyData { version: 1, lists: VocabularyList[] }`; each list uses `id,title,category,courseId,words`. Word fields are `id,value,translation,example,createdAt,updatedAt,correct,wrong,review`.
- Needed from Agent 01: a versioned vocabulary CRUD + review-event API; canonical course, lesson and word identifiers; backup/export/import and migration; a guaranteed strategy to avoid double-counting learned words in existing course XP/SRS.
- `red-poly:vocabulary-v1` is deliberately **not** fed into `progress-v2`; until migration exists, flashcard progress and course XP are separate. Do not claim unified progress.

## Outstanding
- Word-bank training, cross-feature learning statistics, AI suggestions.
- Backup currently uses select-and-copy/paste of JSON in a text field; native share-sheet/file picker is not implemented.
- Import skips colliding list IDs rather than overwriting them; import reports skipped lists. A future conflict-resolution/migration policy is needed.
- WordPecker template packs require content/license review before copying.
- More robust handling of malformed persisted data and multi-device sync.
- Multiple-choice helper: 6 isolated Node tests passed on an equivalent extracted helper (missing ID, unique labels, correct/incorrect answers, insufficient distractors, empty word, two-choice fallback). This is **not** a repository build or device test.
- Writing helper: 8 isolated Node assertions passed after TypeScript compilation (case, whitespace, accents, Unicode normalization, wrong answer, blank answer, newline, punctuation). No UI/device tests performed.
- Automated repository test harness, full TypeScript build, app launch, iOS/Android/Web device checks, restart and offline tests are **not run** in this environment. GitHub network access is unavailable from the local shell.
- Independent security/licensing review of original Lingo Lessons content and audio remains a release blocker.

## Manual acceptance checklist (not yet executed)
1. Open Practice > My vocabulary; create a list, add two words and examples.
2. Edit one word, remove the other; confirm the remaining word and category.
3. Start flashcards, reveal translation, mark remembered; confirm due count drops.
4. Export JSON, copy it, import into empty storage and verify words and review counters.
5. Import the same JSON again; verify duplicate list IDs are skipped and existing progress is not overwritten.
6. Force-close/reopen; confirm words, counters and due dates persist.
7. Repeat with airplane mode; switch courses and verify lists are correctly scoped.
8. Verify original lesson, mistake-review and SRS flows still work.

9. In a list with two distinct translations, open Multiple choice, select the incorrect option, verify feedback and wrong counter; repeat with correct selection and check due state.
10. Verify duplicate translation labels never appear as separate answers and empty/one-translation lists disable Multiple choice.

11. In Writing practice, check uppercase and extra whitespace are accepted, missing accents and wrong words rejected, with SRS counters changed once per submission.
12. Check empty answers cannot be submitted, feedback prevents duplicate grading, and Finish writing returns to the list.
