import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as publicArchive from "../src/lib/complete-device-backup.mjs";
import * as domainArchive from "../src/features/backup/domain/complete-device-backup.mjs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("legacy complete archive entry forwards identical runtime functions and constants", () => {
  for (const name of [
    "makeCompleteDeviceBackup", "inspectCompleteDeviceBackup",
    "exportStableCompleteDeviceBackup", "DEVICE_BACKUP_FORMAT",
    "DEVICE_BACKUP_VERSION", "MAX_DEVICE_BACKUP_CHARS",
  ]) {
    assert.equal(publicArchive[name], domainArchive[name], name);
  }
  assert.equal(publicArchive.DEVICE_BACKUP_FORMAT, "red-poly-device-backup");
  assert.equal(publicArchive.DEVICE_BACKUP_VERSION, 1);
});

test("backup remains export-only with no destructive full-device restore", () => {
  const domain = read("src/features/backup/domain/complete-device-backup.mjs");
  const adapter = read("src/features/backup/data/device-export.ts");
  const ui = read("src/features/backup/ui/complete-backup-export.tsx");
  assert.match(domain, /restoreSupported: false/);
  assert.match(domain, /learning data changed during export/);
  assert.match(adapter, /exportStableCompleteDeviceBackup/);
  assert.match(adapter, /loadConversation/);
  assert.match(adapter, /loadVocabulary/);
  assert.match(ui, /Nur Export/);
  assert.doesNotMatch(ui, /restoreCompleteDeviceBackup/);
  assert.doesNotMatch(adapter, /restoreCompleteDeviceBackup/);
});

test("app routes keep their prior imports while implementations live under backup/", () => {
  const screen = read("src/app/backup.tsx");
  const uiEntry = read("src/components/complete-backup-export.tsx");
  const exportEntry = read("src/features/backup/device-export.ts");
  assert.match(screen, /from "@\/components\/complete-backup-export"/);
  assert.match(uiEntry, /export \{ CompleteBackupExport \} from "@\/features\/backup\/ui\/complete-backup-export"/);
  assert.match(exportEntry, /export \* from "\.\/data\/device-export"/);
  assert.match(read("src/lib/complete-device-backup.mjs"), /export \* from "\.\.\/features\/backup\/domain\/complete-device-backup\.mjs"/);
});

test("versioned local storage and backup declaration remain untouched", () => {
  const adapter = read("src/features/backup/data/device-export.ts");
  const declaration = read("src/lib/complete-device-backup.d.mts");
  assert.match(adapter, /CONVERSATION_STORAGE_KEY/);
  assert.match(adapter, /exportPersistedProgressBackup/);
  assert.match(declaration, /restoreSupported: false/);
});
