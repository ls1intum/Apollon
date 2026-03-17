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

    function collectCSSVariables(
      element: Element | null
    ): Record<string, string> {
      if (
        !element ||
        typeof window === "undefined" ||
        typeof window.getComputedStyle !== "function"
      ) {
        return {}
      }

      const vars: Record<string, string> = {}
      const style = window.getComputedStyle(element)
      for (let i = 0; i < style.length; i += 1) {
        const prop = style[i]
        if (!prop || !prop.startsWith("--")) continue
        const value = style.getPropertyValue(prop).trim()
        if (value) vars[prop] = value
      }
      return vars
    }

    const cssVarMap: Record<string, string> = {
      ...CSS_VARIABLE_FALLBACKS,
      ...collectCSSVariables(document.documentElement),
      ...collectCSSVariables(document.querySelector(".react-flow")),
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
            const mapped = cssVarMap[variableName.trim()]?.trim()
            if (mapped) return mapped
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
        // Don't force-rewrite font-family — let the browser font stack pass through
        // so the SVG export matches the on-screen rendering
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
      "font-size",
      "font-weight",
      "font-family",
      "font-style",
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

    /**
     * Default font values matching the browser rendering (app.css / CustomText.tsx).
     * Applied to <text> elements missing explicit font attributes so that
     * non-browser renderers (resvg, Inkscape, PowerPoint) render text identically.
     */
    const TEXT_FONT_DEFAULTS: Record<string, string> = {
      "font-size": "16px",
      "font-weight": "400",
      "font-family": "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    }

    function ensureTextFontDefaults(svg: Element): void {
      svg.querySelectorAll("text").forEach((textEl) => {
        for (const [attr, defaultValue] of Object.entries(TEXT_FONT_DEFAULTS)) {
          if (!textEl.hasAttribute(attr)) {
            textEl.setAttribute(attr, defaultValue)
          }
        }
      })
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

    /**
     * Replace `text-decoration="underline"` on `<text>` elements with manual
     * `<line>` siblings so the underline is visible in non-browser renderers.
     *
     * resvg 2.6.2 has a rendering bug where 3+ `text-decoration="underline"`
     * attributes across nested `<svg>` elements cause unrelated paths
     * (particularly vertical lines) to disappear.
     */
    function replaceTextDecorationWithManualUnderline(
      svg: SVGSVGElement
    ): void {
      const underlinedTexts = svg.querySelectorAll(
        'text[text-decoration="underline"]'
      )

      if (underlinedTexts.length === 0) return

      // Temporarily attach to the DOM (off-screen) so getBBox() works
      svg.style.position = "absolute"
      svg.style.left = "-9999px"
      svg.style.top = "-9999px"
      document.body.appendChild(svg)

      try {
        underlinedTexts.forEach((textEl) => {
          textEl.removeAttribute("text-decoration")

          const bbox = (textEl as SVGTextElement).getBBox()

          const line = document.createElementNS(SVG_NS, "line")
          const underlineY = bbox.y + bbox.height
          line.setAttribute("x1", String(bbox.x))
          line.setAttribute("x2", String(bbox.x + bbox.width))
          line.setAttribute("y1", String(underlineY))
          line.setAttribute("y2", String(underlineY))
          line.setAttribute(
            "stroke",
            textEl.getAttribute("fill") || STROKE_COLOR
          )
          line.setAttribute("stroke-width", "1.2")

          textEl.parentNode?.insertBefore(line, textEl.nextSibling)
        })
      } finally {
        document.body.removeChild(svg)
        svg.style.removeProperty("position")
        svg.style.removeProperty("left")
        svg.style.removeProperty("top")
      }
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

      // Check for node overflow content (e.g., reachability graph initial arrow)
      const svgEl = node.querySelector("svg")
      if (svgEl) {
        const vb = svgEl.getAttribute("viewBox")
        if (vb) {
          const vbParts = vb.split(/[\s,]+/).map(Number)
          const [vbX, vbY, vbW, vbH] = vbParts
          const svgW = parseFloat(svgEl.getAttribute("width") ?? String(vbW))
          const svgH = parseFloat(svgEl.getAttribute("height") ?? String(vbH))
          const scaleX = svgW / vbW
          const scaleY = svgH / vbH

          const toGlobal = (lx: number, ly: number) => ({
            x: x + (lx - vbX) * scaleX,
            y: y + (ly - vbY) * scaleY,
          })

          // Check <line> elements (e.g., initial marking arrows)
          svgEl.querySelectorAll("line").forEach((line) => {
            const x1 = parseFloat(line.getAttribute("x1") ?? "0")
            const y1 = parseFloat(line.getAttribute("y1") ?? "0")
            const x2 = parseFloat(line.getAttribute("x2") ?? "0")
            const y2 = parseFloat(line.getAttribute("y2") ?? "0")
            for (const gp of [toGlobal(x1, y1), toGlobal(x2, y2)]) {
              if (gp.x < minX) minX = gp.x
              if (gp.y < minY) minY = gp.y
              if (gp.x > maxX) maxX = gp.x
              if (gp.y > maxY) maxY = gp.y
            }
          })
        }
      }
    })

    // Expand bounds to include edge paths that extend outside node bounds
    function extractPathCoords(d: string): { x: number; y: number }[] {
      const coords: { x: number; y: number }[] = []
      const re = /(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/g
      let m
      while ((m = re.exec(d)) !== null) {
        coords.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) })
      }
      return coords
    }

    vp.querySelectorAll(".react-flow__edge-path").forEach((path) => {
      const d = path.getAttribute("d")
      if (!d) return
      const points = extractPathCoords(d)
      for (const p of points) {
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
    })

    // Include inline marker positions
    vp.querySelectorAll("[data-inline-marker]").forEach((marker) => {
      const tag = marker.tagName.toLowerCase()
      if (tag === "path") {
        const d = marker.getAttribute("d")
        if (d) {
          const points = extractPathCoords(d)
          for (const p of points) {
            if (p.x < minX) minX = p.x
            if (p.y < minY) minY = p.y
            if (p.x > maxX) maxX = p.x
            if (p.y > maxY) maxY = p.y
          }
        }
      } else if (tag === "circle") {
        const cx = parseFloat(marker.getAttribute("cx") ?? "0")
        const cy = parseFloat(marker.getAttribute("cy") ?? "0")
        const r = parseFloat(marker.getAttribute("r") ?? "0")
        if (cx - r < minX) minX = cx - r
        if (cy - r < minY) minY = cy - r
        if (cx + r > maxX) maxX = cx + r
        if (cy + r > maxY) maxY = cy + r
      }
    })

    const margin = 20
    const clipX = minX - margin
    const clipY = minY - margin
    const clipW = maxX - minX + margin * 2
    const clipH = maxY - minY + margin * 2

    const mainSVG = document.createElementNS(SVG_NS, "svg")
    mainSVG.setAttribute("xmlns", SVG_NS)
    const styleEl = document.createElementNS(SVG_NS, "style")
    styleEl.textContent =
      "text { font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif; }"
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

      // Get label groups first (for complex edge labels like CommunicationDiagram messages)
      const labelGroups = edgeCont.querySelectorAll(
        ".react-flow__edge-text, .react-flow__edge-textwrapper, .edge-labels"
      )
      labelGroups.forEach((group) => {
        edgesG.appendChild(group.cloneNode(true))
      })

      // Get standalone text labels (not already inside label groups to avoid duplication)
      edgeCont.querySelectorAll("text").forEach((t) => {
        const isInsideLabelGroup = Array.from(labelGroups).some((group) =>
          group.contains(t)
        )
        if (!isInsideLabelGroup) {
          edgesG.appendChild(t.cloneNode(true))
        }
      })
    })

    // Post-process
    replaceCSSVars(mainSVG)
    convertStyleToAttrs(mainSVG)
    ensureTextFontDefaults(mainSVG)
    removeMarkers(mainSVG)
    replaceTextDecorationWithManualUnderline(mainSVG)

    return mainSVG.outerHTML
  })
}
