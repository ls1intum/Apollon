import { describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * The node's selection ring must be layout-neutral AND paint underneath the
 * node's own content.
 *
 * Both halves have been broken once. A `border` changed layout, so nodes shifted
 * a pixel on hover. An `outline` fixed that but is painted last in its element's
 * paint order — above every descendant — so it cut across the assessment badges
 * (check / cross / alert) drawn at the node's edge. An outer `box-shadow` paints
 * with the element's background, below its content, and costs no layout.
 */
const css = fs.readFileSync(
  path.join(__dirname, "..", "..", "lib", "styles", "app.css"),
  "utf-8"
)

function ruleBody(selector: string): string {
  const index = css.indexOf(`\n${selector} {`)
  expect(index, `no rule for "${selector}"`).toBeGreaterThan(-1)
  const open = css.indexOf("{", index)
  return css.slice(open + 1, css.indexOf("}", open))
}

describe(".react-flow__node selection ring", () => {
  const body = ruleBody(".react-flow__node")

  it("uses a reserved box-shadow, not a border or an outline", () => {
    expect(body).toMatch(/box-shadow:\s*0 0 0 \d+px transparent/)
    expect(body).not.toMatch(/(^|[^-])border:/)
    expect(body).not.toMatch(/outline:/)
  })

  it("changes only the ring colour on hover and selection", () => {
    const hover = ruleBody(
      ".react-flow__node:hover,\n.react-flow__node.selected"
    )
    expect(hover.trim()).toMatch(/^box-shadow:[^;]+;$/)
  })

  it("keeps the badge ring under the badges everywhere it is drawn", () => {
    // Every state that rings a node must use the same under-painting mechanism.
    for (const selector of [
      ".react-flow__node.apollon-assessment-focus",
      ".apollon-highlight--selected,\n.apollon-highlight--highlighted",
    ]) {
      expect(ruleBody(selector)).toMatch(/box-shadow:/)
      expect(ruleBody(selector)).not.toMatch(/outline:/)
    }
  })
})
