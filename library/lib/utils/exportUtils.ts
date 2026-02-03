import { IPoint } from "@/edges/types"
import { ReactFlowInstance, type Node, type Edge, Rect } from "@xyflow/react"
import { CSS_VARIABLE_FALLBACKS, STROKE_COLOR } from "@/constants"
import { Point } from "./pathParsing"

/**
 * Font styles for exported SVGs.
 * Uses system fonts for compatibility with external applications (PowerPoint, Inkscape).
 * Arial and Helvetica are prioritized because they're available on Windows and Mac.
 * Custom fonts like "Inter" are NOT available in PowerPoint and cause rendering issues.
 */
const svgFontStyles = `
    text {
      font-family: Arial, Helvetica, sans-serif;
    }
  `

export const getSVG = (container: HTMLElement, clip: Rect): string => {
  const emptySVG = "<svg></svg>"

  const width = clip.width
  const height = clip.height

  const vp = container.querySelector(".react-flow__viewport")

  if (!vp) return emptySVG

  const SVG_NS = "http://www.w3.org/2000/svg"
  const mainSVG = document.createElementNS(SVG_NS, "svg")
  mainSVG.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  mainSVG.appendChild(document.createElementNS(SVG_NS, "style")).textContent =
    svgFontStyles
  mainSVG.setAttribute("viewBox", `${clip.x} ${clip.y} ${width} ${height}`)
  mainSVG.setAttribute("width", `${width}`)
  mainSVG.setAttribute("height", `${height}`)

  const MainNodesGTag = document.createElement("g")
  mainSVG.appendChild(MainNodesGTag)
  const allNodes = vp.querySelectorAll(".react-flow__node")

  allNodes.forEach((node) => {
    const styles = extractStyles(node.getAttribute("style") ?? "")
    const newGTagForNode = document.createElement("g")
    const svgElement = node.querySelector("svg")

    newGTagForNode.setAttribute(
      "transform",
      `translate(${styles.transform.x}, ${styles.transform.y})`
    )
    if (svgElement) {
      // Clone the SVG to avoid removing it from the live DOM
      const clonedSvg = svgElement.cloneNode(true) as Element
      // Remove handles from the clone (they're UI-only connection points)
      clonedSvg
        .querySelectorAll(".react-flow__handle")
        ?.forEach((el) => el.remove())
      newGTagForNode.appendChild(clonedSvg)
    }
    MainNodesGTag.appendChild(newGTagForNode)
  })

  // Get all edge elements
  const allEdgeElements = vp.querySelectorAll(".react-flow__edge")

  const MainEdgesGTag = document.createElement("g")
  mainSVG.appendChild(MainEdgesGTag)

  // UI-only classes to skip (not part of the actual diagram)
  const uiOnlyClasses = [
    "edge-circle",
    "edge-overlay",
    "edge-container", // Container wraps paths, we want the paths not the container
    "react-flow__edge-interaction",
    "react-flow__edgeupdater",
    "react-flow__edgeupdater-source",
    "react-flow__edgeupdater-target",
    "target-edge-marker-grab",
  ]

  // Add edge paths, inline markers, and text labels (clone to avoid modifying live DOM)
  allEdgeElements.forEach((edgeContainer) => {
    // Only get direct paths with the edge-path class (the actual visible edge)
    const edgePaths = edgeContainer.querySelectorAll(".react-flow__edge-path")
    edgePaths.forEach((path) => {
      const clonedPath = path.cloneNode(true) as Element

      // Ensure explicit stroke-width for PowerPoint (default to 1 if not set)
      if (!clonedPath.getAttribute("stroke-width")) {
        clonedPath.setAttribute("stroke-width", "1")
      }

      // Ensure explicit stroke color for edge visibility
      // The stroke may be set via CSS style that gets lost during export
      if (!clonedPath.getAttribute("stroke")) {
        // Check if there's an inline style with stroke
        const styleAttr = clonedPath.getAttribute("style") || ""
        const strokeMatch = styleAttr.match(/stroke:\s*([^;]+)/)
        if (strokeMatch) {
          clonedPath.setAttribute("stroke", strokeMatch[1].trim())
        } else {
          // Default to the primary contrast color (black)
          clonedPath.setAttribute("stroke", STROKE_COLOR)
        }
      }

      // Ensure explicit fill for paths (PowerPoint may not default to none)
      if (!clonedPath.getAttribute("fill")) {
        clonedPath.setAttribute("fill", "none")
      }

      MainEdgesGTag.appendChild(clonedPath)
    })

    // Inline marker shapes (drawn instead of <marker> defs)
    const inlineMarkers = edgeContainer.querySelectorAll("[data-inline-marker]")
    inlineMarkers.forEach((marker) => {
      MainEdgesGTag.appendChild(marker.cloneNode(true))
    })

    // Get text labels
    const textElements = edgeContainer.querySelectorAll("text")
    textElements.forEach((text) => {
      MainEdgesGTag.appendChild(text.cloneNode(true))
    })

    // Get label groups (for complex edge labels) but exclude UI elements
    const labelGroups = edgeContainer.querySelectorAll(
      ".react-flow__edge-text, .react-flow__edge-textwrapper"
    )
    labelGroups.forEach((group) => {
      const cloned = group.cloneNode(true) as Element
      // Remove any UI elements that might be nested
      uiOnlyClasses.forEach((cls) => {
        cloned.querySelectorAll?.(`.${cls}`)?.forEach((el) => el.remove())
      })
      MainEdgesGTag.appendChild(cloned)
    })
  })

  // Process the SVG for compatibility
  replaceCSSVariables(mainSVG)
  convertStyleToAttributes(mainSVG)
  removeMarkerElements(mainSVG)

  return mainSVG.outerHTML
}

