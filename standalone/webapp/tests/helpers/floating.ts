import { expect, type Locator } from "@playwright/test"

/**
 * Assert that `surface` is the topmost painted element at its own centre.
 *
 * `toBeVisible()` cannot catch a surface hidden behind something else: it only
 * checks the element's own box and styles, so a popover underneath a host
 * dialog's mask still counts as "visible". Neither does `fill()`, which skips
 * the hit-target check that `click()` does. This hit-tests the page instead.
 * Pointer events are switched on for the surface and its ancestors during the
 * probe, so one that deliberately lets clicks through (a tooltip, the drag
 * ghost) is measured by what is painted over it; everything else on the page is
 * hit-tested exactly as the browser would.
 */
export async function expectPaintedOnTop(surface: Locator) {
  await expect(surface).toBeVisible()
  const result = await surface.evaluate((element) => {
    const forced: Array<[HTMLElement, string]> = []
    for (
      let node: HTMLElement | null = element as HTMLElement;
      node;
      node = node.parentElement
    ) {
      forced.push([node, node.style.pointerEvents])
      node.style.setProperty("pointer-events", "auto", "important")
    }
    try {
      const rect = element.getBoundingClientRect()
      const hit = element.ownerDocument.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      )
      return {
        onTop: hit !== null && element.contains(hit),
        hit: hit
          ? `${hit.tagName.toLowerCase()}.${[...hit.classList].join(".")}`
          : "nothing",
      }
    } finally {
      for (const [node, value] of forced) {
        node.style.removeProperty("pointer-events")
        if (value) node.style.pointerEvents = value
      }
    }
  })
  expect(
    result.onTop,
    `expected the surface on top at its centre, but hit ${result.hit}`
  ).toBe(true)
}

/** Whether `surface` rendered inside its editor's own portal root. */
export function isInEditorPortalRoot(surface: Locator): Promise<boolean> {
  return surface.evaluate((element) =>
    Boolean(element.closest("[data-apollon-portal-root]"))
  )
}
