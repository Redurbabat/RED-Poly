import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const path = process.argv[2];
if (!path) throw new Error("Provide the Expo introspection JSON path.");
const config = JSON.parse(readFileSync(path, "utf8"));
const native = config._internal?.modResults;

test("Expo evaluates the iOS microphone and speech-recognition permission plugins", () => {
  assert.ok(native?.ios?.infoPlist, "Expo iOS Info.plist introspection missing");
  const plist = native.ios.infoPlist;
  assert.match(plist.NSMicrophoneUsageDescription ?? "", /RED POLY.*Mikrofon/i);
  assert.match(plist.NSSpeechRecognitionUsageDescription ?? "", /RED POLY.*Spracherkennung/i);
  assert.match(plist.NSSpeechRecognitionUsageDescription ?? "", /Zustimmung/i);
});

test("Expo evaluates Android microphone permission in the generated manifest", () => {
  assert.ok(native?.android?.manifest, "Expo AndroidManifest introspection missing");
  const permissions = native.android.manifest.manifest?.["uses-permission"] ?? [];
  assert.ok(
    permissions.some((entry) => entry?.$?.["android:name"] === "android.permission.RECORD_AUDIO"),
    "Android RECORD_AUDIO permission missing after config plugins",
  );
});

test("introspected app uses RED POLY identifiers without a foreign EAS project", () => {
  assert.equal(config.ios?.bundleIdentifier, "com.redurbabat.redpoly");
  assert.equal(config.android?.package, "com.redurbabat.redpoly");
  assert.equal(config.slug, "red-poly");
  assert.equal(config.owner, undefined);
  assert.equal(config.extra?.eas?.projectId, undefined);
});
