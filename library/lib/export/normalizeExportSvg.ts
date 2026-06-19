/**
 * Drop `font-style="italic"` from every element of an export SVG.
 *
 * Apollon emits italic for abstract-class headers, but the editor itself ships
 * only upright Inter (Regular + Bold) — on screen the slant is the browser's
 * *synthetic* oblique, and text width is measured with the upright metrics.
 * The raster (resvg) and PDF (jsPDF) paths carry the same two upright faces, so
 * a real italic face would change advance widths and break the editor↔export
 * determinism guarantee (and risk overflowing label boxes). We therefore render
 * abstract names upright by design — matching the server export — and strip the
 * attribute so the SVG no longer *claims* an italic it doesn't deliver. Abstract
 * classes stay distinguishable by their «Abstract» stereotype label.
 *
 * Mutates `root` in place.
 */
export function normalizeExportSvg(root: Element): void {
  const stack: Element[] = [root]
  while (stack.length) {
    const node = stack.pop()!
    if (node.getAttribute("font-style") === "italic") {
      node.removeAttribute("font-style")
    }
    for (const child of Array.from(node.children)) stack.push(child)
  }
}
