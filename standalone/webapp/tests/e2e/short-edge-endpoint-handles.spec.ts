import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * On a SHORT edge the endpoint grips — the visible handles you drag to reposition an end
 * or reconnect it to another node — must stay a usable size. They used to be starved to
 * 0-4px because their size was capped against a nearby bend handle. The grip is now sized
 * independently (it is pointer-events:none, so it may cosmetically overlap a handle) and
 * floored at a visible minimum, so BOTH the grips AND the bend handle stay present — no
 * handle is traded away for another.
 */
const __d = path.dirname(fileURLToPath(import.meta.url))
const fx = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "short-edge-close-nodes.json"),
    "utf-8"
  )
)

test("a short straight edge keeps usable endpoint grips alongside its bend handle", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fx)
  await waitForCanvasReady(page)
  await page.waitForTimeout(300)
  await page.locator(".react-flow__edge").first().click({ force: true })
  await page.waitForTimeout(300)

  const sizes = await page.evaluate(() => {
    const measure = (sel: string) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height) }
    }
    return {
      sourceGrip: measure(".edge-endpoint-grip--source"),
      targetGrip: measure(".edge-endpoint-grip--target"),
      sourceHit: measure(".edge-endpoint-handle--source"),
      targetHit: measure(".edge-endpoint-handle--target"),
    }
  })

  // Both visible grips exist and are a usable size — the reported bug was 0px / 4px.
  for (const grip of [sizes.sourceGrip, sizes.targetGrip]) {
    expect(grip).not.toBeNull()
    expect(Math.max(grip!.w, grip!.h)).toBeGreaterThanOrEqual(10)
  }
  // The reconnect hit targets are also present and grabbable.
  for (const hit of [sizes.sourceHit, sizes.targetHit]) {
    expect(hit).not.toBeNull()
    expect(Math.min(hit!.w, hit!.h)).toBeGreaterThanOrEqual(12)
  }
})

test("a short pinned S-jog edge keeps usable endpoint grips and still shows its bend handles", async ({
  page,
}) => {
  const fx = JSON.parse(
    fs.readFileSync(
      path.join(__d, "..", "fixtures", "short-edge-pinned-jog.json"),
      "utf-8"
    )
  )
  await openFixtureInLocalEditor(page, fx)
  await waitForCanvasReady(page)
  await page.waitForTimeout(300)
  await page.locator(".react-flow__edge").first().click({ force: true })
  await page.waitForTimeout(300)

  const info = await page.evaluate(() => {
    const m = (sel: string) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height) }
    }
    const fillOf = (sel: string) => {
      const el = document.querySelector(sel)
      return el ? getComputedStyle(el).fill : null
    }
    return {
      bendHandles: document.querySelectorAll(".edge-bend-handle").length,
      sg: m(".edge-endpoint-grip--source"),
      tg: m(".edge-endpoint-grip--target"),
      gripFill: fillOf(".edge-endpoint-grip--source"),
      bendFill: fillOf(".edge-bend-handle"),
    }
  })
  // Both grips are visible and usable (was 0px) AND the bend handles are still present —
  // nothing is omitted on this short edge.
  for (const grip of [info.sg, info.tg]) {
    expect(grip).not.toBeNull()
    expect(Math.max(grip!.w, grip!.h)).toBeGreaterThanOrEqual(10)
  }
  expect(info.bendHandles).toBeGreaterThan(0)
  // The grips read as WHITE-with-outline handles — a fill distinct from the (solid blue)
  // bend handle they overlap, so a pinned end never merges into it.
  expect(info.gripFill).not.toBe(info.bendFill)
})
