const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/components/poly-backup-envelope.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleRef = { exports: {} };
vm.runInNewContext(compiled, { exports: moduleRef.exports, module: moduleRef, JSON }, { filename: "poly-backup-envelope.js" });
const { checkBackupEnvelope, MAX_BACKUP_CHARACTERS } = moduleRef.exports;

test("UI preflight accepts an appropriate backup envelope without claiming deep validation", () => {
  assert.equal(checkBackupEnvelope(JSON.stringify({
    format: "red-poly-progress", version: 1, state: { dailyGoal: 30 },
  })), null);
});

test("UI preflight rejects empty, malformed and incompatible envelopes", () => {
  assert.equal(checkBackupEnvelope("   "), "Bitte zuerst ein Backup einfügen.");
  assert.equal(checkBackupEnvelope("{broken"), "Das Backup enthält kein gültiges JSON.");
  for (const invalid of [
    [],
    null,
    { version: 1, state: {} },
    { format: "red-poly-progress", version: 2, state: {} },
    { format: "red-poly-progress", version: 1, state: [] },
  ]) {
    assert.equal(
      checkBackupEnvelope(JSON.stringify(invalid)),
      "Unbekanntes Backupformat oder falsche Version.",
    );
  }
});

test("UI preflight rejects oversized text before attempting JSON.parse", () => {
  assert.equal(MAX_BACKUP_CHARACTERS, 8_000_000);
  assert.equal(
    checkBackupEnvelope("x".repeat(MAX_BACKUP_CHARACTERS + 1)),
    "Backup ist zu gross (maximal 8 Millionen Zeichen).",
  );
});
