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
 *   - README.md header                (apollon-lockup-*.png, apollon-btn-*.png)
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

/**
 * Wrap a captured editor screenshot in a browser-window frame — rounded
 * corners, titlebar with traffic lights, border, and a soft drop shadow over a
 * transparent background — mirroring the social card's window styling. The
 * transparent margins make the hero sit nicely on both GitHub's light and dark
 * README backgrounds.
 */
async function frameEditorShot(
  page: Page,
  theme: "light" | "dark",
  editorShotB64: string
) {
  // Margin must exceed the shadow's reach (y-offset + blur) or the shadow
  // clips at the image edge.
  const margin = 64
  const titlebar = 44
  const width = 1440
  const height = 810
  await page.setViewportSize({
    width: width + 2 * margin,
    height: height + titlebar + 2 * margin,
  })
  const c =
    theme === "dark"
      ? { bar: "#161b22", border: "#30363d", shadow: "rgba(0, 0, 0, 0.4)" }
      : { bar: "#f6f8fa", border: "#d0d7de", shadow: "rgba(31, 35, 40, 0.16)" }
  await page.setContent(`<!doctype html>
<html>
<head>
<style>
  * { margin: 0; box-sizing: border-box; }
  html, body { background: transparent; overflow: hidden; }
  .window {
    margin: ${margin}px;
    width: ${width}px;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid ${c.border};
    box-shadow: 0 16px 44px ${c.shadow};
  }
  .titlebar {
    height: ${titlebar}px;
    background: ${c.bar};
    border-bottom: 1px solid ${c.border};
    display: flex;
    align-items: center;
    padding-left: 18px;
    gap: 9px;
  }
  .titlebar span { width: 13px; height: 13px; border-radius: 50%; }
  .window img { display: block; width: ${width}px; }
</style>
</head>
<body>
  <div class="window">
    <div class="titlebar">
      <span style="background:#f85149"></span>
      <span style="background:#d29922"></span>
      <span style="background:#3fb950"></span>
    </div>
    <img src="data:image/png;base64,${editorShotB64}" alt="" />
  </div>
</body>
</html>`)
  await page.waitForTimeout(300)
}

test.describe("README hero screenshots", () => {
  // The full app — chrome, palette, and canvas — IS the shop window here, so
  // capture the whole viewport, then present it in a window frame. The embed
  // shows the 2×-captured screenshot at its CSS capture size (1440px) in the
  // same deviceScaleFactor-2 context, so source pixels map 1:1 — no fractional
  // resampling of the diagram's hairlines.
  test("editor-light", async ({ page }) => {
    await openHero(page, "light")
    const shot = (await page.screenshot()).toString("base64")
    await frameEditorShot(page, "light", shot)
    await expect(page).toHaveScreenshot("apollon-editor-light.png", {
      omitBackground: true,
      scale: "device",
    })
  })

  test("editor-dark", async ({ page }) => {
    await openHero(page, "dark")
    const shot = (await page.screenshot()).toString("base64")
    await frameEditorShot(page, "dark", shot)
    await expect(page).toHaveScreenshot("apollon-editor-dark.png", {
      omitBackground: true,
      scale: "device",
    })
  })
})

test.describe("README header widgets", () => {
  // Brand lockup + call-to-action buttons for the README header, generated per
  // GitHub color scheme and swapped with <picture> in the README. Rendered on
  // a transparent background and captured as element screenshots (each widget
  // wrapped in a small transparent pad so its soft shadow isn't clipped).
  // Colors come from the webapp's design tokens: --primitive-accent-base is
  // #0f3a66 (light) / #236ebe (dark); neutrals mirror the window frame.
  for (const theme of ["light", "dark"] as const) {
    test(`widgets-${theme}`, async ({ page }) => {
      const c =
        theme === "dark"
          ? {
              accent: "#236ebe",
              text: "#e8eaed",
              subtleBg: "#161b22",
              border: "#30363d",
              shadow: "rgba(0, 0, 0, 0.4)",
            }
          : {
              accent: "#0f3a66",
              text: "#1f2328",
              subtleBg: "#f6f8fa",
              border: "#d0d7de",
              shadow: "rgba(31, 35, 40, 0.16)",
            }
      const font = (file: string) =>
        fs.readFileSync(path.join(fontsDir, file)).toString("base64")
      const logo = fs
        .readFileSync(path.join(repoRoot, "assets", "icon-only.png"))
        .toString("base64")

      // The play glyph is an inline SVG: Inter has no U+25B6, and a missing
      // glyph would render as a tofu box.
      const play = (color: string) =>
        `<svg width="15" height="15" viewBox="0 0 16 16" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M4 2.5v11a.7.7 0 0 0 1.06.6l9-5.5a.7.7 0 0 0 0-1.2l-9-5.5A.7.7 0 0 0 4 2.5Z"/></svg>`

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
  html, body { background: transparent; font-family: "Inter", sans-serif; }
  body { display: flex; flex-direction: column; align-items: flex-start; gap: 24px; padding: 24px; }
  .pad { display: inline-block; padding: 10px; }
  .lockup { display: flex; align-items: center; gap: 18px; }
  .lockup img { width: 64px; height: 64px; border-radius: 15px; }
  .lockup .name {
    font-size: 50px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${c.text};
  }
  .btn {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 24px;
    border-radius: 10px;
    font-size: 17px;
    font-weight: 700;
    box-shadow: 0 2px 8px ${c.shadow};
  }
  .btn.primary { background: ${c.accent}; color: #ffffff; }
  .btn.secondary {
    background: ${c.subtleBg};
    color: ${c.text};
    border: 1px solid ${c.border};
  }
</style>
</head>
<body>
  <div class="pad" id="lockup">
    <div class="lockup">
      <img src="data:image/png;base64,${logo}" alt="" />
      <div class="name">Apollon</div>
    </div>
  </div>
  <div class="pad" id="btn-demo">
    <div class="btn primary">${play("#ffffff")}<span>Try the live demo</span></div>
  </div>
  <div class="pad" id="btn-docs">
    <div class="btn secondary"><span>Documentation</span></div>
  </div>
</body>
</html>`)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(300)

      for (const id of ["lockup", "btn-demo", "btn-docs"]) {
        await expect(page.locator(`#${id}`)).toHaveScreenshot(
          `apollon-${id}-${theme}.png`,
          // scale "device" keeps the 2x pixels; the README displays at half
          // size via width/height attributes so the widgets stay retina-crisp.
          { omitBackground: true, scale: "device" }
        )
      }
    })
  }
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
