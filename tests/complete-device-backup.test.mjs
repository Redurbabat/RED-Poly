import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeCompleteDeviceBackup, inspectCompleteDeviceBackup,
  exportStableCompleteDeviceBackup, MAX_DEVICE_BACKUP_CHARS,
} from "../src/lib/complete-device-backup.mjs";
import { migrateProgressData, createProgressBackup } from "../src/lib/progress-data.mjs";

function sample() {
  const progress = JSON.parse(createProgressBackup(migrateProgressData({}, 0), 1_700_000_000_000));
  const vocabulary = {
    version: 1, lists: [{
      id: "list-de", title: "Deutsch", category: "", courseId: "de-en",
      words: [{ id: "w1", value: "Haus", translation: "house", example: "",
        createdAt: 1, updatedAt: 2, correct: 1, wrong: 0 }],
    }],
  };
  const conversation = { language: "de", level: "B1", topic: "work",
    messages: [{ id: "m1", role: "learner", text: "Guten Morgen", at: 1 }] };
  return { progress, vocabulary, conversation };
}

test("complete archive contains exact course, vocabulary and conversation data", () => {
  const data = sample();
  const backup = makeCompleteDeviceBackup(data, 1_700_000_000_000);
  const parsed = inspectCompleteDeviceBackup(backup);
  assert.equal(parsed.format, "red-poly-device-backup");
  assert.equal(parsed.version, 1);
  assert.equal(parsed.restoreSupported, false);
  assert.deepEqual(parsed.data, data);
  assert.equal(parsed.exportedAt, new Date(1_700_000_000_000).toISOString());
});

test("empty conversation remains an explicit null, not a dropped archive section", () => {
  const data = { ...sample(), conversation: null };
  const parsed = inspectCompleteDeviceBackup(makeCompleteDeviceBackup(data));
  assert.equal(parsed.data.conversation, null);
});

test("rejects invalid schemas, duplicate word IDs and corrupted progress", () => {
  const data = sample();
  assert.throws(() => makeCompleteDeviceBackup({ ...data, vocabulary: { version: 2, lists: [] } }), /vocabulary schema/);
  const duplicate = structuredClone(data.vocabulary);
  duplicate.lists[0].words.push({ ...duplicate.lists[0].words[0] });
  assert.throws(() => makeCompleteDeviceBackup({ ...data, vocabulary: duplicate }), /duplicate vocabulary word ID/);
  assert.throws(() => makeCompleteDeviceBackup({ ...data, progress: { ...data.progress, format: "wrong" } }), /progress envelope/);
  assert.throws(() => makeCompleteDeviceBackup({ ...data, conversation: { ...data.conversation, messages: [{ id: "a", role: "unknown", text: "x", at: 1 }] } }), /conversation message/);
  assert.throws(() => inspectCompleteDeviceBackup("{}"), /archive format/);
  assert.throws(() => inspectCompleteDeviceBackup("{bad"), /malformed JSON/);
  assert.throws(() => inspectCompleteDeviceBackup("x".repeat(MAX_DEVICE_BACKUP_CHARS + 1)), /archive size/);
});

test("double read produces stable backup without altering any source", async () => {
  const data = sample();
  const before = structuredClone(data);
  const readers = {
    readProgress: async () => JSON.stringify(data.progress),
    readVocabulary: async () => data.vocabulary,
    readConversation: async () => data.conversation,
  };
  const parsed = inspectCompleteDeviceBackup(await exportStableCompleteDeviceBackup(readers, 1_700_000_000_000));
  assert.deepEqual(parsed.data, before);
  assert.deepEqual(data, before);
});

test("rejects updates during export, rather than silently saving mixed versions", async () => {
  const data = sample();
  let count = 0;
  const readers = {
    readProgress: async () => JSON.stringify(data.progress),
    readVocabulary: async () => {
      count += 1;
      return { ...data.vocabulary, lists: count === 1 ? data.vocabulary.lists : [] };
    },
    readConversation: async () => data.conversation,
  };
  await assert.rejects(exportStableCompleteDeviceBackup(readers), /learning data changed during export/);
});

test("no data is written and failed readers do not produce incomplete archives", async () => {
  const data = sample();
  const readers = {
    readProgress: async () => JSON.stringify(data.progress),
    readVocabulary: async () => { throw Error("corrupt legacy vocabulary"); },
    readConversation: async () => data.conversation,
  };
  await assert.rejects(exportStableCompleteDeviceBackup(readers), /corrupt legacy vocabulary/);
});
