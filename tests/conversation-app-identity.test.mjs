import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
const eas = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));
const config = app.expo;

test("RED POLY has its own stable display, URL and native identity", () => {
  assert.equal(config.name, "RED POLY");
  assert.equal(config.slug, "red-poly");
  assert.equal(config.scheme, "redpoly");
  assert.equal(config.ios.bundleIdentifier, "com.redurbabat.redpoly");
  assert.equal(config.android.package, "com.redurbabat.redpoly");
});
test("no inherited account, EAS project or App Store submission identifier", () => {
  assert.equal(Object.hasOwn(config, "owner"), false);
  assert.equal(config.extra?.eas?.projectId, undefined);
  assert.equal(eas.submit?.production?.ios?.ascAppId, undefined);
});
test("native speech plugin remains declared with user-facing permission notices", () => {
  const plugin = config.plugins.find((p) => Array.isArray(p) && p[0] === "expo-speech-recognition");
  assert.ok(plugin, "required native speech recognition plugin");
  assert.match(plugin[1].microphonePermission, /Mikrofon/);
  assert.match(plugin[1].speechRecognitionPermission, /Zustimmung/);
});
test("development build is configured, but no release submissions are configured", () => {
  assert.equal(eas.build.development.developmentClient, true);
  assert.equal(eas.build.development.distribution, "internal");
  assert.equal(eas.submit, undefined);
});
