import { test, expect, type Locator } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * `theme={createApollonTheme({ … })}` writes `--apollon-*` onto the editor's own
 * container and nothing else — no `data-theme`, no `color-scheme`, no change to
 * the document. It is how the VS Code extension maps the host's colors in, and
 * it is the only mount where the `--home-*` aliases that the shared @tumaet/ui
 * form primitives paint from can go wrong: declared on `:root`, they resolve
 * against the light document, and a dark editor draws light input borders.
 *
 * A root-themed page (the webapp itself) hides that, and so does jsdom, which
 * resolves no cascade. The second block below covers the other half of the same
 * bug, which not even this page can reach.
 */

const __dirname2 = path.dirname(fileURLToPath(import.meta.url))
const classDiagram = JSON.parse(
  fs.readFileSync(
    path.join(__dirname2, "..", "fixtures", "class-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

const ASSOCIATION = "edge-bidirectional-dog-imovable"

const DARK_THEME = {
  "--apollon-background": "rgb(30, 30, 30)",
  "--apollon-surface": "rgb(37, 37, 38)",
  "--apollon-foreground": "rgb(204, 204, 204)",
  "--apollon-border": "rgb(69, 69, 69)",
}

/** Mean channel of a rendered `rgb()`/`color(srgb …)` value, on 0..1. */
async function luminance(input: Locator, property: string): Promise<number> {
  const value = await input.evaluate(
    (element, prop) => getComputedStyle(element).getPropertyValue(prop),
    property
  )
  const parts = (value.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3)
  if (parts.length < 3) {
    throw new Error(`\`${property}\` did not resolve to a color: ${value}`)
  }
  const scale = parts.some((part) => part > 1) ? 255 : 1
  return (parts[0] + parts[1] + parts[2]) / 3 / scale
}

test.describe("an inline dark theme reaches portaled form controls", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, classDiagram)
    await waitForCanvasReady(page)

    await page.evaluate((theme) => {
      const editor = document.querySelector<HTMLElement>(".apollon-editor")
      if (!editor) throw new Error("no editor container")
      for (const [name, value] of Object.entries(theme)) {
        editor.style.setProperty(name, value)
      }
    }, DARK_THEME)

    await page
      .locator(`.react-flow__edge[data-id="${ASSOCIATION}"] path`)
      .first()
      .dispatchEvent("click")
    await page.getByRole("button", { name: "Edit edge" }).click()
    await expect(page.getByTestId("edge-source-multiplicity")).toBeVisible()
  })

  // The popup left the `.apollon-editor` subtree for <body>, carrying the
  // resolved `--home-*` values with it — which they only are if `.apollon-editor`
  // re-declares them instead of letting `:root` freeze the light value.
  test("the input's border comes from the editor's theme", async ({ page }) => {
    const input = page.getByTestId("edge-source-multiplicity")
    expect(await luminance(input, "border-top-color")).toBeLessThan(0.5)
  })
})

/**
 * A text field ignores an inherited `color`: the UA sheet declares
 * `input { color: fieldtext }` directly on the element, and `fieldtext` follows
 * `color-scheme` — the OS appearance — not the editor's theme. Tailwind's
 * Preflight resets that, which is why the webapp above never sees it; the
 * primitives ship a second time in a Tailwind-free, Preflight-free bundle for
 * embeds (the VS Code webview), and there the field paints black ink on a dark
 * surface. That bundle is the only place this is observable, so drive it
 * directly rather than through a page that quietly repairs it.
 */
// Read lazily: Playwright collects the spec files before it starts the web
// server that builds this stylesheet.
const componentsCss = () =>
  fs.readFileSync(
    path.join(__dirname2, "../../../../packages/ui/dist/components.css"),
    "utf-8"
  )

const FOREGROUND = "rgb(204, 204, 204)"

const renderedColor = (field: Locator): Promise<string> =>
  field.evaluate((element) => getComputedStyle(element).color)

test.describe("the Tailwind-free bundle without Preflight", () => {
  for (const slot of ["input", "textarea"] as const) {
    test(`a ${slot} inherits the surrounding color instead of the system one`, async ({
      page,
    }) => {
      // The bare sibling is the control: whatever it paints IS `fieldtext` on
      // this page, so the assertion holds without hard-coding what the UA and
      // the current `color-scheme` happen to resolve it to. The stylesheet ships
      // inline because the primitives declare `transition-property: color` —
      // inject it afterwards and the fields are still animating when we read.
      await page.setContent(
        `<style>${componentsCss()}</style>
         <div style="color: ${FOREGROUND}">
           <${slot} data-slot="${slot}"></${slot}>
           <${slot} id="bare"></${slot}>
         </div>`
      )

      expect(await renderedColor(page.locator("#bare"))).not.toBe(FOREGROUND)
      expect(await renderedColor(page.locator(`[data-slot="${slot}"]`))).toBe(
        FOREGROUND
      )
    })
  }
})
