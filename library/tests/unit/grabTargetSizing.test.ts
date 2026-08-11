import { describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Canvas affordances are drawn small and grabbed through a larger invisible area,
 * and there are only two sizes of that area: a 24px point target for corner
 * handles (WCAG 2.2 SC 2.5.8, AA) and a 14px band for affordances that run along
 * a node edge. Keeping both in tokens is what stops a generous corner appearing
 * beside a hairline edge on the same resizer, which is how they had drifted.
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
  it("defines both grab sizes as tokens", () => {
    expect(declaration("--apollon-grab-target")).toBe("24px")
    expect(declaration("--apollon-grab-band")).toBe("14px")
  })

  it("matches the edge band to the connection arc on the same edge", () => {
    // The arc sits at the midpoint of the edge the resize line runs along, so a
    // different thickness would read as two unrelated affordances.
    expect(declaration("--arc-short")).toContain("14px")
    expect(declaration("--apollon-grab-band")).toBe("14px")
  })

  it("widens both affordances from their drawn size to a grab size", () => {
    // Written as `(drawn - grab) / 2` so the drawn size stays visible in the rule
    // and the target cannot silently diverge from the token.
    expect(ruleBody(".apollon-resize-line::before")).toContain(
      "calc((1px - var(--apollon-grab-band)) / 2)"
    )
    expect(ruleBody(".apollon-resize-handle::before")).toContain(
      "calc((10px - var(--apollon-grab-target)) / 2)"
    )
  })

  it("keeps the corner target from swallowing the edge band", () => {
    // A corner's 24px target already reaches 12px along each edge it touches. A
    // 24px band would overlap that on both ends of every edge; 14px does not.
    const target = Number.parseFloat(declaration("--apollon-grab-target")!)
    const band = Number.parseFloat(declaration("--apollon-grab-band")!)
    expect(band).toBeLessThan(target)
  })
})
