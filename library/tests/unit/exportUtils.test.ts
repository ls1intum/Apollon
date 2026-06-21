import { describe, it, expect, beforeEach } from "vitest"
import { __testing } from "@/utils/exportUtils"

const {
  extractPathPoints,
  extractStyles,
  resolveCSSVariable,
  replaceCSSVariables,
  convertStyleToAttributes,
  removeMarkerElements,
  mergeBounds,
  getNodeOverflowBoundsFromDOM,
} = __testing

// ---------------------------------------------------------------------------
// extractPathPoints
// ---------------------------------------------------------------------------
describe("extractPathPoints", () => {
  it("returns empty array for empty string", () => {
    expect(extractPathPoints("")).toEqual([])
  })

  it("extracts point from M command", () => {
    const points = extractPathPoints("M10,20")
    expect(points).toEqual([{ x: 10, y: 20 }])
  })

  it("extracts points from M + L commands", () => {
    const points = extractPathPoints("M0,0 L100,50")
    expect(points).toContainEqual({ x: 0, y: 0 })
    expect(points).toContainEqual({ x: 100, y: 50 })
  })

  it("extracts points from H command", () => {
    const points = extractPathPoints("M0,10 H200")
    expect(points).toContainEqual({ x: 200, y: 10 })
  })

  it("extracts points from V command", () => {
    const points = extractPathPoints("M10,0 V200")
    expect(points).toContainEqual({ x: 10, y: 200 })
  })

  it("extracts control points and endpoint from C command", () => {
    // C x1 y1 x2 y2 x y
    const points = extractPathPoints("M0,0 C10,20 80,90 100,100")
    // Should include control points (10,20), (80,90) and endpoint (100,100)
    expect(points).toContainEqual({ x: 10, y: 20 })
    expect(points).toContainEqual({ x: 80, y: 90 })
    expect(points).toContainEqual({ x: 100, y: 100 })
  })

  it("extracts points from Q command (quadratic bezier)", () => {
    const points = extractPathPoints("M0,0 Q50,100 100,0")
    expect(points).toContainEqual({ x: 50, y: 100 }) // control
    expect(points).toContainEqual({ x: 100, y: 0 }) // endpoint
  })

  it("extracts points from S command with reflected control", () => {
    const points = extractPathPoints("M0,0 C10,0 40,0 50,0 S90,0 100,0")
    expect(points).toContainEqual({ x: 100, y: 0 })
  })

  it("extracts points from T command with reflected control", () => {
    const points = extractPathPoints("M0,0 Q25,50 50,0 T100,0")
    expect(points).toContainEqual({ x: 100, y: 0 })
  })

  it("extracts arc extrema points from A command", () => {
    const points = extractPathPoints("M0,0 A25 25 0 0 1 50,50")
    // Should include endpoint and extrema estimates
    expect(points).toContainEqual({ x: 50, y: 50 })
    // Should have more than just the endpoint (extrema estimates)
    expect(points.length).toBeGreaterThan(1)
  })

  it("handles relative commands", () => {
    const points = extractPathPoints("m10,10 l20,30")
    expect(points).toContainEqual({ x: 10, y: 10 }) // from m
    expect(points).toContainEqual({ x: 30, y: 40 }) // 10+20, 10+30
  })

  it("handles Z command (no additional points)", () => {
    const points = extractPathPoints("M0,0 L100,0 L100,100 Z")
    // Z doesn't add points
    expect(points).toHaveLength(3) // M, L, L
  })
})

