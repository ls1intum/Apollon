/**
 * Pre-process an Apollon compat-mode SVG so svg2pdf.js can render every
 * `<text>` / `<tspan>` element correctly.
 *
 * svg2pdf has four documented limitations we work around here. Without these
 * passes, stereotype labels («Interface», «Abstract», «Enumeration», "Package",
 * "Legend") and italic abstract-class names disappear from PDF output.
 *
 *  1. **Nested `<svg>` clips text despite `overflow="visible"`.** Apollon
 *     wraps each node in `<svg width="W" height="H" viewBox="0 0 W H">`;
 *     svg2pdf treats the intrinsic size as a clip rect. We replace every
 *     non-root `<svg>` with a `<g>`, compensating for any non-zero viewBox
 *     origin via a `translate` transform. Groups don't introduce a viewport,
 *     so the clipping disappears while layout coordinates stay identical.
 *
 *  2. **Multi-tspan text rendering corrupts long strings.** When a `<text>`
 *     element holds 2+ `<tspan>` children using `x`/`dy` for stacked layout
 *     (Apollon's pattern for stereotype-above-class-name), svg2pdf renders
 *     them with the wrong character widths. We split each multi-tspan text
 *     into independent `<text>` elements with absolute y-coordinates
 *     computed from the parent's y plus accumulated `dy`.
 *
 *  3. **Comma-separated `font-family` falls back to Helvetica.** svg2pdf
 *     looks up the literal font-family string in jsPDF's registry; passing
 *     `"Inter, system-ui, …, sans-serif"` matches no entry. We collapse
 *     every Inter-led list to plain `"Inter"` so jsPDF's getTextWidth uses
 *     our embedded Inter TTF instead of falling back to Helvetica.
 *
 *  4. **Relative font-size (`85%`, `0.85em`) silently drops the tspan.**
 *     svg2pdf only handles absolute units. We walk the tree once and
 *     resolve relative sizes against the inherited parent size in `px`.
 *
 * In addition we propagate `text-anchor` and a few related text properties
 * from each `<text>` onto its `<tspan>` children so svg2pdf's per-element
 * lookup matches what the SVG semantics imply.
 *
 * The function mutates the passed element in place and returns it.
 */

const SVG_NS = "http://www.w3.org/2000/svg"
const SVG_DEFAULT_FONT_SIZE_PX = 16
/** Attributes inherited from <text> onto every <tspan> child if absent. */
const INHERITED_TEXT_ATTRS = [
  "text-anchor",
  "font-family",
  "font-weight",
  "font-style",
  "fill",
  "dominant-baseline",
] as const

function parseFontSize(value: string, parentSizePx: number): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.endsWith("%")) {
    const pct = Number.parseFloat(trimmed)
    return Number.isFinite(pct) ? (parentSizePx * pct) / 100 : null
  }
  if (trimmed.endsWith("em")) {
    const em = Number.parseFloat(trimmed)
    return Number.isFinite(em) ? parentSizePx * em : null
  }
  if (trimmed.endsWith("px") || trimmed.endsWith("pt")) {
    const num = Number.parseFloat(trimmed)
    return Number.isFinite(num) ? num : null
  }
  // Bare number — SVG 2 treats it as user units (≈ px).
  const bare = Number.parseFloat(trimmed)
  return Number.isFinite(bare) ? bare : null
}

function inheritTextAttributes(parent: Element): void {
  const tspans = parent.getElementsByTagName("tspan")
  for (let i = 0; i < tspans.length; i++) {
    const tspan = tspans[i]
    if (!tspan) continue
    for (const attr of INHERITED_TEXT_ATTRS) {
      if (!tspan.hasAttribute(attr) && parent.hasAttribute(attr)) {
        tspan.setAttribute(attr, parent.getAttribute(attr) as string)
      }
    }
  }
}

/**
 * jsPDF/svg2pdf doesn't parse `font-family` as a CSS list — passing
 * `"Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"` makes it look
 * up a single font literally named that whole string, fail, and fall back
 * to Helvetica with mismatched glyph widths. We registered "Inter" with
 * jsPDF; collapse every Inter-led family to that single name so svg2pdf's
 * width measurement matches the embedded font.
 */
function normalizeInterFontFamily(root: Element): void {
  const stack: Element[] = [root]
  while (stack.length) {
    const node = stack.pop()!
    const ff = node.getAttribute("font-family")
    if (ff && /(^|,\s*)Inter\b/i.test(ff)) {
      node.setAttribute("font-family", "Inter")
    }
    for (const child of Array.from(node.children)) stack.push(child)
  }
}

/**
 * Replace every non-root `<svg>` in `root` with a `<g>`. Apollon's nested
 * SVGs always have viewBox = "0 0 width height" with the same width/height
 * attributes, so the substitution is layout-equivalent. Any non-zero viewBox
 * origin is compensated for via a translate transform.
 */
