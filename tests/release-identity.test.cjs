const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkReleaseIdentity } = require("../scripts/release-identity-guard.cjs");

function ownConfig() {
  return {
    expo: {
      name: "RED POLY",
      slug: "red-poly",
      scheme: "redpoly",
      owner: "own-eas-account",
      ios: { bundleIdentifier: "com.example.redpoly" },
      android: { package: "com.example.redpoly" },
      extra: { eas: { projectId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" } },
    },
  };
}

test("release guard rejects the imported Lingo identities without changing them", () => {
  const foreign = {
    expo: {
      name: "Lingo",
      slug: "lingo",
      scheme: "lingo",
      owner: "ahmet909",
      ios: { bundleIdentifier: "com.ahmet.lingo" },
      android: { package: "com.ahmet.lingo" },
      extra: { eas: { projectId: "c5e5ee9a-1aac-4b7c-ba0f-a97897c4d348" } },
    },
  };
  const issues = checkReleaseIdentity(foreign, {
    submit: { production: { ios: { ascAppId: "6781818623" } } },
  });
  assert.equal(issues.length, 8);
  assert.ok(issues.some((v) => v.field === "expo.ios.bundleIdentifier"));
  assert.ok(issues.some((v) => v.field === "eas.submit.production.ios.ascAppId"));
});

test("release guard permits a synthetic own-identity configuration", () => {
  assert.deepEqual(checkReleaseIdentity(ownConfig(), { submit: {} }), []);
});

test("release guard detects missing EAS project and Android package", () => {
  const own = ownConfig();
  delete own.expo.extra.eas.projectId;
  delete own.expo.android.package;
  const issues = checkReleaseIdentity(own, {});
  assert.deepEqual(issues.map((v) => v.field).sort(), [
    "expo.android.package",
    "expo.extra.eas.projectId",
  ]);
});

test("CLI blocks RED POLY until a real EAS owner and project are linked, without mutating config", () => {
  const root = path.resolve(__dirname, "..");
  const appFile = path.join(root, "app.json");
  const easFile = path.join(root, "eas.json");
  const before = [fs.readFileSync(appFile, "utf8"), fs.readFileSync(easFile, "utf8")];
  const result = spawnSync(process.execPath, ["scripts/release-identity-guard.cjs"], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.status, 2, `expected release block; output: ${result.stderr || result.stdout}`);
  assert.match(result.stdout, /RELEASE BLOCKED: 2/);
  assert.deepEqual([fs.readFileSync(appFile, "utf8"), fs.readFileSync(easFile, "utf8")], before);
});

test("CLI --audit reports missing EAS linkage without blocking ordinary QA", () => {
  const root = path.resolve(__dirname, "..");
  const result = spawnSync(process.execPath, ["scripts/release-identity-guard.cjs", "--audit"], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RELEASE BLOCKED: 2/);
});