/**
 * Extract all coordinate points from an SVG path string.
 * This includes endpoints AND control points for bezier curves,
 * which is important because bezier curves are bounded by the
 * convex hull of all their control points.
 *
 * For S (smooth cubic) and T (smooth quadratic) commands, we also
 * include the reflected control point which may extend the bounds.
 */
function extractPathPoints(pathD: string): Point[] {
  if (!pathD) return []

  const points: Point[] = []
  // Tokenize commands to track current position for relative coords
  const commands =
    pathD.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) ?? []

  let currentX = 0
  let currentY = 0
  // Track last control point for S and T commands
  let lastControlX = 0
  let lastControlY = 0
  let lastCommandType = ""

  for (const cmd of commands) {
    const type = cmd[0]
    const isRelative = type === type.toLowerCase()
    const absType = type.toUpperCase()
    const params =
      cmd
        .slice(1)
        .match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g)
        ?.map(Number) ?? []

    switch (absType) {
      case "M": // MoveTo
      case "L": // LineTo
        for (let i = 0; i + 1 < params.length; i += 2) {
          if (isRelative) {
            currentX += params[i]
            currentY += params[i + 1]
          } else {
            currentX = params[i]
            currentY = params[i + 1]
          }
          points.push({ x: currentX, y: currentY })
        }
        // Reset control point tracking for non-curve commands
        lastControlX = currentX
        lastControlY = currentY
        break

      case "H": // Horizontal LineTo
        for (const x of params) {
          currentX = isRelative ? currentX + x : x
          points.push({ x: currentX, y: currentY })
        }
        lastControlX = currentX
        lastControlY = currentY
        break

      case "V": // Vertical LineTo
        for (const y of params) {
          currentY = isRelative ? currentY + y : y
          points.push({ x: currentX, y: currentY })
        }
        lastControlX = currentX
        lastControlY = currentY
        break

      case "C": // Cubic Bezier (x1 y1 x2 y2 x y)
        // Include ALL control points - curve is bounded by convex hull
        for (let i = 0; i + 5 < params.length; i += 6) {
          const cp1x = isRelative ? currentX + params[i] : params[i]
          const cp1y = isRelative ? currentY + params[i + 1] : params[i + 1]
          const cp2x = isRelative ? currentX + params[i + 2] : params[i + 2]
          const cp2y = isRelative ? currentY + params[i + 3] : params[i + 3]
          const endX = isRelative ? currentX + params[i + 4] : params[i + 4]
          const endY = isRelative ? currentY + params[i + 5] : params[i + 5]

          points.push({ x: cp1x, y: cp1y })
          points.push({ x: cp2x, y: cp2y })
          points.push({ x: endX, y: endY })

          // Track last control point for potential S command
          lastControlX = cp2x
          lastControlY = cp2y
          currentX = endX
          currentY = endY
        }
        break

      case "S": // Smooth Cubic Bezier (x2 y2 x y)
        // S command uses reflected control point from previous C or S
        for (let i = 0; i + 3 < params.length; i += 4) {
          // Calculate reflected control point (cp1)
          // If previous command was C or S, reflect the last control point
          // Otherwise, cp1 equals current point
          let cp1x: number, cp1y: number
          if (lastCommandType === "C" || lastCommandType === "S") {
            cp1x = 2 * currentX - lastControlX
            cp1y = 2 * currentY - lastControlY
          } else {
            cp1x = currentX
            cp1y = currentY
          }

          const cp2x = isRelative ? currentX + params[i] : params[i]
          const cp2y = isRelative ? currentY + params[i + 1] : params[i + 1]
          const endX = isRelative ? currentX + params[i + 2] : params[i + 2]
          const endY = isRelative ? currentY + params[i + 3] : params[i + 3]

          // Include reflected control point in bounds
          points.push({ x: cp1x, y: cp1y })
          points.push({ x: cp2x, y: cp2y })
          points.push({ x: endX, y: endY })

          lastControlX = cp2x
          lastControlY = cp2y
          currentX = endX
          currentY = endY
        }
        break

      case "Q": // Quadratic Bezier (x1 y1 x y)
        for (let i = 0; i + 3 < params.length; i += 4) {
          const cpx = isRelative ? currentX + params[i] : params[i]
          const cpy = isRelative ? currentY + params[i + 1] : params[i + 1]
          const endX = isRelative ? currentX + params[i + 2] : params[i + 2]
          const endY = isRelative ? currentY + params[i + 3] : params[i + 3]

          points.push({ x: cpx, y: cpy })
          points.push({ x: endX, y: endY })

          lastControlX = cpx
          lastControlY = cpy
          currentX = endX
          currentY = endY
        }
        break

      case "T": // Smooth Quadratic (x y)
        // T command uses reflected control point from previous Q or T
        for (let i = 0; i + 1 < params.length; i += 2) {
          // Calculate reflected control point
          let cpx: number, cpy: number
          if (lastCommandType === "Q" || lastCommandType === "T") {
            cpx = 2 * currentX - lastControlX
            cpy = 2 * currentY - lastControlY
          } else {
            cpx = currentX
            cpy = currentY
          }

          const endX = isRelative ? currentX + params[i] : params[i]
          const endY = isRelative ? currentY + params[i + 1] : params[i + 1]

          // Include reflected control point in bounds
          points.push({ x: cpx, y: cpy })
          points.push({ x: endX, y: endY })

          lastControlX = cpx
          lastControlY = cpy
          currentX = endX
          currentY = endY
        }
        break

      case "A": // Arc (rx ry x-axis-rotation large-arc sweep x y)
        // For arcs, we include endpoints and add arc extrema estimation
        for (let i = 0; i + 6 < params.length; i += 7) {
          const rx = params[i]
          const ry = params[i + 1]
          const endX = isRelative ? currentX + params[i + 5] : params[i + 5]
          const endY = isRelative ? currentY + params[i + 6] : params[i + 6]

          // Include endpoint
          points.push({ x: endX, y: endY })

          // Conservative bounds: include points that represent potential arc extrema
          // Arc can extend up to rx/ry beyond the chord between start and end
          const midX = (currentX + endX) / 2
          const midY = (currentY + endY) / 2
          // Add potential extrema points (conservative estimate)
          points.push({ x: midX - rx, y: midY })
          points.push({ x: midX + rx, y: midY })
          points.push({ x: midX, y: midY - ry })
          points.push({ x: midX, y: midY + ry })

          currentX = endX
          currentY = endY
        }
        lastControlX = currentX
        lastControlY = currentY
        break

      case "Z": // Close path
        // Z doesn't add points, just closes to start
        lastControlX = currentX
        lastControlY = currentY
        break
    }

    lastCommandType = absType
  }

  return points
}

