#!/usr/bin/env node
/**
 * RED POLY release identity preflight.
 * Purely reads app.json/eas.json. It never invokes EAS, Apple or a build.
 * Run without flags before any signing/build: exit code 2 means BLOCKED.
 * --audit only reports status for regular pull-request CI (exit code 0).
 */
const fs = require("node:fs");
const path = require("node:path");

const legacy = {
  bundle: "com.ahmet.lingo",
  owner: "ahmet909",
  projectId: "c5e5ee9a-1aac-4b7c-ba0f-a97897c4d348",
  ascAppId: "6781818623",
};
const bundlePattern = /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*){2,}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkReleaseIdentity(appConfig, easConfig) {
  const expo = appConfig?.expo ?? {};
  const issues = [];
  const flag = (field, reason) => issues.push({ field, reason });

  if (expo.name !== "RED POLY") {
    flag("expo.name", "Der Anzeigename muss RED POLY sein.");
  }
  if (typeof expo.slug !== "string" || !expo.slug.trim() || expo.slug.toLowerCase() === "lingo") {
    flag("expo.slug", "Eigener Expo-Slug erforderlich (nicht lingo).");
  }
  if (typeof expo.scheme !== "string" || !expo.scheme.trim() || expo.scheme.toLowerCase() === "lingo") {
    flag("expo.scheme", "Eigenes URL-Scheme erforderlich (nicht lingo).");
  }
  if (!bundlePattern.test(expo.ios?.bundleIdentifier ?? "") || expo.ios?.bundleIdentifier === legacy.bundle) {
    flag("expo.ios.bundleIdentifier", "Eigene gueltige iOS-Bundle-ID erforderlich.");
  }
  if (!bundlePattern.test(expo.android?.package ?? "") || expo.android?.package === legacy.bundle) {
    flag("expo.android.package", "Eigene gueltige Android-Package-ID erforderlich.");
  }
  if (typeof expo.owner !== "string" || !expo.owner.trim() || expo.owner === legacy.owner) {
    flag("expo.owner", "Eigener Expo/EAS-Owner erforderlich.");
  }
  const projectId = expo.extra?.eas?.projectId;
  if (!uuidPattern.test(projectId ?? "") || projectId === legacy.projectId) {
    flag("expo.extra.eas.projectId", "Eigene EAS-Projekt-ID erforderlich.");
  }
  const ascAppId = easConfig?.submit?.production?.ios?.ascAppId;
  if (ascAppId != null && String(ascAppId) === legacy.ascAppId) {
    flag("eas.submit.production.ios.ascAppId", "Fremde App-Store-Connect-ID muss entfernt werden.");
  }
  return issues;
}

function runCli(args = process.argv.slice(2)) {
  const root = path.resolve(__dirname, "..");
  const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
  const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
  const issues = checkReleaseIdentity(app, eas);
  console.log(issues.length
    ? `RELEASE BLOCKED: ${issues.length} Identitaetsprobleme gefunden.`
    : "Identitaetsfelder syntaktisch geprueft. Keine Freigabe fuer Signierung oder Release.");
  for (const issue of issues) console.log(` - ${issue.field}: ${issue.reason}`);
  console.log("Zusaetzliche Pflichtpruefungen: Eigentum am EAS-Projekt, Apple-Provisioning, Lizenzen/Assets und echte Geraetetests.");
  return issues.length && !args.includes("--audit") ? 2 : 0;
}

if (require.main === module) process.exitCode = runCli();
module.exports = { checkReleaseIdentity, runCli };
