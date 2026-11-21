import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as progressPublic from "../src/lib/progress-data.mjs";
import * as progressDomain from "../src/features/progress/domain/progress-data.mjs";
import * as storagePublic from "../src/lib/progress-storage.mjs";
import * as storageData from "../src/features/progress/data/progress-storage.mjs";
import * as guardPublic from "../src/lib/progress-write-guard.mjs";
import * as guardData from "../src/features/progress/data/progress-write-guard.mjs";
import * as transferPublic from "../src/lib/progress-transfer.mjs";
import * as transferService from "../src/features/progress/transfer/progress-transfer.mjs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("progress domain and legacy exports use identical live runtime objects", () => {
  const groups = [
    ["progress-data", progressPublic, progressDomain],
    ["progress-storage", storagePublic, storageData],
    ["progress-write-guard", guardPublic, guardData],
    ["progress-transfer", transferPublic, transferService],
  ];
  for (const [name, stableApi, implementation] of groups) {
    const keys = Object.keys(implementation).sort();
    assert.ok(keys.length > 0, name + " unexpectedly empty");
    assert.deepEqual(Object.keys(stableApi).sort(), keys);
    for (const key of keys) assert.equal(stableApi[key], implementation[key], name + "." + key);
  }
});

test("existing local storage identifiers and formats remain unchanged", () => {
  assert.equal(progressPublic.PROGRESS_STORAGE_KEY, "progress-v2");
  assert.equal(progressPublic.RESTORE_CHECKPOINT_KEY, "progress-v2-restore-checkpoint");
  assert.equal(progressPublic.PROGRESS_STORAGE_VERSION, 1);
  assert.equal(progressPublic.BACKUP_FORMAT, "red-poly-progress");
  assert.equal(typeof transferPublic.restoreVerifiedProgressBackup, "function");
  assert.equal(typeof transferPublic.exportVerifiedProgressBackup, "function");
  assert.equal(typeof guardPublic.createProgressWriteGuard, "function");
  assert.equal(typeof storagePublic.createSerializedProgressStorage, "function");
});

test("Expo store, backup and legacy importer still use their original public paths", () => {
  const store = read("src/lib/store.ts");
  const backup = read("src/features/backup/domain/complete-device-backup.mjs");
  const bridge = read("src/lib/vocabulary-bridge.mjs");
  const transfer = read("src/features/progress/transfer/progress-transfer.mjs");
  assert.match(store, /from "\.\/progress-data\.mjs"/);
  assert.match(store, /from "\.\/progress-write-guard\.mjs"/);
  assert.match(store, /from "\.\/progress-storage\.mjs"/);
  assert.match(store, /from "\.\/progress-transfer\.mjs"/);
  assert.match(backup, /from "\.\.\/\.\.\/\.\.\/lib\/progress-data\.mjs"/);
  assert.match(bridge, /from "\.\/progress-data\.mjs"/);
  assert.match(transfer, /from "\.\.\/domain\/progress-data\.mjs"/);
  assert.match(transfer, /from "\.\.\/\.\.\/\.\.\/lib\/vocabulary-bridge\.mjs"/);
});

test("migration safety and serialization guards remain in their implementations", () => {
  const data = read("src/features/progress/domain/progress-data.mjs");
  const storage = read("src/features/progress/data/progress-storage.mjs");
  const guard = read("src/features/progress/data/progress-write-guard.mjs");
  const transfer = read("src/features/progress/transfer/progress-transfer.mjs");
  assert.match(data, /restoreProgressBackupToStorage/);
  assert.match(data, /validateProgressData/);
  assert.match(storage, /lastOperation/);
  assert.match(storage, /trackWrite/);
  assert.match(guard, /waitForWrites/);
  assert.match(guard, /acquire/);
  assert.match(transfer, /takeVerifiedSnapshot/);
  assert.match(transfer, /requireHydrated/);
});
