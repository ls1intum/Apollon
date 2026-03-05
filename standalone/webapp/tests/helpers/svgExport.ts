import type { Page } from "@playwright/test"

/**
 * Extract the exported SVG string from the running Apollon editor.
 *
 * This replicates the full export pipeline from exportUtils.ts inside
 * the browser context via page.evaluate():
 * 1. Find the React Flow container and compute bounding box
 * 2. Clone nodes and edges into a fresh SVG
 * 3. Replace CSS variables with fallback values
 * 4. Convert inline styles to SVG attributes (PowerPoint compat)
 * 5. Remove <marker> elements and marker-start/marker-end attributes
 *
 * The result is identical to what getSVG() produces.
 */
export async function extractSVGFromPage(page: Page): Promise<string> {
  return page.evaluate(() => {
    const SVG_NS = "http://www.w3.org/2000/svg"
    const STROKE_COLOR = "#000000"

    const CSS_VARIABLE_FALLBACKS: Record<string, string> = {
      "--apollon2-primary": "#3e8acc",
      "--apollon2-primary-contrast": "#000000",
      "--apollon2-secondary": "#6c757d",
      "--apollon2-alert-warning-yellow": "#ffc107",
      "--apollon2-alert-warning-background": "#fff3cd",
      "--apollon2-alert-warning-border": "#ffeeba",
      "--apollon2-background": "#ffffff",
      "--apollon2-background-inverse": "#000000",
      "--apollon2-background-variant": "#f8f9fa",
      "--apollon2-gray": "#e9ecef",
      "--apollon2-grid": "rgba(36, 39, 36, 0.1)",
      "--apollon2-gray-variant": "#495057",
      "--apollon2-alert-danger-color": "#721c24",
      "--apollon2-alert-danger-background": "#f8d7da",
      "--apollon2-alert-danger-border": "#f5c6cb",
      "--apollon2-switch-box-border-color": "#dee2e6",
      "--apollon2-list-group-color": "#ffffff",
      "--apollon2-btn-outline-secondary-color": "#6c757d",
      "--apollon2-modal-bottom-border": "#e9ecef",
    }

    // ---- CSS Variable Resolution ----
    const VARIABLE_REGEX =
      /var\((--[\w-]+)(?:\s*,\s*([^)]+(?:\([^)]*\)[^)]*)*))?\)/g

    function resolveCSSVariable(value: string): string {
      let result = value
      let prevResult = ""
      while (result !== prevResult && result.includes("var(")) {
        prevResult = result
        result = result.replace(
          VARIABLE_REGEX,
          (_match: string, variableName: string, fallback?: string) => {
            const resolved = CSS_VARIABLE_FALLBACKS[variableName.trim()]
            if (resolved) return resolved
            if (fallback) return fallback.trim()
            return ""
          }
        )
      }
      return result
    }

    function resolveCurrentColor(
      element: Element,
      inheritedColor: string
    ): string {
      const colorAttr = element.getAttribute("color")
      if (colorAttr) {
        const resolved = resolveCSSVariable(colorAttr)
        if (resolved && resolved !== "currentColor") return resolved
      }
      return inheritedColor
    }

    function replaceCSSVars(
      node: Element | ChildNode,
      inheritedColor: string = STROKE_COLOR
    ): void {
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const el = node as Element
      const currentColor = resolveCurrentColor(el, inheritedColor)

      const colorAttr = el.getAttribute("color")
      if (colorAttr) {
        const resolved = resolveCSSVariable(colorAttr)
        if (resolved !== colorAttr) el.setAttribute("color", resolved)
      }

      el.getAttributeNames().forEach((attr) => {
        const val = el.getAttribute(attr)
        if (!val) return
        let resolved = resolveCSSVariable(val)
        if (resolved === "currentColor") resolved = currentColor
        else if (resolved.includes("currentColor"))
          resolved = resolved.replace(/currentColor/gi, currentColor)
        if (resolved === "context-stroke" || resolved === "context-fill")
          resolved = currentColor
        if (attr === "font-family" || attr === "fontFamily")
          resolved = "Arial, Helvetica, sans-serif"
        if (
          (attr === "font-size" || attr === "fontSize") &&
          /^\d+(\.\d+)?$/.test(resolved)
        )
          resolved = `${resolved}px`
        if (attr === "pointer-events" || attr === "pointerEvents") {
          el.removeAttribute(attr)
          return
        }
        if (resolved !== val) el.setAttribute(attr, resolved)
      })

      Array.from(el.childNodes).forEach((child) =>
        replaceCSSVars(child, currentColor)
      )
    }

    const SVG_STYLE_PROPS = [
      "stroke",
      "stroke-width",
      "stroke-dasharray",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-opacity",
      "fill",
      "fill-opacity",
      "opacity",
    ]

    function convertStyleToAttrs(node: Element | ChildNode): void {
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const el = node as Element
      const styleAttr = el.getAttribute("style")
      if (styleAttr) {
        const remaining: string[] = []
        styleAttr.split(";").forEach((decl) => {
          const [prop, value] = decl.split(":").map((s) => s.trim())
          if (!prop || !value) return
          if (prop === "transition") return
          if (prop === "stroke-dasharray" && value === "0") return
          // Note: We intentionally do NOT skip opacity: 1.
          // Non-browser SVG renderers (resvg, Inkscape) may not default to 1.0.
          if (SVG_STYLE_PROPS.includes(prop)) {
            if (!el.hasAttribute(prop)) el.setAttribute(prop, value)
          } else {
            remaining.push(`${prop}: ${value}`)
          }
        })
        if (remaining.length > 0) el.setAttribute("style", remaining.join("; "))
        else el.removeAttribute("style")
      }
      Array.from(el.childNodes).forEach(convertStyleToAttrs)
    }

    function removeMarkers(svg: Element): void {
      svg.querySelectorAll("marker").forEach((el) => el.remove())
      svg
        .querySelectorAll("[marker-start]")
        .forEach((el) => el.removeAttribute("marker-start"))
      svg
        .querySelectorAll("[marker-end]")
        .forEach((el) => el.removeAttribute("marker-end"))
    }

    // ---- Build the SVG ----
    const vp = document.querySelector(".react-flow__viewport")
    if (!vp) throw new Error("React Flow viewport not found")

    const allNodes = vp.querySelectorAll(".react-flow__node")
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    allNodes.forEach((node) => {
      const style = node.getAttribute("style") ?? ""
      const tm = style.match(
        /transform:\s*translate\((-?\d+\.?\d*)px,\s*(-?\d+\.?\d*)px\)/
      )
      const x = tm ? parseFloat(tm[1]) : 0
      const y = tm ? parseFloat(tm[2]) : 0
      const wm = style.match(/width:\s*(\d+\.?\d*)/)
      const hm = style.match(/height:\s*(\d+\.?\d*)/)
      const w = wm ? parseFloat(wm[1]) : 0
      const h = hm ? parseFloat(hm[1]) : 0
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x + w > maxX) maxX = x + w
      if (y + h > maxY) maxY = y + h
    })

    const margin = 10
    const clipX = minX - margin
    const clipY = minY - margin
    const clipW = maxX - minX + margin * 2
    const clipH = maxY - minY + margin * 2

    const mainSVG = document.createElementNS(SVG_NS, "svg")
    mainSVG.setAttribute("xmlns", SVG_NS)
    const styleEl = document.createElementNS(SVG_NS, "style")
    styleEl.textContent = "text { font-family: Arial, Helvetica, sans-serif; }"
    mainSVG.appendChild(styleEl)
    mainSVG.setAttribute("viewBox", `${clipX} ${clipY} ${clipW} ${clipH}`)
    mainSVG.setAttribute("width", `${clipW}`)
    mainSVG.setAttribute("height", `${clipH}`)
    // Use geometric precision for anti-aliasing to reduce visual artifacts
    // where edges overlap with node borders in non-browser renderers (resvg, Inkscape)
    mainSVG.setAttribute("shape-rendering", "geometricPrecision")

    // Nodes
    const nodesG = document.createElementNS(SVG_NS, "g")
    mainSVG.appendChild(nodesG)
    allNodes.forEach((node) => {
      const style = node.getAttribute("style") ?? ""
      const tm = style.match(
        /transform:\s*translate\((-?\d+\.?\d*)px,\s*(-?\d+\.?\d*)px\)/
      )
      const x = tm ? parseFloat(tm[1]) : 0
      const y = tm ? parseFloat(tm[2]) : 0
      const g = document.createElementNS(SVG_NS, "g")
      g.setAttribute("transform", `translate(${x}, ${y})`)
      const svg = node.querySelector("svg")
      if (svg) {
        const clone = svg.cloneNode(true) as Element
        clone
          .querySelectorAll(".react-flow__handle")
          ?.forEach((el) => el.remove())
        g.appendChild(clone)
      }
      nodesG.appendChild(g)
    })

    // Edges
    const edgesG = document.createElementNS(SVG_NS, "g")
    mainSVG.appendChild(edgesG)
    vp.querySelectorAll(".react-flow__edge").forEach((edgeCont) => {
      edgeCont.querySelectorAll(".react-flow__edge-path").forEach((path) => {
        const c = path.cloneNode(true) as Element
        if (!c.getAttribute("stroke-width")) c.setAttribute("stroke-width", "2")
        if (!c.getAttribute("stroke")) {
          const s = (c.getAttribute("style") || "").match(/stroke:\s*([^;]+)/)
          c.setAttribute("stroke", s ? s[1].trim() : STROKE_COLOR)
        }
        if (!c.getAttribute("fill")) c.setAttribute("fill", "none")
        // Ensure fully opaque rendering for non-browser SVG renderers (resvg, Inkscape, etc.)
        c.setAttribute("opacity", "1")
        c.setAttribute("stroke-opacity", "1")
        edgesG.appendChild(c)
      })
      edgeCont
        .querySelectorAll("[data-inline-marker]")
        .forEach((m) => edgesG.appendChild(m.cloneNode(true)))
      edgeCont
        .querySelectorAll("text")
        .forEach((t) => edgesG.appendChild(t.cloneNode(true)))
    })

    // Post-process
    replaceCSSVars(mainSVG)
    convertStyleToAttrs(mainSVG)
    removeMarkers(mainSVG)

    return mainSVG.outerHTML
  })
}