// ---------------------------------------------------------------------------
// extractStyles
// ---------------------------------------------------------------------------
describe("extractStyles", () => {
  it("parses transform translate", () => {
    const result = extractStyles(
      "transform: translate(150px, 200px); width: 100px; height: 50px"
    )
    expect(result.transform).toEqual({ x: 150, y: 200 })
    expect(result.width).toBe("100px")
    expect(result.height).toBe("50px")
  })

  it("defaults to 0,0 when no transform", () => {
    const result = extractStyles("width: 100px")
    expect(result.transform).toEqual({ x: 0, y: 0 })
  })

  it("returns null for missing width/height", () => {
    const result = extractStyles("transform: translate(10px, 20px)")
    expect(result.width).toBeNull()
    expect(result.height).toBeNull()
  })

  it("handles negative coordinates", () => {
    const result = extractStyles("transform: translate(-50px, -100px)")
    expect(result.transform).toEqual({ x: -50, y: -100 })
  })

  it("handles decimal coordinates", () => {
    const result = extractStyles("transform: translate(10.5px, 20.7px)")
    expect(result.transform).toEqual({ x: 10.5, y: 20.7 })
  })

  it("handles empty string", () => {
    const result = extractStyles("")
    expect(result.transform).toEqual({ x: 0, y: 0 })
    expect(result.width).toBeNull()
    expect(result.height).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// resolveCSSVariable
// ---------------------------------------------------------------------------
describe("resolveCSSVariable", () => {
  it("returns input unchanged when no var() present", () => {
    expect(resolveCSSVariable("red")).toBe("red")
  })

  it("resolves known CSS variable", () => {
    expect(resolveCSSVariable("var(--apollon-primary)")).toBe("#3e8acc")
  })

  it("resolves --apollon-primary-contrast", () => {
    expect(resolveCSSVariable("var(--apollon-primary-contrast)")).toBe(
      "#000000"
    )
  })

  it("resolves --apollon-background", () => {
    expect(resolveCSSVariable("var(--apollon-background)")).toBe("#ffffff")
  })

  it("uses fallback for unknown variable", () => {
    expect(resolveCSSVariable("var(--unknown, blue)")).toBe("blue")
  })

  it("uses fallback with rgba() for unknown variable", () => {
    const result = resolveCSSVariable("var(--unknown, rgba(255, 0, 0, 0.5))")
    expect(result).toBe("rgba(255, 0, 0, 0.5)")
  })

  it("returns empty string for unknown variable without fallback", () => {
    expect(resolveCSSVariable("var(--totally-unknown)")).toBe("")
  })

  it("handles nested var() calls (variable resolves to another var)", () => {
    // --apollon-grid resolves to "rgba(36, 39, 36, 0.1)"
    expect(resolveCSSVariable("var(--apollon-grid)")).toBe(
      "rgba(36, 39, 36, 0.1)"
    )
  })

  it("preserves string around var() call", () => {
    // e.g. "1px solid var(--apollon-primary)" should resolve the var part
    const result = resolveCSSVariable("1px solid var(--apollon-primary)")
    expect(result).toBe("1px solid #3e8acc")
  })

  it("handles value with no var() calls", () => {
    expect(resolveCSSVariable("#ff0000")).toBe("#ff0000")
    expect(resolveCSSVariable("none")).toBe("none")
    expect(resolveCSSVariable("10px")).toBe("10px")
  })
})

// ---------------------------------------------------------------------------
// replaceCSSVariables (DOM-based)
// ---------------------------------------------------------------------------
describe("replaceCSSVariables", () => {
  let svg: SVGSVGElement

  beforeEach(() => {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  })

  it("resolves var() in fill attribute", () => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("fill", "var(--apollon-primary)")
    svg.appendChild(rect)

    replaceCSSVariables(svg)
    expect(rect.getAttribute("fill")).toBe("#3e8acc")
  })

  it("resolves var() in stroke attribute", () => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("stroke", "var(--apollon-primary-contrast)")
    svg.appendChild(path)

    replaceCSSVariables(svg)
    expect(path.getAttribute("stroke")).toBe("#000000")
  })

  it("resolves currentColor to inherited stroke color", () => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("fill", "currentColor")
    svg.appendChild(rect)

    replaceCSSVariables(svg)
    // Default inherited color is STROKE_COLOR (#000000)
    expect(rect.getAttribute("fill")).toBe("#000000")
  })

  it("resolves currentColor using parent color attribute", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    g.setAttribute("color", "#ff0000")
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("fill", "currentColor")
    g.appendChild(rect)
    svg.appendChild(g)

    replaceCSSVariables(svg)
    expect(rect.getAttribute("fill")).toBe("#ff0000")
  })

  it("resolves context-stroke to current color", () => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("fill", "context-stroke")
    svg.appendChild(path)

    replaceCSSVariables(svg)
    expect(path.getAttribute("fill")).toBe("#000000")
  })

  it("resolves context-fill to current color", () => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("stroke", "context-fill")
    svg.appendChild(path)

    replaceCSSVariables(svg)
    expect(path.getAttribute("stroke")).toBe("#000000")
  })

  it("preserves font-family as-is (no longer force-rewrites to Arial)", () => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
    text.setAttribute("font-family", "Inter, sans-serif")
    svg.appendChild(text)

    replaceCSSVariables(svg)
    expect(text.getAttribute("font-family")).toBe("Inter, sans-serif")
  })

  it("normalizes unitless font-size to px", () => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
    text.setAttribute("font-size", "16")
    svg.appendChild(text)

    replaceCSSVariables(svg)
    expect(text.getAttribute("font-size")).toBe("16px")
  })

  it("does not add px to font-size that already has units", () => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
    text.setAttribute("font-size", "16px")
    svg.appendChild(text)

    replaceCSSVariables(svg)
    expect(text.getAttribute("font-size")).toBe("16px")
  })

  it("removes pointer-events attribute", () => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("pointer-events", "all")
    svg.appendChild(rect)

    replaceCSSVariables(svg)
    expect(rect.hasAttribute("pointer-events")).toBe(false)
  })

  it("does NOT corrupt text node content containing 'var('", () => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
    text.textContent = "variable var(x) usage"
    svg.appendChild(text)

    replaceCSSVariables(svg)
    expect(text.textContent).toBe("variable var(x) usage")
  })

  it("processes nested elements recursively", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    const innerG = document.createElementNS("http://www.w3.org/2000/svg", "g")
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("fill", "var(--apollon-background)")
    innerG.appendChild(rect)
    g.appendChild(innerG)
    svg.appendChild(g)

    replaceCSSVariables(svg)
    expect(rect.getAttribute("fill")).toBe("#ffffff")
  })
})

