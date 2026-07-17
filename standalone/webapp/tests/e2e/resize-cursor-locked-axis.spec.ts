import { test, expect, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * A class's height is driven by its attributes and methods, so it cannot be
 * resized vertically — but React Flow still drew a resize control on the top and
 * bottom borders, which offered an `ns-resize` cursor and a drag that did
 * nothing. The unit tests assert which controls render; only a real browser
 * resolves React Flow's stylesheet into a cursor, so the symptom itself — a
 * resize cursor existing anywhere on a node that cannot be resized — is
 * asserted here.
 */

const MODEL = {
  id: "e2e-resize-cursor",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "resize cursor",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: "cls0-0000-0000-0000-000000000001",
      type: "class",
      width: 200,
      height: 120,
      position: { x: 300, y: 300 },
      measured: { width: 200, height: 120 },
      data: { name: "Locked", attributes: [], methods: [] },
    },
    {
      id: "pkg0-0000-0000-0000-000000000002",
      type: "package",
      width: 200,
      height: 150,
      position: { x: 700, y: 300 },
      measured: { width: 200, height: 150 },
      data: { name: "Free" },
    },
  ],
}

/**
 * Every resize cursor the browser resolves anywhere inside a node. Read off the
 * elements directly rather than by pointing at a border: the connection arcs
 * blanket a border's full width, so `elementFromPoint` there reports whichever
 * of two stacked elements wins — which is not what this is asking about.
 */
const resizeCursorsIn = (page: Page, name: string) =>
  page.evaluate((nodeName) => {
    const host = [...document.querySelectorAll(".react-flow__node")].find((n) =>
      (n.textContent || "").includes(nodeName)
    )
    if (!host) throw new Error(`no node named ${nodeName}`)
    return [host, ...host.querySelectorAll("*")]
      .map((el) => getComputedStyle(el).cursor)
      .filter((cursor) => cursor.includes("resize"))
  }, name)

test("a class exposes no resize cursor, because its height is content-sized", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  // Only width can change, so `ew-resize` on the side borders is honest; any
  // `ns-resize` is the false affordance from issue #629.
  expect(await resizeCursorsIn(page, "Locked")).toEqual([
    "ew-resize",
    "ew-resize",
  ])
})

test("a package still exposes resize cursors on every border", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  // Guards the opposite error: suppressing the cursor everywhere would also
  // silence issue #629, and would be the worse bug.
  const cursors = await resizeCursorsIn(page, "Free")

  expect(cursors).toContain("ns-resize")
  expect(cursors).toContain("ew-resize")
  expect(cursors).toContain("nwse-resize")
})