/**
 * Get bounding box from edge data points.
 * Falls back to stored points if available.
 */
function getBoundingBox(edges: Edge[]) {
  const allPoints: IPoint[] = edges.flatMap(
    (edge) => (edge.data?.points as IPoint[]) ?? []
  )

  if (allPoints.length === 0) {
    return undefined // No points to calculate bounds
  }

  const xs = allPoints.map((p) => p.x)
  const ys = allPoints.map((p) => p.y)

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Calculate bounding box from actual rendered edge paths in the DOM.
 * This accounts for:
 * - Bezier curve control points that may extend beyond waypoints
 * - Circle markers (which use <circle> elements, not <path>)
 * - Stroke width that extends beyond the mathematical path
 */
function getEdgeBoundsFromDOM(container: HTMLElement): Rect | undefined {
  const edgePaths = container.querySelectorAll(".react-flow__edge-path")
  const allPoints: Point[] = []
  let maxStrokeWidth = 0

  edgePaths.forEach((path) => {
    const d = path.getAttribute("d")
    if (d) {
      allPoints.push(...extractPathPoints(d))
    }
    // Track stroke width for bounds expansion
    const strokeWidth = parseFloat(path.getAttribute("stroke-width") ?? "1")
    if (strokeWidth > maxStrokeWidth) {
      maxStrokeWidth = strokeWidth
    }
  })

  // Check inline markers - both path and circle elements
  const markers = container.querySelectorAll("[data-inline-marker]")
  markers.forEach((marker) => {
    const tagName = marker.tagName.toLowerCase()

    if (tagName === "path") {
      const d = marker.getAttribute("d")
      if (d) {
        allPoints.push(...extractPathPoints(d))
      }
    } else if (tagName === "circle") {
      // Handle circle markers (used for BPMN diagrams)
      const cx = parseFloat(marker.getAttribute("cx") ?? "0")
      const cy = parseFloat(marker.getAttribute("cy") ?? "0")
      const r = parseFloat(marker.getAttribute("r") ?? "0")
      const strokeWidth = parseFloat(marker.getAttribute("stroke-width") ?? "0")
      const totalRadius = r + strokeWidth / 2

      // Add bounding box corners for the circle
      allPoints.push({ x: cx - totalRadius, y: cy - totalRadius })
      allPoints.push({ x: cx + totalRadius, y: cy + totalRadius })
    }

    // Track marker stroke width
    const strokeWidth = parseFloat(marker.getAttribute("stroke-width") ?? "0")
    if (strokeWidth > maxStrokeWidth) {
      maxStrokeWidth = strokeWidth
    }
  })

  if (allPoints.length === 0) {
    return undefined
  }

  const xs = allPoints.map((p) => p.x)
  const ys = allPoints.map((p) => p.y)

  let minX = Math.min(...xs)
  let maxX = Math.max(...xs)
  let minY = Math.min(...ys)
  let maxY = Math.max(...ys)

  // Expand bounds by half stroke width (stroke is centered on path)
  const strokeExpansion = maxStrokeWidth / 2
  minX -= strokeExpansion
  minY -= strokeExpansion
  maxX += strokeExpansion
  maxY += strokeExpansion

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function mergeBounds(a: Rect, b: Rect): Rect {
  const minX = Math.min(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxX = Math.max(a.x + a.width, b.x + b.width)
  const maxY = Math.max(a.y + a.height, b.y + b.height)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function getDiagramBounds(
  reactFlow: ReactFlowInstance<Node, Edge>,
  container?: HTMLElement | null
): Rect {
  const nodeBounds = reactFlow.getNodesBounds(reactFlow.getNodes())

  // Prefer DOM-based edge bounds calculation (accounts for bezier control points)
  let edgeBounds: Rect | undefined
  if (container) {
    edgeBounds = getEdgeBoundsFromDOM(container)
  }

  // Fall back to stored points if DOM isn't available
  if (!edgeBounds) {
    edgeBounds = getBoundingBox(reactFlow.getEdges())
  }

  if (!edgeBounds) return nodeBounds

  return mergeBounds(nodeBounds, edgeBounds)
}

function extractStyles(styleString: string) {
  const transformMatch = styleString.match(
    /transform:\s*translate\((-?\d+\.?\d*)px,\s*(-?\d+\.?\d*)px\)/
  )
  const widthMatch = styleString.match(/width:\s*([^;]+)/)
  const heightMatch = styleString.match(/height:\s*([^;]+)/)

  const x = transformMatch ? parseFloat(transformMatch[1]) : 0
  const y = transformMatch ? parseFloat(transformMatch[2]) : 0

  return {
    transform: { x, y },
    width: widthMatch ? widthMatch[1].trim() : null,
    height: heightMatch ? heightMatch[1].trim() : null,
  }
}

/**
 * Regex to match CSS var() function calls.
 * Captures: (1) variable name, (2) optional fallback value
 *
 * This regex handles nested parentheses in fallbacks like rgba(36, 39, 36, 0.1)
 * by capturing everything after the comma until the matching closing paren.
 */
const VARIABLE_REGEX =
  /var\((--[\w-]+)(?:\s*,\s*([^)]+(?:\([^)]*\)[^)]*)*))?\)/g

/**
 * Resolve a single CSS variable reference to its final value.
 * Handles recursive var() resolution and fallback values.
 */
function resolveCSSVariable(value: string): string {
  let result = value
  let prevResult = ""

  // Keep resolving until no more var() calls are found (handles nested vars)
  while (result !== prevResult && result.includes("var(")) {
    prevResult = result
    result = result.replace(
      VARIABLE_REGEX,
      (_match, variableName: string, fallback?: string) => {
        const trimmedName = variableName.trim()
        const resolved = CSS_VARIABLE_FALLBACKS[trimmedName]

        if (resolved) {
          // If the resolved value itself contains var(), it will be resolved in the next iteration
          return resolved
        }

        if (fallback) {
          // Fallback may itself contain var() calls
          return fallback.trim()
        }

        // Variable not found, no fallback - return empty
        // Note: Unresolved variable ${trimmedName} will result in empty value
        return ""
      }
    )
  }

  return result
}

/**
 * Resolve 'currentColor' keyword by looking up the resolved 'color' attribute.
 */
function resolveCurrentColor(element: Element, inheritedColor: string): string {
  // Check if element has a color attribute
  const colorAttr = element.getAttribute("color")
  if (colorAttr) {
    const resolvedColor = resolveCSSVariable(colorAttr)
    // Handle case where color itself might be currentColor (shouldn't happen, but be safe)
    if (resolvedColor && resolvedColor !== "currentColor") {
      return resolvedColor
    }
  }
  return inheritedColor
}

/**
 * Replace CSS variables and currentColor in all attributes of an element tree.
 *
 * @param node - The DOM node to process
 * @param inheritedColor - The inherited 'currentColor' value from parent elements
 */
function replaceCSSVariables(
  node: Element | ChildNode,
  inheritedColor: string = STROKE_COLOR
): void {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element

    // First, resolve the 'color' attribute if present (for currentColor inheritance)
    const currentColor = resolveCurrentColor(element, inheritedColor)

    // If element has a color attribute, resolve it first
    const colorAttr = element.getAttribute("color")
    if (colorAttr) {
      const resolvedColor = resolveCSSVariable(colorAttr)
      if (resolvedColor !== colorAttr) {
        element.setAttribute("color", resolvedColor)
      }
    }

    // Process all attributes (including 'style')
    element.getAttributeNames().forEach((attr) => {
      const attrValue = element.getAttribute(attr)
      if (!attrValue) return

      // Resolve CSS variables first
      let resolvedValue = resolveCSSVariable(attrValue)

      // Resolve 'currentColor' keyword
      if (resolvedValue === "currentColor") {
        resolvedValue = currentColor
      } else if (resolvedValue.includes("currentColor")) {
        resolvedValue = resolvedValue.replace(/currentColor/gi, currentColor)
      }

      // Resolve SVG2 context-stroke and context-fill (not supported by Inkscape/external renderers)
      // These are used in markers to inherit stroke/fill from the referencing element
      if (
        resolvedValue === "context-stroke" ||
        resolvedValue === "context-fill"
      ) {
        resolvedValue = currentColor
      }

      // Replace custom fonts with system fonts for export compatibility
      // Inter is not available in PowerPoint/Inkscape, causing font metric issues
      if (attr === "font-family" || attr === "fontFamily") {
        resolvedValue = "Arial, Helvetica, sans-serif"
      }

      // Normalize font-size to always have px units
      // Some renderers interpret unitless values differently (px vs pt)
      if (attr === "font-size" || attr === "fontSize") {
        // Check if it's a unitless number
        if (/^\d+(\.\d+)?$/.test(resolvedValue)) {
          resolvedValue = `${resolvedValue}px`
        }
      }

      // Remove CSS-only attributes not valid for external SVG renderers
      if (attr === "pointer-events" || attr === "pointerEvents") {
        element.removeAttribute(attr)
        return // Skip setting the attribute
      }

      if (resolvedValue !== attrValue) {
        element.setAttribute(attr, resolvedValue)
      }
    })

    // Recursively process children, passing down the resolved color
    Array.from(element.childNodes).forEach((child) =>
      replaceCSSVariables(child, currentColor)
    )
  } else if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text
    const textContent = textNode.textContent ?? ""
    const resolvedText = resolveCSSVariable(textContent)
    if (resolvedText !== textContent) {
      textNode.textContent = resolvedText
    }
  }
}

