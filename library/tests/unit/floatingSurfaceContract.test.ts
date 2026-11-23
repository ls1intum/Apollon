import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { FLOATING_SURFACE_CLASS } from "@/components/ui/floatingLayer"

// Drift guard for the floating-surface contract (see floatingLayer.tsx).
//
// Every surface that floats over the canvas has to come from the editor's
// floating layer, or it escapes the rules that keep it visible and reachable in
// a host: it would portal to the body under a modal dialog (hidden by the top
// layer or by the host's mask, unreachable for its focus trap and for screen
// readers), and it would stack against the page with no z-index at all. That is
// how the edit popover ended up behind every PrimeNG dialog. The checks below
// read the source, so a new popover, select or tooltip that skips the layer
// fails here instead of in an embedder's bug report.

const LIB = resolve(__dirname, "../../lib")
// Comments stripped so they cannot read as part of a selector.
const APP_CSS = readFileSync(join(LIB, "styles/app.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  ""
)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) ? [path] : []
  })
}

const sources = sourceFiles(LIB).map((path) => ({
  file: relative(LIB, path),
  text: readFileSync(path, "utf8"),
}))

/** The opening tag starting at `index`: attributes contain `=>` but never `<`. */
function openingTag(text: string, index: number): string {
  const end = text.indexOf("<", index + 1)
  return text.slice(index, end === -1 ? undefined : end)
}

function occurrences(pattern: RegExp) {
  return sources.flatMap(({ file, text }) =>
    [...text.matchAll(pattern)].map((match) => ({
      file,
      tag: openingTag(text, match.index ?? 0),
      match,
    }))
  )
}

/** Top-level and @media-nested `selector { body }` rules of app.css. */
const cssRules = [...APP_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
  ([, selector, body]) => ({ selector: selector.trim(), body })
)

describe("floating surfaces use the editor's floating layer", () => {
  const positioners = occurrences(/<\w+\.Positioner\b/g)
  const portals = occurrences(/<\w+\.Portal\b/g)

  it("finds the surfaces it guards (sanity: the scan is wired up)", () => {
    expect(positioners.length).toBeGreaterThanOrEqual(5)
    expect(portals.length).toBe(positioners.length)
  })

  it.each(positioners.map(({ file, tag }) => [file, tag]))(
    "%s: the positioner spreads floatingPositionerProps",
    (_file, tag) => {
      expect(tag).toContain("{...floatingPositionerProps(")
    }
  )

  it.each(portals.map(({ file, tag }) => [file, tag]))(
    "%s: the portal targets the floating layer's container",
    (_file, tag) => {
      expect(tag).toMatch(/container=\{\w+\.container\}/)
    }
  )

  it("routes the shared tooltip through the floating layer", () => {
    const tooltip = sources.find(
      ({ file }) => file === "components/ui/Tooltip.tsx"
    )
    expect(tooltip?.text).toContain("portalContainer={floatingLayer.container}")
    expect(tooltip?.text).toContain(
      "positionMethod={floatingLayer.positionMethod}"
    )
    expect(tooltip?.text).toContain(
      "positionerClassName={FLOATING_SURFACE_CLASS}"
    )
  })

  it("never portals straight to the body", () => {
    const direct = occurrences(/createPortal\([\s\S]{0,200}?document\.body/g)
    expect(direct.map(({ file }) => file)).toEqual([])
  })
})

describe("floating surfaces stack on their positioned root", () => {
  it("stacks the surface class through --apollon-z-floating", () => {
    const rule = cssRules.find(
      ({ selector }) => selector === `.${FLOATING_SURFACE_CLASS}`
    )
    expect(rule?.body).toMatch(/z-index:\s*var\(--apollon-z-floating,\s*\d+\)/)
  })

  // A positioner is placed with `transform`, so it is a stacking context and a
  // z-index on the popup inside it is inert. One there reads as if it lifted
  // the surface over the page, which is exactly the misunderstanding that hid
  // the edit popover.
  const popupClasses = [
    ...new Set(
      occurrences(/<\w+\.Popup\b/g).flatMap(({ tag }) =>
        (tag.match(/className="([^"]+)"/)?.[1] ?? "").split(/\s+/)
      )
    ),
  ].filter(Boolean)

  it("finds the popups it guards (sanity: the scan is wired up)", () => {
    expect(popupClasses.length).toBeGreaterThanOrEqual(5)
  })

  it.each(popupClasses)(
    "no z-index on .%s, which a positioner wraps",
    (cls) => {
      const offending = cssRules.filter(
        ({ selector, body }) =>
          selector
            .split(",")
            .some((part) => new RegExp(`\\.${cls}$`).test(part.trim())) &&
          /(^|;|\s)z-index\s*:/.test(body)
      )
      expect(offending.map(({ selector }) => selector)).toEqual([])
    }
  )
})
