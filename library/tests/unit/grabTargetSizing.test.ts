import { describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Canvas affordances are drawn small and grabbed through a larger invisible area.
 * Both halves of that mechanism have to hold, and neither is visible from the
 * markup: the ::before that widens the target, and the hover rule that arms
 * pointer events on the control it belongs to.
 */
const css = fs.readFileSync(
  path.join(__dirname, "..", "..", "lib", "styles", "app.css"),
  "utf-8"
)

const declaration = (name: string): string | undefined =>
  css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim()

const ruleBody = (selector: string): string => {
  const index = css.indexOf(`${selector} {`)
  expect(index, `no rule for ${JSON.stringify(selector)}`).toBeGreaterThan(-1)
  return css.slice(index + selector.length + 2, css.indexOf("}", index))
}

describe("grab target sizing", () => {
  it("widens both affordances outward from their drawn size", () => {
    // Asserted as a shape rather than an exact `calc()`: any equivalent
    // arithmetic is fine, a positive inset or a raw px literal is not.
    for (const selector of [
      ".apollon-resize-line::before",
      ".apollon-resize-handle::before",
    ]) {
      const body = ruleBody(selector)
      expect(body).toMatch(/position:\s*absolute/)
      expect(body).toMatch(/inset:\s*calc\(/)
      expect(body).toContain("var(--apollon-grab-")
    }
  })

  it("arms pointer events so the widened area is reachable at all", () => {
    // `.react-flow__resize-control` is `pointer-events: none`, which pseudo-elements
    // inherit. Without this rule every grab target is inert however wide it is.
    expect(
      ruleBody(".react-flow__node:hover .react-flow__resize-control")
    ).toMatch(/pointer-events:\s*all/)
  })

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