/**
 * SVG style properties that should be converted to attributes for PowerPoint compatibility.
 * PowerPoint has poor support for CSS in style attributes but handles direct SVG attributes well.
 */
const SVG_STYLE_TO_ATTRIBUTE = [
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "fill",
  "fill-opacity",
  "opacity",
] as const

/**
 * Convert inline style properties to direct SVG attributes for better compatibility.
 * PowerPoint and some other applications don't properly parse CSS in style attributes.
 */
function convertStyleToAttributes(node: Element | ChildNode): void {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return
  }

  const element = node as Element
  const styleAttr = element.getAttribute("style")

  if (styleAttr) {
    const remainingStyles: string[] = []

    // Parse style attribute and convert SVG properties to attributes
    styleAttr.split(";").forEach((declaration) => {
      const [prop, value] = declaration.split(":").map((s) => s.trim())
      if (!prop || !value) return

      // Skip problematic values that can cause issues in PowerPoint
      if (prop === "transition") return // CSS-only, not SVG
      if (prop === "stroke-dasharray" && value === "0") return // Redundant
      if (prop === "opacity" && value === "1") return // Default, redundant

      // Check if this is an SVG property that should be an attribute
      if (
        SVG_STYLE_TO_ATTRIBUTE.includes(
          prop as (typeof SVG_STYLE_TO_ATTRIBUTE)[number]
        )
      ) {
        // Only set if not already present as an attribute
        if (!element.hasAttribute(prop)) {
          element.setAttribute(prop, value)
        }
      } else {
        // Keep non-SVG properties in style
        remainingStyles.push(`${prop}: ${value}`)
      }
    })

    // Update or remove style attribute
    if (remainingStyles.length > 0) {
      element.setAttribute("style", remainingStyles.join("; "))
    } else {
      element.removeAttribute("style")
    }
  }

  // Recursively process children
  Array.from(element.childNodes).forEach(convertStyleToAttributes)
}

/**
 * Final safety pass: strip any legacy <marker> references that could sneak in
 * from third-party content. Keeps exports clean for PowerPoint/Keynote.
 */
function removeMarkerElements(svg: Element): void {
  svg.querySelectorAll("marker").forEach((el) => el.remove())
  svg
    .querySelectorAll("[marker-start]")
    .forEach((el) => el.removeAttribute("marker-start"))
  svg
    .querySelectorAll("[marker-end]")
    .forEach((el) => el.removeAttribute("marker-end"))
}
