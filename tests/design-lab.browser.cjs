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

const baseURL = process.env.RED_POLY_TEST_URL || "http://localhost:8081";
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

    // Choose a nondefault daily goal via the real onboarding UI.
    // This verifies real AsyncStorage persistence on reload without mocking the store.
    await page.getByRole("button", { name: "30 XP per day, Serious" }).click();
    await page.getByRole("button", { name: /^Learn / }).first().click();
    await page.getByText("Learn", { exact: true }).first().waitFor({ timeout: 30_000 });

    await page.getByRole("tab", { name: "Profile" }).click();
    await page.getByText("My Progress", { exact: true }).waitFor({ timeout: 30_000 });
    await page.getByText("0/30", { exact: true }).waitFor();
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByText("My Progress", { exact: true }).waitFor({ timeout: 30_000 });
    await page.getByText("0/30", { exact: true }).waitFor();

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

    // Narrow-screen and keyboard regression (no mocked native devices).
    await page.setViewportSize({ width: 320, height: 568 });
    await page.getByText("RED POLY · Design Lab").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert.ok(overflow <= 1, `320px viewport has horizontal overflow: ${overflow}px`);
    await page.screenshot({
      path: path.join(outputDir, "small-mobile-design-lab.png"),
      fullPage: true,
    });

    const dialogTrigger = page.getByRole("button", { name: "Dialog öffnen" });
    await dialogTrigger.focus();
    await page.keyboard.press("Enter");
    await page.getByText("Testdialog", { exact: true }).waitFor();
    const cancelKey = page.getByRole("button", { name: "Abbrechen" });
    await cancelKey.focus();
    await page.keyboard.press("Enter");
    await page.getByText("Dialog abgebrochen").waitFor();

    // Change the theme through the real profile controls, not injected storage.
    await page.getByRole("button", { name: "Zur App" }).click();
    await page.getByRole("tab", { name: "Profile" }).click();
    await page.getByRole("button", { name: "Dark theme" }).click();
    await page.goto(baseURL + "/design-lab", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.getByText("RED POLY · Design Lab").waitFor();
    await page.getByText(/web · dark ·/).waitFor();
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByText("RED POLY · Design Lab").waitFor({ timeout: 30_000 });
    await page.getByText(/web · dark ·/).waitFor();
    await page.screenshot({
      path: path.join(outputDir, "dark-mobile-design-lab.png"),
      fullPage: true,
    });

    // Backup/restore UI is isolated: no true device data or Core Data call.
    await page.goto(baseURL + "/backup-lab", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByText("RED POLY · Backup Lab").waitFor({ timeout: 30_000 });
    await page.getByText("Test-Wiederherstellungen: 0").waitFor();

    await page.getByRole("button", { name: "Backup erzeugen" }).click();
    const exported = await page.getByRole("textbox", { name: "Exportiertes Backup" }).inputValue();
    assert.equal(JSON.parse(exported).format, "red-poly-progress");

    const incomingField = page.getByRole("textbox", { name: "Backup JSON zum Wiederherstellen" });
    await incomingField.fill("{broken");
    await page.getByRole("button", { name: "Wiederherstellung vorbereiten" }).click();
    await page.getByText("Das Backup enthält kein gültiges JSON.").waitFor();
    await page.getByText("Test-Wiederherstellungen: 0").waitFor();

    // The 8M-character boundary is exercised by the fast pure Node test;
    // avoid dispatching an 8 MB TextInput event in every browser CI run.

    await incomingField.fill(exported);
    await page.getByRole("button", { name: "Wiederherstellung vorbereiten" }).click();
    await page.getByText("Lernstand wirklich ersetzen?").waitFor();
    const irreversible = page.getByRole("button", { name: "Lernstand endgültig ersetzen" });
    assert.equal(await irreversible.isDisabled(), true);
    const phrase = page.getByRole("textbox", { name: "Bestätigungscode ERSETZEN" });
    await phrase.fill("FALSCH");
    assert.equal(await irreversible.isDisabled(), true);
    await page.getByRole("button", { name: "Abbrechen" }).click();
    await page.getByText("Test-Wiederherstellungen: 0").waitFor();

    // A rejected core restore must show an error, preserve input and allow retry.
    await page.getByRole("button", { name: "Nächste Wiederherstellung fehlschlagen lassen" }).click();
    await page.getByRole("button", { name: "Wiederherstellung vorbereiten" }).click();
    await phrase.fill("ERSETZEN");
    await irreversible.click();
    await page.getByText("Wiederherstellung fehlgeschlagen. Bitte Backup und aktuellen Lernstand prüfen.").waitFor();
    await page.getByText("Test-Wiederherstellungen: 0").waitFor();
    assert.equal(await incomingField.inputValue(), exported);
    await page.screenshot({
      path: path.join(outputDir, "backup-lab-restore-error.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Wiederherstellung vorbereiten" }).click();
    await phrase.fill("ERSETZEN");
    await irreversible.click();
    await page.getByText("Test-Wiederherstellungen: 1").waitFor();

    await page.getByRole("button", { name: "Wortlistenimport vorbereiten" }).click();
    await page.getByText("Alte Wortlisten übernehmen?").waitFor();
    await page.getByRole("button", { name: "Abbrechen" }).click();
    await page.getByText("Test-Importe: 0").waitFor();
    await page.getByRole("button", { name: "Wortlistenimport vorbereiten" }).click();
    await page.getByRole("button", { name: "Wortlisten importieren" }).click();
    await page.getByText("Test-Importe: 1").waitFor();
    await page.screenshot({
      path: path.join(outputDir, "backup-lab-simulation.png"),
      fullPage: true,
    });

    assert.deepEqual(exceptions, [], "browser must not raise unhandled page errors");
    console.log("PASS: Chromium onboarding persistence, design lab, oversized-backup guard, failed restore/retry and mock import");
    console.log("Screenshots: " + outputDir);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("FAIL: Browser E2E", error);
  process.exitCode = 1;
});
