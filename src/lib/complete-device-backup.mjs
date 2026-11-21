import { parseProgressBackup } from "./progress-data.mjs";

export const DEVICE_BACKUP_FORMAT = "red-poly-device-backup";
export const DEVICE_BACKUP_VERSION = 1;
export const MAX_DEVICE_BACKUP_CHARS = 12_000_000;
const validObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const nonNegative = (v) => Number.isSafeInteger(v) && v >= 0;
const ensure = (ok, reason) => { if (!ok) throw new Error("Invalid RED POLY device archive: " + reason); };

function checkVocabulary(value) {
  ensure(validObject(value) && value.version === 1 && Array.isArray(value.lists), "vocabulary schema");
  const listIds = new Set();
  for (const list of value.lists) {
    ensure(validObject(list) && nonEmpty(list.id) && nonEmpty(list.title) &&
      nonEmpty(list.courseId) && Array.isArray(list.words), "vocabulary list");
    ensure(!listIds.has(list.id), "duplicate vocabulary list ID");
    listIds.add(list.id);
    const wordIds = new Set();
    for (const word of list.words) {
      ensure(validObject(word) && nonEmpty(word.id) && nonEmpty(word.value) &&
        nonEmpty(word.translation), "vocabulary word");
      ensure(!wordIds.has(word.id), "duplicate vocabulary word ID");
      wordIds.add(word.id);
      ensure(nonNegative(word.correct) && nonNegative(word.wrong), "vocabulary review counters");
    }
  }
  return value;
}

function checkConversation(value) {
  if (value === null) return null;
  ensure(validObject(value) && ["en", "de", "fr", "es", "it", "pt"].includes(value.language) &&
    ["A1", "A2", "B1", "B2", "C1"].includes(value.level) &&
    ["introductions", "travel", "food", "work"].includes(value.topic) &&
    Array.isArray(value.messages) && value.messages.length <= 100, "conversation schema");
  for (const msg of value.messages) {
    ensure(validObject(msg) && nonEmpty(msg.id) &&
      (msg.role === "learner" || msg.role === "tutor") && typeof msg.text === "string" &&
      Number.isFinite(msg.at), "conversation message");
  }
  return value;
}

/**
 * Portable, read-only envelope for all three existing device data stores.
 * Not a restore endpoint. No user content is sent to a server.
 */
export function makeCompleteDeviceBackup({ progress, vocabulary, conversation }, now = Date.now()) {
  ensure(validObject(progress) && progress.format === "red-poly-progress" &&
    progress.version === 1, "progress envelope");
  parseProgressBackup(JSON.stringify(progress)); // deep Core Data validation
  checkVocabulary(vocabulary);
  checkConversation(conversation);
  ensure(Number.isFinite(now), "export timestamp");
  const archive = {
    format: DEVICE_BACKUP_FORMAT,
    version: DEVICE_BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    restoreSupported: false,
    data: { progress, vocabulary, conversation },
  };
  const serialized = JSON.stringify(archive);
  ensure(serialized.length <= MAX_DEVICE_BACKUP_CHARS, "archive too large");
  return serialized;
}

export function inspectCompleteDeviceBackup(serialized) {
  ensure(typeof serialized === "string" && serialized.length <= MAX_DEVICE_BACKUP_CHARS, "archive size");
  let archive;
  try { archive = JSON.parse(serialized); }
  catch { throw new Error("Invalid RED POLY device archive: malformed JSON"); }
  ensure(validObject(archive) && archive.format === DEVICE_BACKUP_FORMAT &&
    archive.version === DEVICE_BACKUP_VERSION && validObject(archive.data), "archive format");
  ensure(typeof archive.exportedAt === "string" &&
    Number.isFinite(Date.parse(archive.exportedAt)), "export time");
  // Validates every section. This function intentionally has no storage writes.
  makeCompleteDeviceBackup(archive.data, Date.parse(archive.exportedAt));
  return archive;
}

/**
 * Two complete reads detect changes while exporting independent stores.
 * A stable snapshot is only returned if both readings contain identical data.
 * The currently separated stores are not represented as an atomic transaction.
 */
export async function exportStableCompleteDeviceBackup(readers, now = Date.now()) {
  const read = async () => ({
    progress: JSON.parse(await readers.readProgress()),
    vocabulary: await readers.readVocabulary(),
    conversation: await readers.readConversation(),
  });
  const first = inspectCompleteDeviceBackup(makeCompleteDeviceBackup(await read(), now));
  const second = inspectCompleteDeviceBackup(makeCompleteDeviceBackup(await read(), now));
  // The progress export generates a new exportedAt on every read;
  // compare saved user data, not that metadata timestamp.
  const contents = ({ progress, vocabulary, conversation }) => ({
    progress: { format: progress.format, version: progress.version, state: progress.state },
    vocabulary, conversation,
  });
  ensure(JSON.stringify(contents(first.data)) === JSON.stringify(contents(second.data)),
    "learning data changed during export; retry without editing");
  return JSON.stringify(first);
}
