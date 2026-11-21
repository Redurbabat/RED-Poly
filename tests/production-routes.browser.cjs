/**
 * Run Chromium against the actual Expo *production web export*, not the
 * development Metro server. Both QA routes must redirect in released builds.
 * No third-party static server dependency or production credentials required.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const exportRoot = path.resolve(__dirname, "../.ci-web-build");
const screenshotDir = path.resolve(__dirname, "../.ci-browser-artifacts");

function staticFile(requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const normalized = path.posix.normalize(decoded);
  if (normalized.includes("\0") || normalized.split("/").includes("..")) return null;
  const filename = normalized === "/" ? "/index.html" : normalized;
  const candidate = path.resolve(exportRoot, "." + filename);
  if (!candidate.startsWith(exportRoot + path.sep)) return null;
  for (const target of [candidate, candidate + ".html", path.join(candidate, "index.html")]) {
    if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  }
  return null;
}

function startServer() {
  const server = http.createServer((req, res) => {
    let file;
    try { file = staticFile(req.url || "/"); }
    catch { file = null; }
    if (!file) { res.writeHead(404); res.end("Not found"); return; }
    const ext = path.extname(file);
    const contentType = ext === ".html" ? "text/html; charset=utf-8"
      : ext === ".js" ? "text/javascript; charset=utf-8"
        : ext === ".css" ? "text/css; charset=utf-8"
          : ext === ".json" ? "application/json"
            : ext === ".svg" ? "image/svg+xml"
              : ext === ".png" ? "image/png"
                : ext === ".woff2" ? "font/woff2"
                  : "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    const stream = fs.createReadStream(file);
    stream.on("error", () => { if (!res.headersSent) res.writeHead(500); res.end(); });
    stream.pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve({
      server,
      origin: "http://127.0.0.1:" + server.address().port,
    }));
  });
}

async function main() {
  assert.ok(fs.existsSync(exportRoot), "Run Expo production web export first.");
  fs.mkdirSync(screenshotDir, { recursive: true });
  const { server, origin } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    for (const route of ["design-lab", "backup-lab"]) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      const response = await page.goto(origin + "/" + route, {
        waitUntil: "domcontentloaded", timeout: 90_000,
      });
      assert.equal(response.status(), 200, route + " should be an exported route");
      await page.waitForURL(
        url => !url.pathname.includes(route),
        { timeout: 45_000 },
      );
      const content = await page.locator("body").innerText();
      assert.ok(!content.includes("RED POLY · Backup Lab"), "Backup Lab leaked into production");
      assert.ok(!content.includes("RED POLY · Design Lab"), "Design Lab leaked into production");
      assert.ok(!content.includes("NUR SIMULATION"), "Test fixtures leaked into production");
      await page.screenshot({
        path: path.join(screenshotDir, "production-" + route + "-redirect.png"),
        fullPage: true,
      });
      assert.deepEqual(errors, [], "Uncaught browser errors on " + route);
      console.log("PASS: production /" + route + " redirected to " + new URL(page.url()).pathname);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch(error => {
  console.error("FAIL: production route safety", error);
  process.exitCode = 1;
});
