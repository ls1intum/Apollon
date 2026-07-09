import { test, expect, type Page } from "@playwright/test"
import { waitForCanvasReady } from "../helpers/canvas"

// End-to-end proof that the playground's theme configurator actually drives the
// public `--apollon-*` contract on the embedded editor: overrides land on the
// mount node's inline style, the light/dark switch themes the whole editor
// (palette included) via the document `data-theme`, px sliders emit length
// values, feature groups can reveal their editor context, and resets remove the
// override so the library's built-in fallback takes back over.

const EDITOR = ".playground-apollon-editor"

/** The inline override on the editor container ("" when at its default). */
function inlineVar(page: Page, name: string): Promise<string> {
  return page.evaluate(
    ([sel, prop]) => {
      const el = document.querySelector(sel) as HTMLElement | null
      return el ? el.style.getPropertyValue(prop).trim() : "MISSING"
    },
    [EDITOR, name] as const
  )
}

/**
 * Mean luminance (0..1) of the element palette's actual background — proves the
 * glass chrome surface really recolors with the theme, not just the token.
 */
function paletteLuminance(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="apollon-palette"]')
    if (!el) return 1
    const bg = getComputedStyle(el).backgroundColor
    const nums = (bg.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3)
    if (nums.length < 3) return 1
    // Normalize rgb() (0..255) and color(srgb ...) (0..1) onto 0..1.
    const scale = nums.some((n) => n > 1) ? 255 : 1
    return (nums[0] + nums[1] + nums[2]) / 3 / scale
  })
}

/**
 * The palette drag ghost is portaled to `document.body` and pinned to the
 * viewport. Found by what makes it the ghost rather than by a class, so a
 * restyle cannot quietly turn these assertions into a no-op that always passes.
 */
function ghostAttribute(page: Page, name: string): Promise<string | null> {
  return page.evaluate((attribute) => {
    const ghost = [...document.body.children].find(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        el.style.position === "fixed" &&
        el.style.pointerEvents === "none"
    )
    return ghost?.getAttribute(attribute) ?? null
  }, name)
}

/**
 * Mean luminance (0..1) of the ghost's node BODY — the largest painted shape,
 * the one filled from `--apollon-background`.
 *
 * Only real shape elements count. A `<g>` reports a bounding box but paints
 * nothing, and its computed `fill` is the initial black, so sampling it (or the
 * label, painted from `--apollon-foreground`) reads "dark" under the light theme
 * and the assertion passes whether or not the ghost is themed. Throws rather
 * than returning a sentinel, for the same reason: a miss must fail, not pass.
 */
const PAINTED = "rect, circle, ellipse, path, polygon, polyline"

function ghostBodyLuminance(page: Page): Promise<number> {
  return page.evaluate((painted) => {
    const ghost = [...document.body.children].find(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        el.style.position === "fixed" &&
        el.style.pointerEvents === "none"
    )
    if (!ghost) throw new Error("no drag ghost in <body>")
    const shapes = [...ghost.querySelectorAll<SVGGraphicsElement>(painted)]
      .filter((element) => {
        const fill = getComputedStyle(element).fill
        return !!fill && fill !== "none" && !fill.startsWith("url(")
      })
      .map((element) => {
        const { width, height } = element.getBBox()
        return { element, area: width * height }
      })
      .sort((a, b) => b.area - a.area)
    if (!shapes.length || shapes[0].area === 0) {
      throw new Error("drag ghost paints no shape")
    }
    const nums = (
      getComputedStyle(shapes[0].element).fill.match(/[\d.]+/g) ?? []
    )
      .map(Number)
      .slice(0, 3)
    if (nums.length < 3) throw new Error("unreadable ghost fill")
    const scale = nums.some((n) => n > 1) ? 255 : 1
    return (nums[0] + nums[1] + nums[2]) / 3 / scale
  }, PAINTED)
}

/** Mean luminance (0..1) of a resolved `--apollon-*` color on the container. */
function cssVarLuminance(page: Page, name: string): Promise<number> {
  return page.evaluate(
    ([sel, prop]) => {
      const el = document.querySelector(sel)
      if (!el) return 1
      const raw = getComputedStyle(el).getPropertyValue(prop).trim()
      // Let the browser normalize any color format (hex/rgb) to rgb().
      const probe = document.createElement("div")
      probe.style.color = raw
      document.body.appendChild(probe)
      const rgb = getComputedStyle(probe).color
      probe.remove()
      const nums = (rgb.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3)
      if (nums.length < 3) return 1
      const scale = nums.some((n) => n > 1) ? 255 : 1
      return (nums[0] + nums[1] + nums[2]) / 3 / scale
    },
    [EDITOR, name] as const
  )
}

/** Switch the configurator to a section via its Select. */
async function selectSection(page: Page, id: string): Promise<void> {
  await page.getByTestId("theme-section-select").click()
  await page.getByTestId(`theme-section-${id}`).click()
  await expect(page.getByTestId(`theme-panel-${id}`)).toBeVisible()
}

