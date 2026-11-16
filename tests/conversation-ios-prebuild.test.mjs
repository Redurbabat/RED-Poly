import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(process.cwd(), "ios");
const projectFolder = readdirSync(root).find((entry) => entry.endsWith(".xcodeproj"));
if (!projectFolder) throw new Error("No generated .xcodeproj found.");
const project = readFileSync(join(root, projectFolder, "project.pbxproj"), "utf8");
const appFolders = readdirSync(root, { withFileTypes: true })
  .filter((item) => item.isDirectory() && !item.name.endsWith(".xcodeproj"))
  .map((item) => join(root, item.name));
const plist = appFolders
  .map((dir) => {
    try { return readFileSync(join(dir, "Info.plist"), "utf8"); } catch { return null; }
  })
  .find((value) => value !== null);
if (!plist) throw new Error("No generated Info.plist found.");

test("generated iOS Xcode project has RED POLY bundle identifier", () => {
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.redurbabat\.redpoly/);
  assert.doesNotMatch(project, /com\.ahmet\.lingo/);
});
test("generated iOS Info.plist contains both permission descriptions", () => {
  assert.match(plist, /NSMicrophoneUsageDescription/);
  assert.match(plist, /NSSpeechRecognitionUsageDescription/);
  assert.match(plist, /RED POLY/);
});
test("generated iOS Info.plist has the RED POLY URL scheme", () => {
  assert.match(plist, /redpoly/);
});
