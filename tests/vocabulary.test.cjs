'use strict';
// Node runtime tests for the repository's real TypeScript vocabulary modules.
// Uses the existing TypeScript devDependency, with only AsyncStorage mocked.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const memory = new Map();
const asyncStorage = {
  async getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  async setItem(key, value) { memory.set(key, value); },
};
const moduleCache = new Map();

function loadTypescript(relativePath) {
  const filename = path.resolve(root, relativePath);
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n',
    }));
  }
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  moduleCache.set(filename, compiled);
  compiled.require = (id) => {
    if (id === '@react-native-async-storage/async-storage') {
      return { __esModule: true, default: asyncStorage };
    }
    if (id.startsWith('.')) {
      return loadTypescript(path.resolve(path.dirname(filename), id.endsWith('.ts') ? id : id + '.ts'));
    }
    return Module.prototype.require.call(compiled, id);
  };
  compiled._compile(result.outputText, filename);
  return compiled.exports;
}
const storage = loadTypescript('src/features/vocabulary/storage.ts');
const transfer = loadTypescript('src/features/vocabulary/transfer.ts');
const mcq = loadTypescript('src/features/vocabulary/multiple-choice.ts');
const writing = loadTypescript('src/features/vocabulary/writing.ts');
const bank = loadTypescript('src/features/vocabulary/word-bank.ts');
const stats = loadTypescript('src/features/vocabulary/statistics.ts');

function word(id, value, translation, extras = {}) {
  return { id, value, translation, example: '', createdAt: 1, updatedAt: 1, correct: 0, wrong: 0, ...extras };
}
function list(words, extras = {}) {
  return { id: 'list-1', title: 'Everyday words', category: 'General', courseId: 'de', words, ...extras };
}
function data(lists = []) { return { version: 1, lists }; }
beforeEach(() => memory.clear());

test('writing: normalizes case, spacing and canonical Unicode', () => {
  assert.equal(writing.checkWritingAnswer('  GUTEN   TAG  ', 'guten tag'), true);
  assert.equal(writing.checkWritingAnswer('Cafe\u0301', 'Café'), true);
  assert.equal(writing.checkWritingAnswer('Cafe', 'Café'), false);
  assert.equal(writing.checkWritingAnswer('guten tag!', 'guten tag'), false);
  assert.equal(writing.checkWritingAnswer(' \n\t ', 'guten tag'), false);
});

test('word bank: repeated words are independently selectable and ordered', () => {
  const question = bank.makeWordBankQuestion(word('w1', 'test', 'go go now'));
  assert.ok(question);
  assert.equal(question.tokens.length, 3);
  assert.equal(new Set(question.tokens.map((token) => token.id)).size, 3);
  assert.equal(bank.checkWordBankAnswer(question, [0, 1, 2]), true);
  assert.equal(bank.checkWordBankAnswer(question, [1, 0, 2]), true);
  assert.equal(bank.checkWordBankAnswer(question, [0, 2, 1]), false);
  assert.equal(bank.checkWordBankAnswer(question, [0, 0, 2]), false);
  assert.equal(bank.checkWordBankAnswer(question, [0, 1]), false);
  assert.equal(bank.checkWordBankAnswer(question, [0, 1, 100]), false);
});

test('word bank: requires multiword phrases, rejects empty and oversized prompts', () => {
  assert.equal(bank.makeWordBankQuestion(word('one', 'hello', 'hallo')), null);
  assert.equal(bank.makeWordBankQuestion(word('empty', 'hello', '  ')), null);
  assert.equal(bank.makeWordBankQuestion(word('long', 'hello', Array(21).fill('word').join(' '))), null);
});

test('multiple choice: unique distractors and correct/incorrect evaluation', () => {
  const vocab = list([
    word('a', 'hello', 'Hallo'),
    word('b', 'hi', 'hallo'),
    word('c', 'thank you', 'Danke'),
    word('d', 'bye', 'Tschüss'),
  ]);
  const q = mcq.makeMultipleChoiceQuestion(vocab, 'a');
  assert.ok(q);
  assert.deepEqual(q.options.map((opt) => opt.label).sort(), ['Danke', 'Hallo', 'Tschüss'].sort());
  assert.equal(mcq.checkMultipleChoiceAnswer(q, 'a'), true);
  assert.equal(mcq.checkMultipleChoiceAnswer(q, 'c'), false);
  assert.equal(mcq.checkMultipleChoiceAnswer(q, 'missing'), false);
  assert.equal(mcq.makeMultipleChoiceQuestion(vocab, 'missing'), null);
  assert.equal(mcq.makeMultipleChoiceQuestion(list([word('a', 'hi', 'hallo')]), 'a'), null);
});

test('statistics: empty list and mixed review progress', () => {
  const now = 10_000;
  assert.deepEqual(stats.vocabularyStatistics([]), {
    lists: 0, words: 0, practicedWords: 0, attempts: 0, correct: 0,
    wrong: 0, accuracyPercent: null, dueNow: 0, scheduled: 0, mastered: 0,
  });
  const vocab = list([
    word('a', 'a', 'A'),
    word('b', 'b', 'B', { correct: 2, wrong: 1, review: { dueAt: now + 1, ease: 2.5, interval: 1, streak: 3 } }),
    word('c', 'c', 'C', { correct: 1, wrong: 0, review: { dueAt: now, ease: 2.5, interval: 2, streak: 3 } }),
  ]);
  assert.deepEqual(stats.vocabularyStatistics([vocab], now), {
    lists: 1, words: 3, practicedWords: 2, attempts: 4, correct: 3,
    wrong: 1, accuracyPercent: 75, dueNow: 2, scheduled: 1, mastered: 1,
  });
});

