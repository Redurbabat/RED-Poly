const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("Expo entry and TypeScript scripts stay on the existing app", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.main, "expo-router/entry");
  assert.ok(pkg.dependencies.expo);
  assert.ok(pkg.devDependencies.typescript);
  assert.ok(fs.existsSync(path.join(root, "bun.lock")));
});

test("required primitives are shared and exported", () => {
  const code = read("src/components/red-poly-ui.tsx");
  for (const name of ["PolyButton", "PolyCard", "PolyTextField", "PolyNavItem",
    "PolyDialog", "PolyLoading", "PolyError", "PolyProgress",
    "PolyGlassSurface", "usePolyMotion"]) {
    assert.match(code, new RegExp("export function " + name + "\\b"));
  }
  assert.match(code, /reduceMotionChanged/);
  assert.match(code, /reduceTransparencyChanged/);
});

test("progress exposes a clamped numeric value to web screen readers", () => {
  const code = read("src/components/red-poly-ui.tsx");
  assert.match(code, /accessibilityValue=\{\{ min: 0, max: 100/);
  assert.match(code, /aria-valuemin=\{0\}/);
  assert.match(code, /aria-valuemax=\{100\}/);
  assert.match(code, /aria-valuenow=\{Math\.round\(ratio \* 100\)\}/);
  assert.match(code, /Math\.max\(0, Math\.min\(1,/);
});

test("tab selection exposes both native and web accessibility state", () => {
  const code = read("src/components/red-poly-ui.tsx");
  assert.match(code, /accessibilityState=\{\{ selected: !!selected \}\}/);
  assert.match(code, /aria-selected=\{!!selected\}/);
});

test("native glass uses availability checks and accessibility fallback", () => {
  const code = read("src/components/red-poly-ui.tsx");
  assert.match(code, /<GlassView/);
  assert.match(code, /isLiquidGlassAvailable\(\)/);
  assert.match(code, /isGlassEffectAPIAvailable\(\)/);
  assert.match(code, /Platform\.OS === "ios" && !reduceTransparency/);
  assert.match(code, /backgroundColor: reduceTransparency \|\| Platform\.OS === "web"/);
});

test("accessibility defaults avoid initial glass or motion flashes", () => {
  const code = read("src/components/red-poly-ui.tsx");
  assert.match(code, /const \[reduceTransparency, setReduceTransparency\] = useState\(true\)/);
  assert.match(code, /const \[reduced, setReduced\] = useState\(true\)/);
  assert.match(code, /animationType=\{reducedMotion \? "none" : "fade"\}/);
  assert.match(code, /<KeyboardAvoidingView/);
  assert.match(code, /accessibilityViewIsModal/);
});

test("ESLint exceptions remain limited to two pre-existing layout/lesson files", () => {
  const config = read("eslint.config.js");
  assert.match(config, /src\/app\/_layout\.tsx/);
  assert.ok(config.includes("src/app/lesson/[[]id[]].tsx"));
  assert.match(config, /react-hooks\/refs/);
});

test("design preview is development-only and demonstrates every primitive", () => {
  const code = read("src/app/design-lab.tsx");
  assert.ok(code.includes('return __DEV__ ? <DesignLab /> : <Redirect href="/(tabs)" />;'));
  for (const name of ["PolyButton", "PolyCard", "PolyTextField", "PolyNavItem",
    "PolyDialog", "PolyLoading", "PolyError", "PolyProgress", "PolyGlassSurface",
    "usePolyMotion"]) {
    assert.match(code, new RegExp("<" + name + "\\b|\\b" + name + "\\("));
  }
  assert.match(code, /setProgress/);
  assert.match(code, /setDialogOpen/);
  assert.match(code, /onChangeText=\{setQuery\}/);
});

test("backup transfer is UI-only and production preview route redirects", () => {
  const ui = read("src/components/poly-backup-transfer.tsx");
  const demo = read("src/app/backup-lab.tsx");
  assert.match(ui, /confirmation !== "ERSETZEN"/);
  assert.match(ui, /checkBackupEnvelope\(incoming\)/);
  assert.match(ui, /const backup = pending/);
  assert.match(ui, /busyRef\.current = true/);
  assert.ok(!ui.includes("from \"@/lib/store\""));
  assert.ok(demo.includes('return __DEV__ ? <BackupLab /> : <Redirect href="/(tabs)" />;'));
  assert.ok(demo.includes("NUR SIMULATION"));
});

test("existing persisted progress key must not change", () => {
  assert.match(read("src/lib/store.ts"), /progress-v2/);
});

test("SRS review logic preserves boundaries and due scheduling", () => {
  const source = read("src/lib/srs.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module, Date, Math });
  const { reviewWord, isDue, dueInDays } = module.exports;
  const before = Date.now();
  const first = reviewWord(undefined, 2);
  assert.equal(first.streak, 1);
  assert.equal(first.interval, 1);
  assert.ok(first.dueAt >= before + 86_400_000);
  assert.equal(isDue(first, before), false);
  assert.equal(dueInDays(first, before), 1);
  const failed = reviewWord(first, 0);
  assert.equal(failed.streak, 0);
  assert.equal(failed.interval, 0);
  assert.ok(failed.ease >= 1.3);
});

test("export failure clears stale backup and native share is user-initiated only", () => {
  const code = read("src/components/poly-backup-transfer.tsx");
  const exportStart = code.indexOf('onPress={() => execute("export"');
  const clear = code.indexOf('setExported("");', exportStart);
  const exportCall = code.indexOf("await exportPersistedBackup()", exportStart);
  assert.ok(exportStart >= 0 && clear > exportStart && clear < exportCall,
    "remove stale snapshot before awaiting the new export");
  assert.match(code, /Platform\.OS !== "web"/);
  assert.match(code, /Share\.share\(/);
  assert.match(code, /execute\("share"/);
  assert.match(code, /label="Exportanzeige löschen"/);
});
