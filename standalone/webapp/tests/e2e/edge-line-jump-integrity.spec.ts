import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import {
  nodeNearestViewportCenter,
  openLocalWithPerf,
  readPerf,
} from "../perf/perfHelpers"

/**
 * Geometry-integrity coverage for line jumps, asserted against the ACTUAL
 * rendered SVG of every edge — independent of any internal model.
 *
 * The settled-fixture and authored-drag checks enforce both invariants:
 *   1. Every bridge arc sits on a real crossing of two edges (no arc floating
 *      in empty space — the deployment-diagram regression).
 *   2. Every real orthogonal crossing has exactly one bridge (nothing missed).
 *
 * The Worker handoff regression focuses on the reported first invariant across
 * painted preview and settlement frames. The check parses each edge's `d`,
 * reconstructs its polyline + bridge apexes,
 * computes the true crossings, and compares — so it works for any edge type
 * (step, straight-path, container-child) without hard-coded coordinates.
 */

const __dirname2 = path.dirname(fileURLToPath(import.meta.url))
const load = (name: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname2, "..", "fixtures", name), "utf-8")
  ) as Record<string, unknown>

type P = { x: number; y: number }
type Seg = {
  a: P
  b: P
  horizontal: boolean
  vertical: boolean
  bridgeChord: boolean
}

function parsePath(d: string): {
  verts: P[]
  bridges: P[]
  bridgeChords: Array<{ a: P; b: P }>
} {
  const toks = d.match(/[MLQ]|-?[\d.]+/g) ?? []
  const verts: P[] = []
  const bridges: P[] = []
  const bridgeChords: Array<{ a: P; b: P }> = []
  let i = 0
  let cmd = ""
  let prev: P | null = null
  const num = () => Number(toks[i++])
  while (i < toks.length) {
    const t = toks[i]
    if (t === "M" || t === "L" || t === "Q") {
      cmd = t
      i++
    }
    if (cmd === "M" || cmd === "L") {
      const p = { x: num(), y: num() }
      verts.push(p)
      prev = p
    } else if (cmd === "Q") {
      const c = { x: num(), y: num() }
      const end = { x: num(), y: num() }
      if (prev) {
        const horizontal = Math.abs(prev.y - end.y) < 1
        bridges.push(horizontal ? { x: c.x, y: prev.y } : { x: prev.x, y: c.y })
        bridgeChords.push({ a: prev, b: end })
      }
      verts.push(end)
      prev = end
    } else i++
  }
  return { verts, bridges, bridgeChords }
}

function toSegments(
  verts: P[],
  bridgeChords: Array<{ a: P; b: P }> = []
): Seg[] {
  const segs: Seg[] = []
  for (let i = 0; i < verts.length - 1; i++) {
    const a = verts[i]
    const b = verts[i + 1]
    segs.push({
      a,
      b,
      horizontal: Math.abs(a.y - b.y) < 1.5,
      vertical: Math.abs(a.x - b.x) < 1.5,
      bridgeChord: bridgeChords.some(
        (chord) =>
          chord.a.x === a.x &&
          chord.a.y === a.y &&
          chord.b.x === b.x &&
          chord.b.y === b.y
      ),
    })
  }
  return segs
}

function interiorCrossing(h: Seg, v: Seg): P | null {
  // Match production's strict 1px interior check on the crossed segment. The
  // normal base-segment inset is half the 16px jump plus 2px. A Q chord exists
  // only where production already accepted a crossing on the original segment,
  // so reconstruct that span without treating the arc endpoints as bends.
  const horizontalMargin = h.bridgeChord ? 0 : JUMP_WIDTH / 2 + 2
  const verticalMargin = 1
  if (!h.horizontal || !v.vertical) return null
  const x = (v.a.x + v.b.x) / 2
  const y = (h.a.y + h.b.y) / 2
  if (
    x < Math.min(h.a.x, h.b.x) + horizontalMargin ||
    x > Math.max(h.a.x, h.b.x) - horizontalMargin
  )
    return null
  if (
    y < Math.min(v.a.y, v.b.y) + verticalMargin ||
    y > Math.max(v.a.y, v.b.y) - verticalMargin
  )
    return null
  return { x, y }
}

const near = (a: P, b: P, tol = 5) => Math.hypot(a.x - b.x, a.y - b.y) < tol

