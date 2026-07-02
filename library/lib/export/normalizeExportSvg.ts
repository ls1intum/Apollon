/**
 * Drop `font-style="italic"` from every element of an export SVG.
 *
 * Apollon emits italic for abstract class names and method signatures, but the
 * editor itself ships only upright Inter (Regular + Bold) — on screen the slant
 * is the browser's *synthetic* oblique, and text width is measured with the
 * upright metrics. The raster (resvg) and PDF (jsPDF) paths carry the same two
 * upright faces, so a real italic face would change advance widths and break the
 * editor↔export determinism guarantee (and risk overflowing label boxes). We
 * therefore render abstract text upright on export and strip the attribute so
 * the SVG no longer *claims* an italic it doesn't deliver. Abstractness is not
 * lost: the `{abstract}` text annotation (UML 2.5.1 §9.2.4) is part of the label
 * content and survives every export path, so it — not the slant — carries the
 * cue through to raster/PDF and screen readers.
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
