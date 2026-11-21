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

test("the real backup route is reachable from Profile and uses guarded persistence", () => {
  const profile = read("src/app/(tabs)/profile.tsx");
  const backup = read("src/app/backup.tsx");
  assert.match(profile, /router\.push\("\/backup"\)/);
  assert.match(backup, /exportPersistedProgressBackup/);
  assert.match(backup, /restoreProgressBackup/);
  assert.match(backup, /PolyBackupTransfer/);
  assert.match(read("src/lib/store.ts"), /export async function restoreProgressBackup/);
});

test("iPhone gets a single real system tab bar while Android/web keep existing tabs", () => {
  const entry = read("src/app/(tabs)/_layout.tsx");
  const ios = read("src/components/navigation/poly-tabs.ios.tsx");
  const other = read("src/components/navigation/poly-tabs.tsx");
  assert.match(entry, /import PolyTabNavigator from "@\/components\/navigation\/poly-tabs"/);
  assert.match(ios, /expo-router\/unstable-native-tabs/);
  assert.match(ios, /<NativeTabs[\s>]/);
  assert.equal((ios.match(/<NativeTabs\.Trigger name=/g) || []).length, 3);
  for (const tab of ["index", "practice", "profile"]) {
    assert.ok(ios.includes('name="' + tab + '"'), tab);
    assert.ok(other.includes('name="' + tab + '"'), tab);
  }
  assert.match(ios, /Trigger\.Icon sf=/);
  assert.ok(!ios.includes("GlassView"), "do not overlay the iOS system bar with fake glass");
  assert.match(other, /import \{ Tabs \} from "expo-router"/);
});

test("Cloudflare publishing has one owner: Workers Builds, GitHub Actions only validates", () => {
  const workflow = read(".github/workflows/cloudflare-workers.yml");
  const readme = read("README.md");
  assert.match(workflow, /wrangler@4 deploy --dry-run/);
  assert.match(workflow, /wrangler@4 dev --local/);
  assert.doesNotMatch(workflow, /run:\s*(bunx|npx) wrangler@4 deploy\s*$/m);
  assert.doesNotMatch(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(readme, /Cloudflare Workers Builds/);
  const config = readJson("wrangler.jsonc");
  assert.equal(config.name, "red-poly");
  assert.equal(config.main, "./worker/index.ts");
  assert.equal(config.assets.binding, "ASSETS");
});