// The renderer draws at most one bridge per jump-width window: two crossings closer
// than EDGES.EDGE_LINE_JUMP_WIDTH on the same line would draw as overlapping arcs, so
// buildPathWithLineJumps keeps the first and omits the rest (see the `< jumpWidth`
// guard there). A crossing consolidated into a neighbouring bridge like that is
// COVERED, not missed — the arc a reader sees spans the cluster. This mirrors that
// contract: a crossing counts as bridged if a bridge sits on it, or on the same line
// within one jump-width of it.
const JUMP_WIDTH = 16
const isBridged = (c: P, bridges: P[]) =>
  bridges.some(
    (p) =>
      near(c, p) ||
      (Math.abs(p.y - c.y) < 3 && Math.abs(p.x - c.x) < JUMP_WIDTH) ||
      (Math.abs(p.x - c.x) < 3 && Math.abs(p.y - c.y) < JUMP_WIDTH)
  )

async function checkIntegrity(page: Page, includePerf = false) {
  const snapshot = await page
    .locator(".react-flow__edge")
    .evaluateAll((elements, readPerf) => {
      const rendered = elements.flatMap((element, index) => {
        const d = element
          .querySelector(".react-flow__edge-path")
          ?.getAttribute("d")
        return d
          ? [{ id: element.getAttribute("data-id") ?? `#${index}`, d }]
          : []
      })
      const perf = readPerf
        ? (
            window as unknown as {
              __apollonPerf?: (skipDocumentEncoding?: boolean) =>
                | {
                    routingPreviewCount: number
                    workerHolisticPreviewCount: number
                    workerReleaseExactMaxMs: number
                  }
                | undefined
            }
          ).__apollonPerf?.(true)
        : undefined
      return { rendered, perf }
    }, includePerf)
  const edges = snapshot.rendered.map(({ id, d }) => ({
    id,
    ...parsePath(d),
  }))

  const crossings: P[] = []
  for (let a = 0; a < edges.length; a++)
    for (let b = 0; b < edges.length; b++) {
      if (a === b) continue
      for (const h of toSegments(edges[a].verts, edges[a].bridgeChords))
        for (const v of toSegments(edges[b].verts, edges[b].bridgeChords)) {
          const c = interiorCrossing(h, v)
          if (c && !crossings.some((r) => near(r, c, 3))) crossings.push(c)
        }
    }

  const bridges = edges.flatMap((e) =>
    e.bridges.map((p) => ({ ...p, id: e.id }))
  )
  const floating = bridges.filter((p) => !crossings.some((c) => near(c, p)))
  const unmarked = crossings.filter((c) => !isBridged(c, bridges))
  const floatingDiagnostics = floating.map((bridge) => ({
    bridge,
    path: snapshot.rendered.find(({ id }) => id === bridge.id)?.d,
    nearestCrossings: crossings
      .map((crossing) => ({
        crossing,
        distance: Math.hypot(crossing.x - bridge.x, crossing.y - bridge.y),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3),
  }))
  return {
    crossings,
    bridges,
    floating,
    floatingDiagnostics,
    unmarked,
    perf: snapshot.perf,
  }
}

async function loadFixture(page: Page, name: string) {
  await openFixtureInLocalEditor(page, load(name))
  await waitForCanvasReady(page)
}

test.describe("Line-jump geometry integrity", () => {
  // Each fixture must satisfy both invariants. deployment / use-case use
  // straight-path / diagonal edges — they must produce NO floating bridges
  // (the exact regression where re-derived geometry hallucinated crossings).
  // `mustCross` fixtures are designed to contain crossings — if one stops producing
  // any, the two `[]` assertions below pass vacuously, so we require the crossings to
  // exist. The others exercise the no-false-bridge path and legitimately have none.
  for (const { fixture, mustCross } of [
    { fixture: "line-jump-cross.json", mustCross: true },
    { fixture: "line-jump-complex.json", mustCross: true },
    { fixture: "deployment-diagram.json", mustCross: false },
    { fixture: "use-case-diagram.json", mustCross: false },
    { fixture: "class-diagram.json", mustCross: false },
  ]) {
    test(`${fixture}: every bridge sits on a real crossing`, async ({
      page,
    }) => {
      await loadFixture(page, fixture)
      const r = await checkIntegrity(page)
      if (mustCross)
        expect(
          r.crossings.length,
          "fixture no longer produces crossings — the checks below would pass vacuously"
        ).toBeGreaterThan(0)
      expect(r.floating, "bridges floating off any crossing").toEqual([])
      expect(r.unmarked, "real crossings with no bridge").toEqual([])
    })
  }

  test("bridges stay on the crossings while a node is dragged around", async ({
    page,
  }) => {
    await loadFixture(page, "line-jump-complex.json")
    const node = page.locator('.react-flow__node[data-id="B"]')
    const box = await node.boundingBox()
    if (!box) throw new Error("node B not found")
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    for (const [dx, dy] of [
      [60, 0],
      [60, -80],
      [-40, 40],
    ]) {
      await page.mouse.move(cx + dx, cy + dy, { steps: 8 })
      await page.waitForTimeout(160)
      const r = await checkIntegrity(page)
      expect(r.floating, `floating bridge mid-drag @(${dx},${dy})`).toEqual([])
      expect(r.unmarked, `unmarked crossing mid-drag @(${dx},${dy})`).toEqual(
        []
      )
    }
    await page.mouse.up()
    await page.waitForTimeout(200)
    const settled = await checkIntegrity(page)
    expect(settled.floating).toEqual([])
    expect(settled.unmarked).toEqual([])
  })

  test("bridges stay attached during Worker preview and at settlement handoff", async ({
    page,
  }) => {
    // This exercises the Worker preview + release-exact settlement path on a
    // 30-node fixture; the Worker round-trip can exceed the default budget on a
    // loaded CI runner, so give it room (the integrity assertions below are what
    // matter, not how fast the Worker returns).
    test.setTimeout(60_000)
    const fixture = load("perf-routing-30-nodes.json")
    await openLocalWithPerf(page, fixture)
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __apollonPerf?: (
              skipDocumentEncoding?: boolean
            ) => { routingSolving: number } | undefined
          }
        ).__apollonPerf?.(true)?.routingSolving === 0
    )
    const beforeDrag = await checkIntegrity(page)
    expect(beforeDrag.crossings.length).toBeGreaterThan(0)
    expect(beforeDrag.floating).toEqual([])
    expect(beforeDrag.unmarked).toEqual([])

    const editor = page.locator(`#react-flow-library-${String(fixture.id)}`)
    const nodeId = await nodeNearestViewportCenter(editor, page.viewportSize()!)
    expect(nodeId).not.toBeNull()
    const node = editor.locator(`.react-flow__node[data-id="${nodeId}"]`)
    const box = await node.boundingBox()
    expect(box).not.toBeNull()
    const startX = box!.x + box!.width / 2
    const startY = box!.y + box!.height / 2
    const beforeInteraction = await readPerf(page, true)
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    for (let step = 1; step <= 30; step++) {
      await page.mouse.move(startX + step * 2, startY + step)
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      )
    }

    await expect
      .poll(
        async () => {
          const perf = await readPerf(page, true)
          return (
            perf.workerHolisticPreviewCount >
              beforeInteraction.workerHolisticPreviewCount &&
            perf.routingPreviewCount > 0
          )
        },
        // Poll gently: a 5ms interval re-ran the full DOM integrity scan ~200×/s
        // and starved the very Worker message-handling it was waiting on.
        { intervals: [100, 250, 500], timeout: 15_000 }
      )
      .toBe(true)
    // The perf write happens in the solver's layout effect. Inspect painted
    // frames after React has committed every subscribed edge.
    for (let frame = 0; frame < 3; frame++) {
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      )
      const duringInteraction = await checkIntegrity(page, true)
      expect(duringInteraction.perf?.routingPreviewCount).toBeGreaterThan(0)
      expect(
        duringInteraction.crossings.length,
        "fixture no longer produces crossings during interaction"
      ).toBeGreaterThan(0)
      expect(
        duringInteraction.floating,
        `bridges floating during interaction frame ${frame}: ${JSON.stringify(
          duringInteraction.floatingDiagnostics
        )}`
      ).toEqual([])
    }

    const beforeRelease = await readPerf(page, true)
    await page.mouse.up()
    let afterRelease: Awaited<ReturnType<typeof checkIntegrity>> | undefined
    await expect
      .poll(
        async () => {
          const snapshot = await checkIntegrity(page, true)
          if (
            snapshot.perf &&
            snapshot.perf.workerReleaseExactMaxMs >
              beforeRelease.workerReleaseExactMaxMs
          ) {
            afterRelease = snapshot
            return true
          }
          return false
        },
        // Poll gently: a 5ms interval re-ran the full DOM integrity scan ~200×/s
        // and starved the very Worker message-handling it was waiting on. The
        // release-exact result and preview teardown may commit atomically, so do
        // not require a painted frame where both telemetry states overlap.
        { intervals: [100, 250, 500], timeout: 15_000 }
      )
      .toBe(true)

    expect(afterRelease).toBeDefined()
    expect(
      afterRelease!.crossings.length,
      "fixture no longer produces crossings after settlement"
    ).toBeGreaterThan(0)
    expect(
      afterRelease!.floating,
      `bridges floating after settlement: ${JSON.stringify(
        afterRelease!.floatingDiagnostics
      )}`
    ).toEqual([])
  })
})
