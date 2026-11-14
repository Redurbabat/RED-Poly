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
