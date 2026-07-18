import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Visual spec that generates the repo's public-facing marketing assets from the
 * CURRENT editor — the same one-source-of-truth pattern as the how-to-use modal
 * images (see how-to-use.visual.spec.ts). The dedicated "readme-assets"
 * Playwright project points snapshotPathTemplate at docs/static/img/, the exact
 * files referenced by:
 *
 *   - README.md + library/README.md   (apollon-editor-{light,dark}.png hero)
 *   - docs/docusaurus.config.ts       (apollon-social-card.png, themeConfig.image)
 *   - the GitHub repo Settings → Social preview upload (apollon-social-card.png)
 *
 * Regenerate after a UI redesign with:
 *
 *   pnpm exec playwright test --project readme-assets --update-snapshots
 *
 * or via the "Update Visual Baselines" workflow, which runs the same command in
 * the pinned rendering container and commits the refreshed PNGs.
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fixturesDir = path.join(__dirname, "..", "fixtures")
const fontsDir = path.join(__dirname, "..", "fonts")
const repoRoot = path.join(__dirname, "..", "..", "..", "..")

const heroFixture = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, "readme-hero.json"), "utf-8")
) as Record<string, unknown>

/**
 * Force the app into a specific theme regardless of the OS/browser color
 * scheme: seed the persisted zustand theme store (an explicit user preference
 * wins over the system preference) before the app boots.
 */
async function forceTheme(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme })
  await page.addInitScript(
    (value) => localStorage.setItem("apollon-theme", value),
    JSON.stringify({
      state: {
        systemThemePreference: theme,
        userThemePreference: theme,
        currentTheme: theme,
      },
      version: 2,
    })
  )
}

async function openHero(page: Page, theme: "light" | "dark") {
  await forceTheme(page, theme)
  await openFixtureInLocalEditor(page, heroFixture)
  await waitForCanvasReady(page)
  // Edges paint after nodes; wait for the last one before capturing.
  await page.locator(".react-flow__edge").nth(4).waitFor({
    state: "visible",
    timeout: 10_000,
  })
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
}

test.describe("README hero screenshots", () => {
  // The full app — chrome, palette, and canvas — IS the shop window here, so
  // capture the whole viewport rather than the editor-area clip.
  test("editor-light", async ({ page }) => {
    await openHero(page, "light")
    await expect(page).toHaveScreenshot("apollon-editor-light.png")
  })

  test("editor-dark", async ({ page }) => {
    await openHero(page, "dark")
    await expect(page).toHaveScreenshot("apollon-editor-dark.png")
  })
})

test.describe("Social preview card", () => {
  // GitHub's social preview spec: 1280×640 (2:1), <1 MB, key content ≥50 px
  // from every edge. Rendered at deviceScaleFactor 1 so the committed PNG is
  // exactly 1280×640.
  test.use({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 })

  test("social-card", async ({ page }) => {
    // 1. Capture the light editor for the framed window on the right. Light
    //    matches the editor's default look and reads brighter in link unfurls.
    //    Capture at exactly 2× the size the card displays it (760px wide), so
    //    the browser downscales by an integer factor — a fractional factor
    //    resamples the diagram's 1px lines into visibly broken/stepped runs.
    await page.setViewportSize({ width: 1520, height: 760 })
    await openHero(page, "light")
    const editorShot = (await page.screenshot()).toString("base64")
    await page.setViewportSize({ width: 1280, height: 640 })

    // 2. Compose the card in-page. Fonts and the logo are inlined as data URIs
    //    from files bundled in the repo, so the card renders identically on
    //    any machine (no dependency on system fonts or network).
    const font = (file: string) =>
      fs.readFileSync(path.join(fontsDir, file)).toString("base64")
    const logo = fs
      .readFileSync(path.join(repoRoot, "assets", "icon-only.png"))
      .toString("base64")

    await page.setContent(`<!doctype html>
<html>
<head>
<style>
  @font-face {
    font-family: "Inter";
    font-weight: 400;
    src: url(data:font/ttf;base64,${font("Inter-Regular.ttf")}) format("truetype");
  }
  @font-face {
    font-family: "Inter";
    font-weight: 700;
    src: url(data:font/ttf;base64,${font("Inter-Bold.ttf")}) format("truetype");
  }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1280px; height: 640px; overflow: hidden; }
  body {
    font-family: "Inter", sans-serif;
    color: #1f2328;
    background:
      radial-gradient(1200px 800px at 85% -20%, #dbe7f5 0%, transparent 60%),
      linear-gradient(135deg, #ffffff 0%, #f3f6fa 100%);
    position: relative;
  }
  /* Dot grid echoing the editor canvas. */
  body::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, #c7d0da 1.2px, transparent 1.2px);
    background-size: 26px 26px;
    opacity: 0.5;
  }
  .left {
    position: absolute;
    left: 72px;
    top: 0;
    bottom: 0;
    width: 480px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 26px;
    z-index: 1;
  }
  .lockup { display: flex; align-items: center; gap: 20px; }
  .lockup img { width: 84px; height: 84px; border-radius: 20px; }
  .lockup .name { font-size: 64px; font-weight: 700; letter-spacing: -0.02em; }
  .tagline { font-size: 30px; line-height: 1.35; color: #424a53; }
  .tagline b { color: #1f2328; font-weight: 700; }
  .facts { font-size: 21px; color: #6e7781; }
  .right {
    position: absolute;
    left: 620px;
    top: 113px;
    width: 760px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #d0d7de;
    box-shadow: 0 24px 70px rgba(31, 35, 40, 0.2);
    z-index: 1;
  }
  .titlebar {
    height: 34px;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
    display: flex;
    align-items: center;
    padding-left: 14px;
    gap: 8px;
  }
  .titlebar span { width: 11px; height: 11px; border-radius: 50%; }
  .right img { display: block; width: 760px; }
</style>
</head>
<body>
  <div class="left">
    <div class="lockup">
      <img src="data:image/png;base64,${logo}" alt="" />
      <div class="name">Apollon</div>
    </div>
    <div class="tagline"><b>Open-source UML modeling</b> for the web — draw, collaborate in real&nbsp;time, and embed the editor anywhere.</div>
    <div class="facts">13 diagram types&ensp;·&ensp;real-time collaboration&ensp;·&ensp;SVG / PNG / PDF / PPTX export</div>
  </div>
  <div class="right">
    <div class="titlebar">
      <span style="background:#f85149"></span>
      <span style="background:#d29922"></span>
      <span style="background:#3fb950"></span>
    </div>
    <img src="data:image/png;base64,${editorShot}" alt="" />
  </div>
</body>
</html>`)

    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot("apollon-social-card.png")
  })
})
