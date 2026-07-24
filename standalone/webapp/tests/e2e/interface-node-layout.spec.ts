import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * A four-centre interface node exposes ONE port per side, so two edges must land on
 * DIFFERENT sides (never collide at one midpoint), and its name label must sit on a side
 * no edge attaches to — read from where the edges ACTUALLY route, not their stored handle.
 */
const __d = path.dirname(fileURLToPath(import.meta.url))
const fx = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "interface-four-center.json"),
    "utf-8"
  )
)
const IFACE = "f11666b0"

const sideOf = (
  p: { x: number; y: number },
  r: { x: number; y: number; width: number; height: number }
): string => {
  const dx = (p.x - (r.x + r.width / 2)) / (r.width / 2)
  const dy = (p.y - (r.y + r.height / 2)) / (r.height / 2)
  return Math.abs(dx) >= Math.abs(dy)
    ? dx >= 0
      ? "right"
      : "left"
    : dy >= 0
      ? "bottom"
      : "top"
}

test("interface edges split across sides and the label avoids them", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fx)
  await waitForCanvasReady(page)
  await page.waitForTimeout(500)

  const data = await page.evaluate((ifacePrefix) => {
    const node = Array.from(
      document.querySelectorAll(".react-flow__node")
    ).find((n) => (n as HTMLElement).dataset.id?.startsWith(ifacePrefix))!
    const nr = node.getBoundingClientRect()
    const endpoints: { x: number; y: number }[] = []
    document
      .querySelectorAll(".react-flow__edge path.react-flow__edge-path")
      .forEach((p) => {
        const nums = (
          (p as SVGPathElement).getAttribute("d")?.match(/-?[\d.]+/g) || []
        ).map(Number)
        // both edges TARGET the interface, so the attachment is the LAST point (flow coords)
        endpoints.push({ x: nums[nums.length - 2], y: nums[nums.length - 1] })
      })
    // interface flow rect via a node with data-id; read from React Flow transform-free
    // approach: use the node's own data-* is unavailable, so return screen rect + label.
    const label = node.querySelector("text, foreignObject")
    return {
      screen: { x: nr.x, y: nr.y, w: nr.width, h: nr.height },
      label: label
        ? (() => {
            const lr = (label as Element).getBoundingClientRect()
            return { cx: lr.x + lr.width / 2, cy: lr.y + lr.height / 2 }
          })()
        : null,
    }
  }, IFACE)

  // The interface's flow rect from the fixture (four-centre node).
  const ifaceNode = fx.nodes.find((n: { id: string }) => n.id.startsWith(IFACE))
  const rect = {
    x: ifaceNode.position.x,
    y: ifaceNode.position.y,
    width: ifaceNode.width,
    height: ifaceNode.height,
  }

  const attach = await page.evaluate(() => {
    const out: { x: number; y: number }[] = []
    document
      .querySelectorAll(".react-flow__edge path.react-flow__edge-path")
      .forEach((p) => {
        const nums = (
          (p as SVGPathElement).getAttribute("d")?.match(/-?[\d.]+/g) || []
        ).map(Number)
        out.push({ x: nums[nums.length - 2], y: nums[nums.length - 1] })
      })
    return out
  })
  const sides = attach.map((p) => sideOf(p, rect))
  expect(sides).toHaveLength(2)
  // The two edges attach to DIFFERENT sides of the four-centre interface.
  expect(sides[0]).not.toBe(sides[1])

  // The label sits on a free side derived from the CURRENT routed attachments.
  // Do not pin it to the historical fixture's right side: a better router may
  // legitimately split the edges top/bottom, in which case left is equally clean.
  expect(data.label).not.toBeNull()
  const ifaceCenterScreen = data.screen.x + data.screen.w / 2
  const ifaceMiddleScreen = data.screen.y + data.screen.h / 2
  const labelDx = data.label!.cx - ifaceCenterScreen
  const labelDy = data.label!.cy - ifaceMiddleScreen
  const labelSide =
    Math.abs(labelDx) >= Math.abs(labelDy)
      ? labelDx >= 0
        ? "right"
        : "left"
      : labelDy >= 0
        ? "bottom"
        : "top"
  expect(sides).not.toContain(labelSide)
})
