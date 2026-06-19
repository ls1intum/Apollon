/**
 * Adapt a compat-mode Apollon SVG to the three svg2pdf.js limitations that the
 * library's own compat passes (in exportUtils.ts) do NOT already cover.
 * Relative font-sizes, `tspan` `dy` and `dominant-baseline` are resolved
 * upstream by `getSVG`, so they are intentionally absent here.
 *
 *  1. Nested `<svg>` clips its content despite `overflow="visible"` — svg2pdf
 *     treats the intrinsic size as a clip rect. Apollon wraps each node in
 *     `<svg width viewBox>`; replace those with `<g>` (layout-equivalent since
 *     the viewBox is always `0 0 w h`), translating any non-zero origin.
 *  2. A `<text>` with 2+ `<tspan>` children renders with wrong glyph widths in
 *     svg2pdf; split it into independent `<text>` elements. Each tspan already
 *     carries an absolute `y` (resolved by `resolveTspanDy`).
 *  3. svg2pdf looks up `font-family` as a literal string, so the CSS list
 *     `"Inter, system-ui, …"` misses the registered "Inter" and falls back to a
 *     standard font; collapse any Inter-led list to plain `"Inter"`.
 *
 * Mutates `root` in place and returns it.
 */

const SVG_NS = "http://www.w3.org/2000/svg"

/** Attributes a split `<text>` must keep from its parent so svg2pdf's
 *  per-element lookup matches the original SVG semantics. `font-size` is
 *  inherited because compat SVG only guarantees it on the parent `<text>`
 *  (e.g. HeaderSection class names, MultilineText) — child tspans often carry
 *  only `x`/`y`; without it a split line falls back to svg2pdf's default size
 *  and the PDF label grows/shifts. A tspan's own `font-size` still wins, since
 *  the tspan's attributes are copied after these (see flattenMultiTspans). */
const INHERITED_TEXT_ATTRS = [
  "text-anchor",
  "font-family",
  "font-weight",
  "font-style",
  "font-size",
  "fill",
] as const

function inlineNestedSvgs(root: Element): void {
  // Collect first; replacing while walking would skip siblings.
  const nested: Element[] = []
  const stack: Element[] = [root]
  while (stack.length) {
    for (const child of Array.from(stack.pop()!.children)) {
      stack.push(child)
      if (child !== root && child.localName === "svg") nested.push(child)
    }
  }

  const dropOnG = new Set([
    "width",
    "height",
    "viewBox",
    "overflow",
    "x",
    "y",
    "xmlns",
    "preserveAspectRatio",
  ])
  for (const svg of nested) {
    const doc = svg.ownerDocument
    if (!doc) continue
    const g = doc.createElementNS(SVG_NS, "g")

    // A nested <svg> positions content at its own (x, y) and offsets it by the
    // viewBox origin; <g> has neither, so fold both into a translate. Apollon's
    // nested SVGs use x=y=0 and viewBox "0 0 w h" today, but handling the
    // general case keeps the substitution layout-equivalent.
    const x = parseFloat(svg.getAttribute("x") ?? "0") || 0
    const y = parseFloat(svg.getAttribute("y") ?? "0") || 0
    let vbX = 0
    let vbY = 0
    const viewBox = svg.getAttribute("viewBox")
    if (viewBox) {
      const [a, b] = viewBox.split(/[\s,]+/).map(Number)
      if (Number.isFinite(a)) vbX = a
      if (Number.isFinite(b)) vbY = b
    }
    const tx = x - vbX
    const ty = y - vbY
    if (tx || ty) g.setAttribute("transform", `translate(${tx}, ${ty})`)
    for (const attr of Array.from(svg.attributes)) {
      if (!dropOnG.has(attr.name)) g.setAttribute(attr.name, attr.value)
    }
    while (svg.firstChild) g.appendChild(svg.firstChild)
    svg.parentNode?.replaceChild(g, svg)
  }
}

function flattenMultiTspans(root: Element): void {
  const multiTspanTexts = Array.from(root.querySelectorAll("text")).filter(
    (text) =>
      Array.from(text.children).filter((c) => c.localName === "tspan").length >=
      2
  )

  for (const text of multiTspanTexts) {
    const doc = text.ownerDocument
    const parent = text.parentNode
    if (!doc || !parent) continue

    for (const tspan of Array.from(text.children).filter(
      (c) => c.localName === "tspan"
    )) {
      const newText = doc.createElementNS(SVG_NS, "text")
      for (const attr of INHERITED_TEXT_ATTRS) {
        if (text.hasAttribute(attr)) {
          newText.setAttribute(attr, text.getAttribute(attr)!)
        }
      }
      // The standalone <text> must carry an absolute position. Apollon's
      // multi-tspan texts give every tspan an explicit x/y (resolveTspanDy in
      // getSVG already converted any dy); inherit the parent's x/y as a floor so
      // a tspan that omits one can't silently collapse to the 0 origin.
      if (text.hasAttribute("x"))
        newText.setAttribute("x", text.getAttribute("x")!)
      if (text.hasAttribute("y"))
        newText.setAttribute("y", text.getAttribute("y")!)
      // The tspan's own attributes (its absolute x/y, per-tspan font-size/style)
      // win over the inherited parent values.
      for (const attr of Array.from(tspan.attributes)) {
        newText.setAttribute(attr.name, attr.value)
      }
      newText.textContent = tspan.textContent ?? ""
      parent.insertBefore(newText, text)
    }
    parent.removeChild(text)
  }
}

function normalizeInterFontFamily(root: Element): void {
  const stack: Element[] = [root]
  while (stack.length) {
    const node = stack.pop()!
    const family = node.getAttribute("font-family")
    // Only collapse an Inter-*led* list (Inter is the primary face, as Apollon
    // emits). A list where Inter is merely a fallback keeps its primary.
    if (family && /^\s*["']?Inter\b/i.test(family)) {
      node.setAttribute("font-family", "Inter")
    }
    for (const child of Array.from(node.children)) stack.push(child)
  }
}

export function preProcessSvgForPdf(root: Element): Element {
  // Inline nested SVGs first so the later passes walk the flattened tree.
  inlineNestedSvgs(root)
  flattenMultiTspans(root)
  normalizeInterFontFamily(root)
  return root
}