test.describe("playground theme configurator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/playground")
    await waitForCanvasReady(page, false)
    await expect(page.getByTestId("playground-theme-sidebar")).toBeVisible()
  })

  test("overriding a typed color writes the variable onto the editor", async ({
    page,
  }) => {
    expect(await inlineVar(page, "--apollon-primary")).toBe("")
    await expect(page.getByTestId("theme-override-count")).toHaveText(
      "0 overrides"
    )

    await page.getByTestId("theme-input---apollon-primary").fill("#ff0000")

    expect(await inlineVar(page, "--apollon-primary")).toBe("#ff0000")
    await expect(page.getByTestId("theme-override-count")).toHaveText(
      "1 override"
    )

    // The per-control reset removes the override so the built-in fallback wins.
    await page.getByTestId("theme-reset---apollon-primary").click()
    expect(await inlineVar(page, "--apollon-primary")).toBe("")
    await expect(page.getByTestId("theme-override-count")).toHaveText(
      "0 overrides"
    )
  })

  test("a CSS-variable-only band (collaboration palette) passes through", async ({
    page,
  }) => {
    await selectSection(page, "collaboration")
    await page
      .getByTestId("theme-input---apollon-collaboration-color-1")
      .fill("#00ff00")
    expect(await inlineVar(page, "--apollon-collaboration-color-1")).toBe(
      "#00ff00"
    )
  })

  test("the base-radius slider emits a px length variable", async ({
    page,
  }) => {
    // radius lives in Essentials (the default section).
    const thumb = page
      .getByTestId("theme-slider---apollon-radius")
      .getByRole("slider")
    await thumb.focus()
    await thumb.press("ArrowRight")

    // Default is 6px; one step right lands at 7px (a px length, not a raw number).
    expect(await inlineVar(page, "--apollon-radius")).toBe("7px")
  })

  test("the dark switch themes the whole editor, palette included", async ({
    page,
  }) => {
    await page.getByTestId("theme-preview-dark").click()
    // Dark is driven at the document root — the mechanism that reaches the
    // derived chrome/glass surfaces (unlike the scoped dataTheme prop).
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    // The element palette (a glass chrome surface) must actually be dark now.
    expect(await paletteLuminance(page)).toBeLessThan(0.5)

    await page.getByTestId("theme-preview-light").click()
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
    expect(await paletteLuminance(page)).toBeGreaterThan(0.5)
  })

  test("a scoped data-theme on the editor darkens chrome AND base surfaces, document untouched", async ({
    page,
  }) => {
    // The switch above drives document :root — which a :root-only ramp / :root-only
    // token would pass too. Drive data-theme on the editor CONTAINER only (html
    // stays light): the exact path that freezes if the chrome ramp isn't scoped to
    // .apollon-editor or a theme-varying base token is missing from the dark block.
    await page.evaluate((sel) => {
      document.querySelector(sel)?.setAttribute("data-theme", "dark")
    }, EDITOR)

    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark")
    // Derived chrome (re-resolves via the .apollon-editor ramp).
    expect(await paletteLuminance(page)).toBeLessThan(0.5)
    // A base surface (re-resolves via the dark-block delta) — froze light before.
    expect(await cssVarLuminance(page, "--apollon-surface")).toBeLessThan(0.5)
    // The ink flips the other way: white on the dark canvas (froze near-black).
    expect(await cssVarLuminance(page, "--apollon-foreground")).toBeGreaterThan(
      0.5
    )
  })

  test("a scoped data-theme reaches the palette drag ghost, which portals to <body>", async ({
    page,
  }) => {
    // The ghost tracks the cursor in viewport coordinates, so it portals out to
    // <body> — leaving the subtree that scopes the dark tokens. A document-root
    // theme still covers it, which is why only a SCOPED mount catches this.
    await page.evaluate((sel) => {
      document.querySelector(sel)?.setAttribute("data-theme", "dark")
    }, EDITOR)

    const entry = page
      .locator('[data-testid="apollon-palette"] [data-draggable-preview]')
      .first()
    const box = await entry.boundingBox()
    if (!box) throw new Error("no palette entry to drag")

    // Grab the rendered preview and actually move, so we measure the live ghost
    // rather than the palette entry still sitting inside the themed subtree.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 160, box.y + 140, { steps: 5 })

    expect(await ghostAttribute(page, "data-theme")).toBe("dark")
    // The shape must actually paint dark: the tokens have to re-resolve outside
    // the subtree, not merely be inherited as light `:root` values. Guards a
    // regression that forwards the attribute but stops honoring the selector.
    expect(await ghostBodyLuminance(page)).toBeLessThan(0.5)

    await page.mouse.up()
  })

  test("a scoped inline background override recolors the derived glass chrome", async ({
    page,
  }) => {
    // The headline API: theme={createApollonTheme({ background })} writes an inline
    // --apollon-background on the container (same as this input). Prove the derived
    // glass chrome re-resolves against it, not just that the variable lands.
    await page.getByTestId("theme-input---apollon-background").fill("#101317")
    expect(await inlineVar(page, "--apollon-background")).toBe("#101317")
    expect(await paletteLuminance(page)).toBeLessThan(0.5)
  })

  test("a feature group's reveal button drives the editor into that state", async ({
    page,
  }) => {
    await selectSection(page, "assessment")
    // The playground starts in Modelling; assessment tokens aren't visible.
    await expect(page.getByTestId("playground-mode")).toContainText("Modelling")

    await page.getByTestId("theme-reveal").click()

    // The reveal switches the editor into Assessment mode so the tones show.
    await expect(page.getByTestId("playground-mode")).toContainText(
      "Assessment"
    )
  })

  test("reset all clears every override at once", async ({ page }) => {
    // primary and background both live in Essentials (the default section).
    await page.getByTestId("theme-input---apollon-primary").fill("#123456")
    await page.getByTestId("theme-input---apollon-background").fill("#abcdef")
    await expect(page.getByTestId("theme-override-count")).toHaveText(
      "2 overrides"
    )

    await page.getByTestId("theme-reset-all").click()

    await expect(page.getByTestId("theme-override-count")).toHaveText(
      "0 overrides"
    )
    expect(await inlineVar(page, "--apollon-primary")).toBe("")
    expect(await inlineVar(page, "--apollon-background")).toBe("")
  })
})
