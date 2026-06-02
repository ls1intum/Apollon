import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
} from "../helpers/canvas"

/**
 * Grid-alignment guard: every rendered connection point (React Flow handle)
 * on a node must land on the 5px canvas grid, measured as the handle's
 * on-screen centre converted back into flow coordinates. This is what edges
 * actually attach to, so it is the real "connectors are on the grid" check.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const noEdge = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "two-class-no-edge.json"),
    "utf-8"
  )
) as Record<string, unknown>

// Fixture node ids and their known grid-snapped flow positions.
const NODES = [
  { id: "95aac2b6-3e6b-4e6d-9201-52a498e6ea20", flow: { x: 220, y: 370 } },
  { id: "32659cdc-bd03-46f3-918c-ee8dbba9c15b", flow: { x: 640, y: 370 } },
]

test("every class-node connection point lands on the 5px grid", async ({
  page,
}) => {
  await injectFixtureIntoLocalStorage(page, noEdge)
  await page.goto("/")
  await waitForCanvasReady(page)

  for (const node of NODES) {
    await page.locator(`.react-flow__node[data-id="${node.id}"]`).hover()
    await page.waitForTimeout(120)

    const offGrid = await page.evaluate(({ id, flow }) => {
      const vp = document.querySelector(".react-flow__viewport") as HTMLElement
      const scale = new DOMMatrixReadOnly(getComputedStyle(vp).transform).a
      const el = document.querySelector(
        `.react-flow__node[data-id="${id}"]`
      ) as HTMLElement
      const nodeRect = el.getBoundingClientRect()
      const handles = Array.from(
        el.querySelectorAll<HTMLElement>(".react-flow__handle")
      )
      const bad: string[] = []
      for (const h of handles) {
        const r = h.getBoundingClientRect()
        const flowX = flow.x + (r.x + r.width / 2 - nodeRect.x) / scale
        const flowY = flow.y + (r.y + r.height / 2 - nodeRect.y) / scale
        const offX = Math.abs(((flowX % 5) + 5) % 5)
        const offY = Math.abs(((flowY % 5) + 5) % 5)
        const onX = offX < 0.5 || offX > 4.5
        const onY = offY < 0.5 || offY > 4.5
        if (!onX || !onY) {
          bad.push(
            `${h.getAttribute("data-handleid")} @ (${flowX.toFixed(2)},${flowY.toFixed(2)})`
          )
        }
      }
      return { count: handles.length, bad }
    }, node)

    expect(offGrid.count, "node should render handles").toBeGreaterThan(0)
    expect(
      offGrid.bad,
      `off-grid handles on ${node.id}: ${offGrid.bad.join(", ")}`
    ).toEqual([])
  }
})