// ---------------------------------------------------------------------------
// convertStyleToAttributes
// ---------------------------------------------------------------------------
describe("convertStyleToAttributes", () => {
  it("converts stroke from style to attribute", () => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("style", "stroke: #000; stroke-width: 2")

    convertStyleToAttributes(path)
    expect(path.getAttribute("stroke")).toBe("#000")
    expect(path.getAttribute("stroke-width")).toBe("2")
    expect(path.hasAttribute("style")).toBe(false) // all style props promoted
  })

  it("converts fill from style to attribute", () => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("style", "fill: red; fill-opacity: 0.5")

    convertStyleToAttributes(rect)
    expect(rect.getAttribute("fill")).toBe("red")
    expect(rect.getAttribute("fill-opacity")).toBe("0.5")
  })

  it("keeps non-SVG properties in style attribute", () => {
    const elem = document.createElementNS("http://www.w3.org/2000/svg", "g")
    elem.setAttribute("style", "stroke: black; cursor: pointer")

    convertStyleToAttributes(elem)
    expect(elem.getAttribute("stroke")).toBe("black")
    expect(elem.getAttribute("style")).toBe("cursor: pointer")
  })

  it("skips transition property (CSS-only)", () => {
    const elem = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    elem.setAttribute("style", "transition: all 0.3s; fill: blue")

    convertStyleToAttributes(elem)
    expect(elem.getAttribute("fill")).toBe("blue")
    // transition should be silently dropped
    expect(elem.hasAttribute("style")).toBe(false)
  })

  it("skips redundant stroke-dasharray: 0", () => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("style", "stroke-dasharray: 0")

    convertStyleToAttributes(path)
    expect(path.hasAttribute("stroke-dasharray")).toBe(false)
  })

  it("converts opacity: 1 to explicit attribute for non-browser renderer compatibility", () => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("style", "opacity: 1")

    convertStyleToAttributes(rect)
    // opacity: 1 must be explicitly set as an attribute for non-browser SVG renderers
    // (resvg, Inkscape) that may not default to fully opaque, causing overlap artifacts
    expect(rect.hasAttribute("opacity")).toBe(true)
    expect(rect.getAttribute("opacity")).toBe("1")
  })

  it("does not overwrite existing attribute with style value", () => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("stroke", "red")
    path.setAttribute("style", "stroke: blue")

    convertStyleToAttributes(path)
    // Existing attribute takes precedence
    expect(path.getAttribute("stroke")).toBe("red")
  })

  it("processes children recursively", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("style", "fill: green")
    g.appendChild(rect)

    convertStyleToAttributes(g)
    expect(rect.getAttribute("fill")).toBe("green")
  })

  it("handles element with no style attribute", () => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    // Should not throw
    convertStyleToAttributes(rect)
    expect(rect.hasAttribute("style")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// removeMarkerElements
// ---------------------------------------------------------------------------
describe("removeMarkerElements", () => {
  it("removes <marker> elements", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
    const marker = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "marker"
    )
    marker.setAttribute("id", "arrow")
    defs.appendChild(marker)
    svg.appendChild(defs)

    removeMarkerElements(svg)
    expect(svg.querySelectorAll("marker")).toHaveLength(0)
  })

  it("removes marker-start attributes", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("marker-start", "url(#arrow)")
    svg.appendChild(path)

    removeMarkerElements(svg)
    expect(path.hasAttribute("marker-start")).toBe(false)
  })

  it("removes marker-end attributes", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("marker-end", "url(#triangle)")
    svg.appendChild(path)

    removeMarkerElements(svg)
    expect(path.hasAttribute("marker-end")).toBe(false)
  })

  it("handles SVG with no markers", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    svg.appendChild(rect)

    // Should not throw
    removeMarkerElements(svg)
    expect(svg.querySelectorAll("rect")).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// mergeBounds
// ---------------------------------------------------------------------------
describe("mergeBounds", () => {
  it("merges two non-overlapping rects", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 }
    const b = { x: 200, y: 200, width: 50, height: 50 }
    const result = mergeBounds(a, b)
    expect(result).toEqual({ x: 0, y: 0, width: 250, height: 250 })
  })

  it("merges overlapping rects", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 }
    const b = { x: 50, y: 50, width: 100, height: 100 }
    const result = mergeBounds(a, b)
    expect(result).toEqual({ x: 0, y: 0, width: 150, height: 150 })
  })

  it("merges when B contains A", () => {
    const a = { x: 20, y: 20, width: 10, height: 10 }
    const b = { x: 0, y: 0, width: 100, height: 100 }
    const result = mergeBounds(a, b)
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })

  it("handles negative coordinates", () => {
    const a = { x: -50, y: -50, width: 100, height: 100 }
    const b = { x: 0, y: 0, width: 50, height: 50 }
    const result = mergeBounds(a, b)
    expect(result).toEqual({ x: -50, y: -50, width: 100, height: 100 })
  })
})