function inlineNestedSvgs(root: Element): void {
  // Find all nested <svg> elements first; mutating the tree while iterating
  // would skip siblings.
  const inner: Element[] = []
  const stack: Element[] = [root]
  while (stack.length) {
    const node = stack.pop()!
    for (const child of Array.from(node.children)) {
      stack.push(child)
      if (child !== root && child.localName === "svg") {
        inner.push(child)
      }
    }
  }

  for (const svg of inner) {
    const doc = svg.ownerDocument
    if (!doc) continue
    const g = doc.createElementNS(SVG_NS, "g")

    const viewBox = svg.getAttribute("viewBox")
    if (viewBox) {
      const parts = viewBox
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => Number.isFinite(n))
      const minX = parts[0]
      const minY = parts[1]
      if (minX !== undefined && minY !== undefined && (minX !== 0 || minY !== 0)) {
        g.setAttribute("transform", `translate(${-minX}, ${-minY})`)
      }
    }

    // Forward attributes useful on <g> (style, class, opacity). Drop layout
    // attributes that only make sense on <svg> (width, height, viewBox,
    // overflow, x, y, xmlns).
    const skip = new Set([
      "width",
      "height",
      "viewBox",
      "overflow",
      "x",
      "y",
      "xmlns",
      "preserveAspectRatio",
    ])
    for (const attr of Array.from(svg.attributes)) {
      if (!skip.has(attr.name)) g.setAttribute(attr.name, attr.value)
    }

    while (svg.firstChild) g.appendChild(svg.firstChild)
    svg.parentNode?.replaceChild(g, svg)
  }
}

/**
 * Split every `<text>` containing 2+ `<tspan>` children into independent
 * `<text>` elements. svg2pdf has a tspan-rendering bug that truncates
 * strings >~10 chars when the parent has `text-anchor="middle"` plus
 * `font-weight="bold"`; emitting standalone `<text>` per tspan sidesteps it.
 */
function flattenMultiTspans(root: Element): void {
  const candidates: Element[] = []
  const stack: Element[] = [root]
  while (stack.length) {
    const node = stack.pop()!
    for (const child of Array.from(node.children)) {
      stack.push(child)
      if (child.localName === "text") {
        const tspans = Array.from(child.children).filter(
          (c) => c.localName === "tspan"
        )
        if (tspans.length >= 2) candidates.push(child)
      }
    }
  }

  for (const text of candidates) {
    const doc = text.ownerDocument
    const parent = text.parentNode
    if (!doc || !parent) continue
    const tspans = Array.from(text.children).filter(
      (c) => c.localName === "tspan"
    )

    const baseY = Number.parseFloat(text.getAttribute("y") ?? "0") || 0
    let cursorY = baseY

    const replacements: Element[] = []
    for (const tspan of tspans) {
      const newText = doc.createElementNS(SVG_NS, "text")

      // Inherit every attribute from the parent <text> first.
      for (const attr of Array.from(text.attributes)) {
        newText.setAttribute(attr.name, attr.value)
      }
      // Override with the tspan's own attributes (font-size, font-style, etc.).
      for (const attr of Array.from(tspan.attributes)) {
        if (attr.name === "dy" || attr.name === "dx") continue
        newText.setAttribute(attr.name, attr.value)
      }
      // Restore the parent's text-anchor (the flatten loop above copied
      // every parent attribute including text-anchor, so this is already
      // correct — but be explicit so future edits don't drop it).
      if (text.hasAttribute("text-anchor")) {
        newText.setAttribute(
          "text-anchor",
          text.getAttribute("text-anchor") as string
        )
      }

      // Resolve absolute y from accumulated dy. Apollon never emits
      // explicit `y` on tspans so this branch is the standard path.
      const dy = Number.parseFloat(tspan.getAttribute("dy") ?? "0") || 0
      cursorY += dy
      newText.setAttribute("y", `${cursorY}`)

      newText.removeAttribute("dx")
      newText.removeAttribute("dy")

      newText.textContent = tspan.textContent ?? ""
      replacements.push(newText)
    }

    for (const r of replacements) parent.insertBefore(r, text)
    parent.removeChild(text)
  }
}

export function preProcessSvgForPdf(root: Element): Element {
  // Order matters: inline nested SVGs first, then flatten multi-tspan
  // texts (so we don't waste work walking SVGs we'll throw away), then
  // collapse Inter font-family lists, then resolve relative font-sizes on
  // the simplified tree.
  inlineNestedSvgs(root)
  flattenMultiTspans(root)
  normalizeInterFontFamily(root)

  function walk(node: Element, parentSizePx: number): void {
    let currentSizePx = parentSizePx

    const fontSizeAttr = node.getAttribute("font-size")
    if (fontSizeAttr) {
      const resolved = parseFontSize(fontSizeAttr, parentSizePx)
      if (resolved !== null && Number.isFinite(resolved)) {
        node.setAttribute("font-size", `${resolved}px`)
        currentSizePx = resolved
      }
    }

    if (node.localName === "text") {
      inheritTextAttributes(node)
    }

    for (const child of Array.from(node.children)) {
      walk(child, currentSizePx)
    }
  }
  walk(root, SVG_DEFAULT_FONT_SIZE_PX)
  return root
}
