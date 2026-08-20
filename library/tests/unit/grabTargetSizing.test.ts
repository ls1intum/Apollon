import { describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Canvas affordances are drawn small and grabbed through a larger invisible area.
 * Asserted here only where the invariant is a relationship BETWEEN two source
 * constants, which no runtime test can see. That the widened area is actually
 * reachable is a question about hit-testing, so it lives in
 * `resize-edge-reachable.spec.ts` against a real browser.
 */
const css = fs.readFileSync(
  path.join(__dirname, "..", "..", "lib", "styles", "app.css"),
  "utf-8"
)

const declaration = (name: string): string | undefined =>
  css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim()

describe("grab target sizing", () => {
  it("matches the edge band to the arc drawn at that same edge", () => {
    // A different thickness would read as two unrelated affordances where the
    // resize line and the connection arc meet.
    const arcBase = declaration("--arc-short")?.match(
      /calc\((\d+)px \* var\(--arc-scale/
    )?.[1]
    expect(arcBase).toBeDefined()
    expect(declaration("--apollon-grab-band")).toBe(`${arcBase}px`)
  })

  it("keeps a corner's point target from swallowing the edge band", () => {
    const target = Number.parseFloat(declaration("--apollon-grab-target")!)
    const band = Number.parseFloat(declaration("--apollon-grab-band")!)
    // A corner already reaches target/2 along each edge it touches, so a band as
    // wide as the target would overlap it at both ends of every edge.
    expect(band).toBeLessThan(target)
    expect(target).toBeGreaterThanOrEqual(24) // WCAG 2.2 SC 2.5.8 (AA)
  })
})