// ---------------------------------------------------------------------------
// getNodeOverflowBoundsFromDOM
// ---------------------------------------------------------------------------
describe("getNodeOverflowBoundsFromDOM", () => {
  /**
   * Helper: create a minimal container with a .react-flow__node
   * containing an SVG with the given inner elements.
   */
  function makeContainer(
    nodeX: number,
    nodeY: number,
    vbW: number,
    vbH: number,
    innerHTML: string
  ): HTMLElement {
    const container = document.createElement("div")
    const node = document.createElement("div")
    node.classList.add("react-flow__node")
    node.setAttribute(
      "style",
      `transform: translate(${nodeX}px, ${nodeY}px); width: ${vbW}px; height: ${vbH}px`
    )
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("width", `${vbW}`)
    svg.setAttribute("height", `${vbH}`)
    svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`)
    svg.setAttribute("overflow", "visible")
    svg.innerHTML = innerHTML
    node.appendChild(svg)
    container.appendChild(node)
    return container
  }

  it("returns undefined when no overflow content exists", () => {
    const container = makeContainer(
      100,
      100,
      160,
      120,
      `<rect x="0" y="0" width="160" height="120" />`
    )
    expect(getNodeOverflowBoundsFromDOM(container)).toBeUndefined()
  })

  it("detects overflow from a <line> extending to negative coords", () => {
    // Simulates the initial marking arrow: line from (-50,-50) to (3,3)
    // Node at (40, 80), viewBox 0 0 160 120
    const container = makeContainer(
      40,
      80,
      160,
      120,
      `<line x1="-50" y1="-50" x2="3" y2="3" />`
    )
    const bounds = getNodeOverflowBoundsFromDOM(container)
    expect(bounds).toBeDefined()
    // Global coords: (-50, -50) → (40 + (-50)*1, 80 + (-50)*1) = (-10, 30)
    // Global coords: (3, 3) → (40 + 3, 80 + 3) = (43, 83)
    expect(bounds!.x).toBe(-10)
    expect(bounds!.y).toBe(30)
    expect(bounds!.width).toBe(53) // 43 - (-10)
    expect(bounds!.height).toBe(53) // 83 - 30
  })

  it("detects overflow from a <path> extending to negative coords", () => {
    const container = makeContainer(
      40,
      80,
      160,
      120,
      `<path d="M-20,-10 L5,5 L10,10" />`
    )
    const bounds = getNodeOverflowBoundsFromDOM(container)
    expect(bounds).toBeDefined()
    // Global coords of (-20,-10): (40-20, 80-10) = (20, 70)
    // Global coords of (10, 10): (50, 90)
    expect(bounds!.x).toBe(20)
    expect(bounds!.y).toBe(70)
  })

  it("detects overflow from a <polyline> extending to negative coords", () => {
    const container = makeContainer(
      40,
      80,
      160,
      120,
      `<polyline points="-50,-50 -5,-5" />`
    )
    const bounds = getNodeOverflowBoundsFromDOM(container)
    expect(bounds).toBeDefined()
    expect(bounds!.x).toBe(-10) // 40 + (-50)
    expect(bounds!.y).toBe(30) // 80 + (-50)
  })

  it("ignores elements that are fully within the viewBox", () => {
    const container = makeContainer(
      100,
      100,
      160,
      120,
      `<line x1="10" y1="10" x2="150" y2="110" />
       <path d="M20,20 L140,100" />
       <circle cx="80" cy="60" r="30" />`
    )
    expect(getNodeOverflowBoundsFromDOM(container)).toBeUndefined()
  })

  it("detects overflow from a <circle> extending beyond viewBox", () => {
    // Circle at (5, 5) with radius 20 — extends to (-15, -15)
    const container = makeContainer(
      100,
      100,
      160,
      120,
      `<circle cx="5" cy="5" r="20" />`
    )
    const bounds = getNodeOverflowBoundsFromDOM(container)
    expect(bounds).toBeDefined()
    // Global coords: (5-20, 5-20) = (-15, -15) → (100-15, 100-15) = (85, 85)
    // Global coords: (5+20, 5+20) = (25, 25) → (125, 125)
    expect(bounds!.x).toBe(85)
    expect(bounds!.y).toBe(85)
  })

  it("returns undefined when container has no nodes", () => {
    const container = document.createElement("div")
    expect(getNodeOverflowBoundsFromDOM(container)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// resolveRelativeFontSizes — stereotype labels render huge in non-browser
// renderers when % / em font-size survives compat serialization
// ---------------------------------------------------------------------------
const NS = "http://www.w3.org/2000/svg"
const el = (name: string, attrs: Record<string, string> = {}) => {
  const node = document.createElementNS(NS, name)
  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, value)
  return node
}

describe("resolveRelativeFontSizes", () => {
  it("resolves % font-size against the inherited px size", () => {
    const svg = el("svg")
    const text = el("text", { "font-size": "16px" })
    const tspan = el("tspan", { "font-size": "85%" })
    text.appendChild(tspan)
    svg.appendChild(text)

    __testing.resolveRelativeFontSizes(svg)
    expect(tspan.getAttribute("font-size")).toBe("13.6px")
  })

  it("resolves em font-size against the inherited px size", () => {
    const svg = el("svg")
    const text = el("text", { "font-size": "20px" })
    const tspan = el("tspan", { "font-size": "0.8em" })
    text.appendChild(tspan)
    svg.appendChild(text)

    __testing.resolveRelativeFontSizes(svg)
    expect(tspan.getAttribute("font-size")).toBe("16px")
  })

  it("seeds the default base size when no ancestor sets font-size", () => {
    const svg = el("svg")
    const text = el("text")
    const tspan = el("tspan", { "font-size": "50%" })
    text.appendChild(tspan)
    svg.appendChild(text)

    __testing.resolveRelativeFontSizes(svg)
    expect(tspan.getAttribute("font-size")).toBe("8px") // 50% of the 16px default
  })

  it("leaves absolute px font-size unchanged", () => {
    const svg = el("svg")
    const text = el("text", { "font-size": "13px" })
    svg.appendChild(text)

    __testing.resolveRelativeFontSizes(svg)
    expect(text.getAttribute("font-size")).toBe("13px")
  })
})

// ---------------------------------------------------------------------------
// resolveTspanDy — Skia ignores cumulative tspan dy, overlapping stereotype
// and name onto one line; absolute y renders correctly everywhere
// ---------------------------------------------------------------------------
describe("resolveTspanDy", () => {
  it("converts cumulative tspan dy into absolute y", () => {
    const svg = el("svg")
    const text = el("text", { y: "25" })
    const stereotype = el("tspan", { dy: "-8" })
    const name = el("tspan", { dy: "18" })
    text.append(stereotype, name)
    svg.appendChild(text)

    __testing.resolveTspanDy(svg)
    expect(stereotype.getAttribute("y")).toBe("17")
    expect(stereotype.hasAttribute("dy")).toBe(false)
    expect(name.getAttribute("y")).toBe("35")
    expect(name.hasAttribute("dy")).toBe(false)
  })

  it("leaves a text without any tspan dy untouched", () => {
    const svg = el("svg")
    const text = el("text", { y: "10" })
    const tspan = el("tspan")
    text.appendChild(tspan)
    svg.appendChild(text)

    __testing.resolveTspanDy(svg)
    expect(tspan.hasAttribute("y")).toBe(false)
    expect(tspan.hasAttribute("dy")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// resolveDominantBaseline — non-browser renderers ignore the attribute and draw
// every label at the alphabetic baseline; resolve it to an explicit y
// ---------------------------------------------------------------------------
describe("resolveDominantBaseline", () => {
  it("shifts middle-aligned text down 0.25em and drops the attribute", () => {
    const svg = el("svg")
    const text = el("text", {
      y: "100",
      "font-size": "16px",
      "dominant-baseline": "middle",
    })
    svg.appendChild(text)

    __testing.resolveDominantBaseline(svg)
    expect(text.getAttribute("y")).toBe("104") // 100 + 0.25 * 16
    expect(text.hasAttribute("dominant-baseline")).toBe(false)
  })

  it("shifts hanging text down 0.75em", () => {
    const svg = el("svg")
    const text = el("text", {
      y: "50",
      "font-size": "14px",
      "dominant-baseline": "hanging",
    })
    svg.appendChild(text)

    __testing.resolveDominantBaseline(svg)
    expect(text.getAttribute("y")).toBe("60.5") // 50 + 0.75 * 14
    expect(text.hasAttribute("dominant-baseline")).toBe(false)
  })

  it("shifts each tspan by its own font-size", () => {
    const svg = el("svg")
    const text = el("text", { y: "25", "dominant-baseline": "middle" })
    const stereotype = el("tspan", { y: "17", "font-size": "13.6px" })
    const name = el("tspan", { y: "35", "font-size": "16px" })
    text.append(stereotype, name)
    svg.appendChild(text)

    __testing.resolveDominantBaseline(svg)
    expect(stereotype.getAttribute("y")).toBe("20.4") // 17 + 0.25 * 13.6
    expect(name.getAttribute("y")).toBe("39") // 35 + 0.25 * 16
  })

  it("leaves text without dominant-baseline untouched", () => {
    const svg = el("svg")
    const text = el("text", { y: "10" })
    svg.appendChild(text)

    __testing.resolveDominantBaseline(svg)
    expect(text.getAttribute("y")).toBe("10")
  })
})
