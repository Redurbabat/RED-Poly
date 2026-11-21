/**
 * Real browser smoke of the integrated user-facing features.
 * Runs against the same Expo dev server as design-lab.browser.cjs.
 * No network AI, payment, account or cloud data operations.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseURL = process.env.RED_POLY_TEST_URL || "http://localhost:8081";
const screenshots = path.resolve(__dirname, "../.ci-browser-artifacts");

async function main() {
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    await page.goto(baseURL + "/onboarding", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByText("Welcome!", { exact: true }).waitFor({ timeout: 90_000 });
    await page.getByRole("button", { name: "30 XP per day, Serious" }).click();
    await page.getByRole("button", { name: /^Learn / }).first().click();
    await page.getByRole("tab", { name: "Practice" }).click();
    await page.getByText("Language conversations (demo)").waitFor();
    await page.getByText("My vocabulary").waitFor();

    // Create vocabulary and verify an actual persisted reload.
    await page.getByRole("button", { name: "Open vocabulary" }).click();
    await page.getByRole("textbox", { name: "List name" }).fill("Integration Test List");
    await page.getByRole("button", { name: "Create list" }).click();
    await page.getByRole("textbox", { name: "Word", exact: true }).fill("Haus");
    await page.getByRole("textbox", { name: "Translation" }).fill("house");
    await page.getByRole("button", { name: "Add word" }).click();
    await page.getByText("Haus", { exact: true }).waitFor();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Integration Test List/ }).click();
    await page.getByText("Haus", { exact: true }).waitFor();
    await page.getByText("house", { exact: true }).waitFor();

    // Conversation is explicitly a demo; no live AI provider is claimed.
    await page.goto(baseURL + "/practice", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open conversations" }).click();
    await page.getByText(/OFFLINE-DEMO/).waitFor();
    await page.getByRole("button", { name: "Gespräch starten" }).click();
    await page.getByPlaceholder("Schreibe eine Antwort …").fill("Hello");
    await page.getByRole("button", { name: "Text senden" }).click();
    await page.getByText("Hello", { exact: true }).waitFor();

    // Verify on-device progress export through the real data-core wiring.
    await page.goto(baseURL + "/profile", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Back up or restore learning progress" }).click();
    await page.getByText("RED POLY · Backup", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Backup erzeugen" }).click();
    await page.getByText(/Backup vorbereitet/).waitFor();
    const exported = await page.getByRole("textbox", { name: "Exportiertes Backup" }).inputValue();
    const backup = JSON.parse(exported);
    assert.equal(backup.format, "red-poly-progress");
    assert.equal(backup.version, 1);
    assert.ok(backup.state, "course progress must be part of the backup");
    await page.screenshot({ path: path.join(screenshots, "integrated-feature-smoke.png"), fullPage: true });
    assert.deepEqual(errors, [], "Uncaught errors during integrated browser smoke");
    console.log("PASS: vocabulary persistence, conversation demo and real progress backup");
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error("FAIL: RED POLY integrated feature smoke", error); process.exitCode = 1; });
