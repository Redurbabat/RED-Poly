const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const readJson = (file) => JSON.parse(read(file));

test("vocabulary and conversation are reachable from the existing Practice tab", () => {
  const practice = read("src/app/(tabs)/practice.tsx");
  assert.match(practice, /router\.push\("\/vocabulary"\)/);
  assert.match(practice, /router\.push\("\/conversation"\)/);
  assert.match(practice, /offline example tutor/i);
  assert.match(read("src/app/vocabulary.tsx"), /export default function VocabularyScreen/);
  assert.match(read("src/app/conversation.tsx"), /export default function ConversationScreen/);
});

test("RED POLY identity and speech permissions are preserved with SPA export", () => {
  const expo = readJson("app.json").expo;
  assert.equal(expo.name, "RED POLY");
  assert.equal(expo.ios.bundleIdentifier, "com.redurbabat.redpoly");
  assert.equal(expo.android.package, "com.redurbabat.redpoly");
  assert.equal(expo.web.output, "single");
  assert.ok(expo.plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === "expo-speech-recognition"));
  assert.ok(!expo.owner);
  assert.ok(!expo.extra?.eas?.projectId);
});

test("Expo speech, regression tests, and Cloudflare remain configured", () => {
  const pkg = readJson("package.json");
  assert.equal(pkg.dependencies["expo-speech-recognition"], "56.0.4");
  for (const script of ["build:web", "cloudflare:deploy", "test:core", "test:integration"]) {
    assert.equal(typeof pkg.scripts[script], "string");
  }
  const cf = readJson("wrangler.jsonc");
  assert.equal(cf.assets.directory, "./dist");
  assert.ok(cf.assets.run_worker_first.includes("/api/*"));
  assert.match(read("worker/index.ts"), /api\/health/);
  assert.match(read("src/lib/store.ts"), /progress-v2/);
});
