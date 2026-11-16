/**
 * Real Chromium E2E smoke test for the development-only RED POLY Design Lab.
 * Run with a local Expo development web server at http://localhost:8081.
 * This intentionally runs through the existing onboarding route, so no
 * production navigation or persistence behavior is bypassed.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseURL = process.env.RED_POLY_TEST_URL || "http://127.0.0.1:8081";
const outputDir = path.join(__dirname, "..", ".ci-browser-artifacts");
fs.mkdirSync(outputDir, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const exceptions = [];
  page.on("pageerror", (error) => exceptions.push(error.message));

  try {
    await page.goto(baseURL + "/onboarding", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByText("Welcome!", { exact: true }).waitFor({ timeout: 90_000 });

    // Complete onboarding through the real screen, not a fabricated progress-v2 fixture.
    await page.getByRole("button", { name: /^Learn / }).first().click();
    await page.getByText("Learn", { exact: true }).first().waitFor({ timeout: 30_000 });
    await page.goto(baseURL + "/design-lab", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByText("RED POLY · Design Lab").waitFor({ timeout: 90_000 });

    await page.getByRole("button", { name: "Primäre Aktion" }).click();
    await page.getByText("Primäre Aktion ausgeführt").waitFor();

    const disabled = page.getByRole("button", { name: "Deaktivierte Aktion" });
    assert.equal(await disabled.isDisabled(), true, "disabled buttons must not be actionable");

    await page.getByRole("button", { name: "Dialog öffnen" }).click();
    await page.getByText("Testdialog", { exact: true }).waitFor();
    await page.screenshot({
      path: path.join(outputDir, "mobile-dialog.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Abbrechen" }).click();
    await page.getByText("Dialog abgebrochen").waitFor();

    await page.getByRole("button", { name: "Dialog öffnen" }).click();
    await page.getByRole("button", { name: "Bestätigen" }).click();
    await page.getByText("Dialog bestätigt").waitFor();

    const field = page.getByRole("textbox", { name: "Beispieltext" });
    await field.fill("ab");
    await page.getByText("Mindestens drei Zeichen").waitFor();
    await field.fill("abc");
    await page.getByText("Mindestens drei Zeichen").waitFor({ state: "hidden" });

    const practice = page.getByRole("tab", { name: "Üben" });
    await practice.click();
    assert.equal(await practice.getAttribute("aria-selected"), "true", "selected tab should be announced");

    const progress = page.getByRole("progressbar", { name: "Beispiel-Fortschritt" });
    const original = Number(await progress.getAttribute("aria-valuenow"));
    await page.getByRole("button", { name: "+ 10 %" }).click();
    const increased = Number(await progress.getAttribute("aria-valuenow"));
    assert.equal(original, 35);
    assert.equal(increased, 45);

    await page.getByRole("button", { name: "Erneut versuchen" }).click();
    await page.getByText("Erneut versuchen gedrückt").waitFor();

    await page.screenshot({
      path: path.join(outputDir, "mobile-design-lab.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByText("RED POLY · Design Lab").waitFor();
    await page.screenshot({
      path: path.join(outputDir, "desktop-design-lab.png"),
      fullPage: true,
    });

    assert.deepEqual(exceptions, [], "browser must not raise unhandled page errors");
    console.log("PASS: Chromium onboarding + mobile/desktop Design Lab interactions");
    console.log("Screenshots: " + outputDir);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("FAIL: Browser E2E", error);
  process.exitCode = 1;
});