test('storage: empty, persist and reload exact counters', async () => {
  assert.deepEqual(await storage.loadVocabulary(), data());
  const original = data([list([word('a', 'hi', 'hallo', { correct: 4, wrong: 1 })])]);
  await storage.saveVocabulary(original);
  assert.equal(memory.has(storage.VOCABULARY_STORAGE_KEY), true);
  assert.deepEqual(await storage.loadVocabulary(), original);
});

test('storage: review changes only targeted word and sets future review date', () => {
  const original = data([list([word('a', 'hi', 'hallo'), word('b', 'bye', 'tschüss')])]);
  const next = storage.applyVocabularyReview(original, 'list-1', 'a', true);
  assert.equal(original.lists[0].words[0].correct, 0);
  assert.equal(next.lists[0].words[0].correct, 1);
  assert.equal(next.lists[0].words[0].wrong, 0);
  assert.deepEqual(next.lists[0].words[1], original.lists[0].words[1]);
  assert.ok(next.lists[0].words[0].review.dueAt > Date.now());
  assert.equal(storage.dueVocabularyWords(next.lists[0]).length, 1);
});

test('storage: malformed JSON and unsupported versions reject without overwrite', async () => {
  const original = data([list([word('a', 'hi', 'hallo')])]);
  await storage.saveVocabulary(original);
  await assert.rejects(storage.saveVocabulary({ version: 2, lists: [] }), /Unsupported vocabulary/);
  assert.deepEqual(await storage.loadVocabulary(), original);
  memory.set(storage.VOCABULARY_STORAGE_KEY, '{bad json');
  await assert.rejects(storage.loadVocabulary());
});

test('import/export: round-trip and repeated import is idempotent', () => {
  const original = data([list([word('a', 'hi', 'hallo', { correct: 2 })])]);
  const exported = transfer.exportVocabularyJson(original);
  const imported = transfer.mergeVocabularyJson(data(), exported);
  assert.equal(imported.addedLists, 1);
  assert.equal(imported.skippedLists, 0);
  assert.deepEqual(imported.data, original);
  const repeated = transfer.mergeVocabularyJson(imported.data, exported);
  assert.equal(repeated.addedLists, 0);
  assert.equal(repeated.skippedLists, 1);
  assert.deepEqual(repeated.data, original);
});

test('import: rejects oversized and malformed JSON', () => {
  assert.throws(() => transfer.mergeVocabularyJson(data(), '{bad'), /Invalid JSON/);
  assert.throws(() => transfer.mergeVocabularyJson(data(), ' '.repeat(1_000_001)), /too large/i);
  assert.throws(() => transfer.mergeVocabularyJson(data(), JSON.stringify({ version: 2, lists: [] })), /Unsupported vocabulary/);
});

test('import: rejects duplicate list IDs, duplicate word IDs and empty translations', () => {
  assert.throws(() => transfer.mergeVocabularyJson(data(), JSON.stringify(data([list([]), list([])]))), /Duplicate list IDs/);
  assert.throws(() => transfer.mergeVocabularyJson(data(), JSON.stringify(data([list([word('a', 'one', 'uno'), word('a', 'two', 'dos')])]))), /Duplicate word IDs/);
  assert.throws(() => transfer.mergeVocabularyJson(data(), JSON.stringify(data([list([word('a', 'one', ' ')])]))), /Each word needs/);
});

test('import: never overwrites existing list with matching ID', () => {
  const existing = data([list([word('a', 'hi', 'hallo', { correct: 8 })])]);
  const incoming = data([list([word('b', 'bye', 'tschüss')])]);
  const merged = transfer.mergeVocabularyJson(existing, JSON.stringify(incoming));
  assert.deepEqual(merged.data, existing);
  assert.equal(merged.skippedLists, 1);
});

test('storage: rejects corrupted counters and invalid SRS review data', () => {
  const invalidCounter = data([list([word('a', 'hi', 'hallo', { correct: 'invalid' })])]);
  assert.throws(() => storage.cleanVocabulary(invalidCounter), /Invalid vocabulary statistics/);
  const invalidReview = data([list([word('a', 'hi', 'hallo', {
    review: { interval: 1, ease: '2.5', dueAt: 100, streak: 1 },
  })])]);
  assert.throws(() => storage.cleanVocabulary(invalidReview), /Invalid vocabulary review/);
});

test('architecture: public feature entry points forward the original runtime functions', () => {
  const cases = [
    ['storage', 'data/storage', ['loadVocabulary', 'saveVocabulary', 'cleanVocabulary', 'applyVocabularyReview']],
    ['transfer', 'data/transfer', ['exportVocabularyJson', 'mergeVocabularyJson']],
    ['statistics', 'analytics/statistics', ['vocabularyStatistics']],
    ['multiple-choice', 'exercises/multiple-choice', ['makeMultipleChoiceQuestion', 'checkMultipleChoiceAnswer']],
    ['word-bank', 'exercises/word-bank', ['makeWordBankQuestion', 'checkWordBankAnswer']],
    ['writing', 'exercises/writing', ['checkWritingAnswer', 'normalizeWritingAnswer']],
  ];
  for (const [entry, implementation, exports] of cases) {
    const publicApi = loadTypescript('src/features/vocabulary/' + entry + '.ts');
    const nested = loadTypescript('src/features/vocabulary/' + implementation + '.ts');
    for (const name of exports) {
      assert.equal(publicApi[name], nested[name], entry + ': ' + name);
    }
  }
  assert.equal(storage.VOCABULARY_STORAGE_KEY, 'red-poly:vocabulary-v1');
});
