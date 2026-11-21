import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { organizeArtifacts, OUTPUT_DIRECTORIES } from "../scripts/build-layout.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "red-poly-build-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "worker"), { recursive: true });
  writeFileSync(join(root, "worker/index.ts"), "export default {fetch: () => new Response('ok')};\n");
  writeFileSync(join(root, "wrangler.jsonc"), JSON.stringify({
    name: "red-poly", main: "./worker/index.ts", build: { command: "bun run build:web" },
    assets: { directory: "./dist", binding: "ASSETS", not_found_handling: "single-page-application" },
  }));
  return root;
}

test("creates the RED POLY build tree without pretending native binaries exist", (t) => {
  const root = fixture(t);
  const result = organizeArtifacts(root);
  for (const path of OUTPUT_DIRECTORIES) assert.ok(existsSync(join(root, path)), path);
  assert.equal(result.stagedWeb, false);
  assert.equal(JSON.parse(readFileSync(result.manifestPath, "utf8")).webStaged, false);
  assert.ok(!existsSync(join(root, "build/visual-web-merged/wrangler.jsonc")));
});

test("stages both web directories and a deployable Cloudflare snapshot", (t) => {
  const root = fixture(t);
  mkdirSync(join(root, "dist/_expo"), { recursive: true });
  writeFileSync(join(root, "dist/index.html"), "<html>RED POLY</html>");
  writeFileSync(join(root, "dist/_expo/bundle.js"), "console.log('red-poly');");
  const first = organizeArtifacts(root, { stageWeb: true });
  assert.equal(first.stagedWeb, true);
  assert.ok(existsSync(join(root, "build/visual-web-emission/_expo/bundle.js")));
  assert.ok(existsSync(join(root, "build/visual-web-merged/assets/index.html")));
  assert.ok(existsSync(join(root, "build/visual-web-merged/worker/index.ts")));
  const original = JSON.parse(readFileSync(join(root, "wrangler.jsonc"), "utf8"));
  const staged = JSON.parse(readFileSync(join(root, "build/visual-web-merged/wrangler.jsonc"), "utf8"));
  assert.equal(original.assets.directory, "./dist");
  assert.equal(staged.assets.directory, "./assets");
  assert.equal(staged.assets.binding, "ASSETS");
  assert.equal(staged.build, undefined);
  assert.equal(staged.main, "./worker/index.ts");
  assert.equal(JSON.parse(readFileSync(first.manifestPath, "utf8")).webStaged, true);
  writeFileSync(join(root, "build/visual-web-emission/old.js"), "outdated");
  writeFileSync(join(root, "build/visual-web-merged/assets/old.js"), "outdated");
  organizeArtifacts(root, { stageWeb: true });
  assert.ok(!existsSync(join(root, "build/visual-web-emission/old.js")));
  assert.ok(!existsSync(join(root, "build/visual-web-merged/assets/old.js")));
});

test("does not stage an absent web export", (t) => {
  const root = fixture(t);
  assert.throws(() => organizeArtifacts(root, { stageWeb: true }), /dist\/index.html fehlt/);
  assert.ok(!existsSync(join(root, "build/visual-web-merged/wrangler.jsonc")));
});

test("refuses an unknown worker configuration without modifying the source", (t) => {
  const root = fixture(t);
  mkdirSync(join(root, "dist"));
  writeFileSync(join(root, "dist/index.html"), "<html></html>");
  const config = JSON.stringify({ main: "./another.ts", assets: { directory: "./dist" } });
  writeFileSync(join(root, "wrangler.jsonc"), config);
  assert.throws(() => organizeArtifacts(root, { stageWeb: true }), /Unbekannte Cloudflare/);
  assert.equal(readFileSync(join(root, "wrangler.jsonc"), "utf8"), config);
});
