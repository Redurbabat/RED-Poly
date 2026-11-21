/**
 * RED POLY Build-Layout: separate generated artefacts from runtime source.
 * Commands: node scripts/build-layout.mjs [--stage-web]
 */
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

export const OUTPUT_DIRECTORIES = Object.freeze([
  "build/visual-web-emission",
  "build/visual-web-merged/assets",
  "build/visual-web-merged/worker",
  "build/cloudflare/preview",
  "build/cloudflare/deployments",
  "build/mobile/ios/js-bundle",
  "build/mobile/ios/simulator",
  "build/mobile/ios/ipa",
  "build/mobile/android/js-bundle",
  "build/mobile/android/apk",
  "build/desktop/windows",
  "build/desktop/macos",
  "build/qa/browser",
  "build/qa/reports",
  "build/metadata",
]);

function copyWithoutSymlinks(source, destination) {
  cpSync(source, destination, {
    recursive: true,
    filter: (entry) => !lstatSync(entry).isSymbolicLink(),
  });
}

/**
 * Build output is gitignored. Staging does not mutate the source dist/ or worker/.
 * This does not create an IPA, APK or desktop executable.
 */
export function organizeArtifacts(projectRoot, { stageWeb = false } = {}) {
  const root = resolve(projectRoot);
  for (const directory of OUTPUT_DIRECTORIES) mkdirSync(join(root, directory), { recursive: true });

  if (stageWeb) {
    const exportedWeb = join(root, "dist");
    const worker = join(root, "worker/index.ts");
    const originalConfig = join(root, "wrangler.jsonc");

    if (!existsSync(join(exportedWeb, "index.html"))) {
      throw new Error("dist/index.html fehlt. Zuerst bun run build:web ausfuehren.");
    }
    if (!existsSync(worker) || !existsSync(originalConfig)) {
      throw new Error("Cloudflare Worker oder wrangler.jsonc fehlt.");
    }

    const sourceConfig = JSON.parse(readFileSync(originalConfig, "utf8"));
    if (sourceConfig?.assets?.directory !== "./dist" || sourceConfig?.main !== "./worker/index.ts") {
      throw new Error("Unbekannte Cloudflare-Verzeichnisstruktur. Kein Staging durchgefuehrt.");
    }

    const emission = join(root, "build/visual-web-emission");
    const merged = join(root, "build/visual-web-merged");
    const assetTarget = join(merged, "assets");

    rmSync(emission, { recursive: true, force: true });
    rmSync(assetTarget, { recursive: true, force: true });
    mkdirSync(emission, { recursive: true });
    mkdirSync(assetTarget, { recursive: true });
    mkdirSync(join(merged, "worker"), { recursive: true });

    copyWithoutSymlinks(exportedWeb, emission);
    copyWithoutSymlinks(exportedWeb, assetTarget);
    copyWithoutSymlinks(worker, join(merged, "worker/index.ts"));

    // The snapshot is self-contained. Building again here would fail because
    // the Expo sources are intentionally outside this generated directory.
    const stagedConfig = {
      ...sourceConfig,
      main: "./worker/index.ts",
      assets: { ...sourceConfig.assets, directory: "./assets" },
    };
    delete stagedConfig.build;
    writeFileSync(join(merged, "wrangler.jsonc"), JSON.stringify(stagedConfig, null, 2) + "\n");
  }

  const manifest = {
    schemaVersion: 1,
    project: "RED POLY",
    generatedAt: new Date().toISOString(),
    webStaged: stageWeb,
    entries: {
      webExport: "build/visual-web-emission",
      cloudflareWorker: "build/visual-web-merged/wrangler.jsonc",
      cloudflareAssets: "build/visual-web-merged/assets",
      quality: "build/qa",
      mobile: "build/mobile",
      desktop: "build/desktop",
    },
    notice: "Ordner ohne Artefakte sind reserviert. Keine IPA, APK oder EXE erstellt.",
  };
  const manifestPath = join(root, "build/metadata/build-layout.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return { manifestPath, stagedWeb: stageWeb };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const allowed = new Set(["--stage-web"]);
  if (process.argv.slice(2).some((argument) => !allowed.has(argument))) {
    console.error("Usage: node scripts/build-layout.mjs [--stage-web]");
    process.exitCode = 2;
  } else {
    try {
      const result = organizeArtifacts(process.cwd(), { stageWeb: process.argv.includes("--stage-web") });
      console.log("RED POLY build-Struktur erstellt: " + result.manifestPath);
      if (result.stagedWeb) console.log("Cloudflare Staging: build/visual-web-merged/wrangler.jsonc");
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
