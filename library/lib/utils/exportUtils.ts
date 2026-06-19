import { ReactFlowInstance, type Node, type Edge, Rect } from "@xyflow/react"
import { CSS_VARIABLE_FALLBACKS, LAYOUT, STROKE_COLOR } from "@/constants"
import { DEFAULT_FONT_SIZE, FONT_FAMILY } from "@/fontStack"
import { Point } from "./pathParsing"
import { measureTextWidth } from "./textUtils"

/**
 * Font stack for exported SVGs (matches the browser). `compat` mode also embeds
 * the Inter woff2 as an `@font-face` via `embedFontFaceCss` so non-browser
 * renderers draw with the same metrics instead of a system fallback.
 */
const svgFontStyles = `
    text {
      font-family: ${FONT_FAMILY};
    }
  `

type SvgExportMode = "web" | "compat"

type ExportFilterOptions = {
  include?: string[]
  exclude?: string[]
  svgMode?: SvgExportMode
}

function shouldRenderElement(
  elementId: string | null,
  options?: ExportFilterOptions
): boolean {
  if (!elementId) {
    return true
  }

  if (options?.include && options.include.length > 0) {
    return options.include.includes(elementId)
  }

  if (options?.exclude && options.exclude.length > 0) {
    return !options.exclude.includes(elementId)
  }

  return true
}

export function filterRenderedElements(
  container: HTMLElement,
  options?: ExportFilterOptions
): void {
  if (!options?.include?.length && !options?.exclude?.length) {
    return
  }

  container
    .querySelectorAll(".react-flow__node, .react-flow__edge")
    .forEach((element) => {
      const elementId = element.getAttribute("data-id") || element.id || null
      if (!shouldRenderElement(elementId, options)) {
        element.remove()
      }
    })
}

export const getSVG = (
  container: HTMLElement,
  clip: Rect,
  options?: ExportFilterOptions,
  /**
   * Optional `@font-face` CSS to embed (compat mode only). Passed in rather than
   * imported so the woff2 stays out of the main entry bundle (see exportFonts.ts).
   */
  fontFaceCss?: string
): string => {
  const emptySVG = "<svg></svg>"

  const width = clip.width
  const height = clip.height

  const svgMode = options?.svgMode ?? "web"
  const vp = container.querySelector(".react-flow__viewport")

  if (!vp) return emptySVG

  const SVG_NS = "http://www.w3.org/2000/svg"
  const mainSVG = document.createElementNS(SVG_NS, "svg")
  mainSVG.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  const styleEl = document.createElementNS(SVG_NS, "style")
  // In web mode, keep CSS variables unresolved so the host app theme can drive
  // light/dark colors. Compat mode resolves variables to static values below.
  styleEl.textContent = svgFontStyles
  mainSVG.appendChild(styleEl)
  mainSVG.setAttribute("viewBox", `${clip.x} ${clip.y} ${width} ${height}`)
  mainSVG.setAttribute("width", `${width}`)
  mainSVG.setAttribute("height", `${height}`)
  // Use geometric precision for anti-aliasing to reduce visual artifacts
  // where edges overlap with node borders in non-browser renderers (resvg, Inkscape)
  mainSVG.setAttribute("shape-rendering", "geometricPrecision")

  const MainNodesGTag = document.createElementNS(SVG_NS, "g")
  mainSVG.appendChild(MainNodesGTag)
  const allNodes = vp.querySelectorAll(".react-flow__node")

  allNodes.forEach((node) => {
    const styles = extractStyles(node.getAttribute("style") ?? "")
    const newGTagForNode = document.createElementNS(SVG_NS, "g")
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

  const MainEdgesGTag = document.createElementNS(SVG_NS, "g")
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

      // Ensure explicit stroke-width for PowerPoint (default to LINE_WIDTH_EDGE if not set)
      if (!clonedPath.getAttribute("stroke-width")) {
        clonedPath.setAttribute("stroke-width", String(LAYOUT.LINE_WIDTH_EDGE))
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

      // Ensure fully opaque rendering for non-browser SVG renderers (resvg, Inkscape, etc.)
      // Without explicit opacity attributes, some renderers may not default to 1.0,
      // causing overlapping edges/borders to appear darker due to alpha compositing.
      clonedPath.setAttribute("opacity", "1")
      clonedPath.setAttribute("stroke-opacity", "1")

      MainEdgesGTag.appendChild(clonedPath)
    })

    // Inline marker shapes (drawn instead of <marker> defs)
    const inlineMarkers = edgeContainer.querySelectorAll("[data-inline-marker]")
    inlineMarkers.forEach((marker) => {
      MainEdgesGTag.appendChild(marker.cloneNode(true))
    })

    // Get label groups first (for complex edge labels like CommunicationDiagram messages)
    const labelGroups = edgeContainer.querySelectorAll(
      ".react-flow__edge-text, .react-flow__edge-textwrapper, .edge-labels"
    )
    labelGroups.forEach((group) => {
      const cloned = group.cloneNode(true) as Element
      // Remove any UI elements that might be nested
      uiOnlyClasses.forEach((cls) => {
        cloned.querySelectorAll?.(`.${cls}`)?.forEach((el) => el.remove())
      })
      MainEdgesGTag.appendChild(cloned)
    })

    // Get standalone text labels (not already inside label groups to avoid duplication)
    const textElements = edgeContainer.querySelectorAll("text")
    textElements.forEach((text) => {
      // Check if this text is inside a label group
      const isInsideLabelGroup = Array.from(labelGroups).some((group) =>
        group.contains(text)
      )

      if (!isInsideLabelGroup) {
        MainEdgesGTag.appendChild(text.cloneNode(true))
      }
    })
  })

  // Process the SVG for compatibility with non-browser renderers
  if (svgMode === "compat") {
    replaceCSSVariables(mainSVG)
    convertStyleToAttributes(mainSVG)
    ensureTextFontDefaults(mainSVG)
    resolveRelativeFontSizes(mainSVG)
    resolveTspanDy(mainSVG)
    resolveDominantBaseline(mainSVG)
    if (fontFaceCss) embedFontFaceCss(mainSVG, fontFaceCss)
    removeMarkerElements(mainSVG)
    replaceTextDecorationWithManualUnderline(mainSVG)
  }

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

function getNodeBoundsFromDOM(
  container: HTMLElement,
  reactFlow?: ReactFlowInstance<Node, Edge>
): Rect | undefined {
  const nodeElements = container.querySelectorAll(".react-flow__node")

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let foundNode = false

  nodeElements.forEach((nodeEl) => {
    const styleStr = nodeEl.getAttribute("style") ?? ""
    const styles = extractStyles(styleStr)
    const svgElement = nodeEl.querySelector("svg")
    const renderedSvgRect = svgElement?.getBoundingClientRect()
    // Headless renderers (jsdom) return a 0×0 rect; `0 ?? fallback` would keep
    // the 0 and collapse the node to its origin, cropping the export. Treat a
    // non-positive rect as unmeasured so the attribute/style fallbacks apply.
    const measuredWidth =
      renderedSvgRect && renderedSvgRect.width > 0
        ? renderedSvgRect.width
        : undefined
    const measuredHeight =
      renderedSvgRect && renderedSvgRect.height > 0
        ? renderedSvgRect.height
        : undefined
    if (svgElement) {
      const viewBox = svgElement.getAttribute("viewBox")
      if (viewBox) {
        const viewBoxParts = viewBox.split(/[\s,]+/).map(Number)
        if (viewBoxParts.length >= 4) {
          const [vbX, vbY, vbW, vbH] = viewBoxParts
          const svgWidth =
            measuredWidth ??
            parseFloat(svgElement.getAttribute("width") ?? `${vbW}`)
          const svgHeight =
            measuredHeight ??
            parseFloat(svgElement.getAttribute("height") ?? `${vbH}`)

          if (
            Number.isFinite(svgWidth) &&
            Number.isFinite(svgHeight) &&
            vbW !== 0 &&
            vbH !== 0
          ) {
            try {
              const bbox = (svgElement as SVGGraphicsElement).getBBox()
              if (
                Number.isFinite(bbox.x) &&
                Number.isFinite(bbox.y) &&
                Number.isFinite(bbox.width) &&
                Number.isFinite(bbox.height) &&
                (bbox.width > 0 || bbox.height > 0)
              ) {
                const scaleX = svgWidth / vbW
                const scaleY = svgHeight / vbH
                const bboxX = styles.transform.x + (bbox.x - vbX) * scaleX
                const bboxY = styles.transform.y + (bbox.y - vbY) * scaleY
                const bboxMaxX =
                  styles.transform.x + (bbox.x + bbox.width - vbX) * scaleX
                const bboxMaxY =
                  styles.transform.y + (bbox.y + bbox.height - vbY) * scaleY

                foundNode = true
                minX = Math.min(minX, bboxX)
                minY = Math.min(minY, bboxY)
                maxX = Math.max(maxX, bboxMaxX)
                maxY = Math.max(maxY, bboxMaxY)
                return
              }
            } catch {
              // Fall back to screen-rect or wrapper-based bounds when getBBox()
              // is unavailable in the current renderer.
            }
          }
        }
      }
    }

    if (renderedSvgRect && reactFlow) {
      const topLeft = reactFlow.screenToFlowPosition({
        x: renderedSvgRect.left,
        y: renderedSvgRect.top,
      })
      const bottomRight = reactFlow.screenToFlowPosition({
        x: renderedSvgRect.right,
        y: renderedSvgRect.bottom,
      })

      if (
        Number.isFinite(topLeft.x) &&
        Number.isFinite(topLeft.y) &&
        Number.isFinite(bottomRight.x) &&
        Number.isFinite(bottomRight.y)
      ) {
        foundNode = true
        minX = Math.min(minX, topLeft.x)
        minY = Math.min(minY, topLeft.y)
        maxX = Math.max(maxX, bottomRight.x)
        maxY = Math.max(maxY, bottomRight.y)
        return
      }
    }

    const width = measuredWidth ?? parseFloat(styles.width ?? "")
    const height = measuredHeight ?? parseFloat(styles.height ?? "")

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return
    }

    foundNode = true
    minX = Math.min(minX, styles.transform.x)
    minY = Math.min(minY, styles.transform.y)
    maxX = Math.max(maxX, styles.transform.x + width)
    maxY = Math.max(maxY, styles.transform.y + height)
  })

  if (!foundNode) {
    return undefined
  }

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
    const strokeWidth = parseFloat(
      path.getAttribute("stroke-width") ?? String(LAYOUT.LINE_WIDTH_EDGE)
    )
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

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const p of allPoints) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }

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

/**
 * Calculate bounds for node SVG overflow content.
 *
 * Some nodes render elements outside their viewBox (e.g., the initial marking
 * arrow in Reachability Graphs extends to negative coordinates). These elements
 * are visible because the node SVGs use overflow="visible", but they are NOT
 * included in reactFlow.getNodesBounds() which only considers node position
 * and dimensions.
 *
 * This function scans node SVGs for <line>, <path>, and <circle> elements
 * that extend outside the node's local coordinate system (viewBox), converts
 * them to global coordinates, and returns the bounding box of all such content.
 */
function getNodeOverflowBoundsFromDOM(
  container: HTMLElement
): Rect | undefined {
  const allNodes = container.querySelectorAll(".react-flow__node")
  const overflowPoints: Point[] = []

  allNodes.forEach((node) => {
    const styleStr = node.getAttribute("style") ?? ""
    const styles = extractStyles(styleStr)
    const nodeX = styles.transform.x
    const nodeY = styles.transform.y

    const svgEl = node.querySelector("svg")
    if (!svgEl) return

    // Parse the viewBox to understand the local coordinate system
    const vb = svgEl.getAttribute("viewBox")
    if (!vb) return
    const vbParts = vb.split(/[\s,]+/).map(Number)
    if (vbParts.length < 4) return
    const [vbX, vbY, vbW, vbH] = vbParts

    // Calculate scale from viewBox to rendered size
    const svgW = parseFloat(svgEl.getAttribute("width") ?? `${vbW}`)
    const svgH = parseFloat(svgEl.getAttribute("height") ?? `${vbH}`)
    const scaleX = svgW / vbW
    const scaleY = svgH / vbH

    // Helper: convert a local SVG coordinate to global space
    const toGlobal = (lx: number, ly: number): Point => ({
      x: nodeX + (lx - vbX) * scaleX,
      y: nodeY + (ly - vbY) * scaleY,
    })

    // Check if a local coordinate is outside the viewBox
    const isOverflow = (lx: number, ly: number) =>
      lx < vbX || ly < vbY || lx > vbX + vbW || ly > vbY + vbH

    // Scan <line> elements for overflow content
    svgEl.querySelectorAll("line").forEach((line) => {
      const x1 = parseFloat(line.getAttribute("x1") ?? "0")
      const y1 = parseFloat(line.getAttribute("y1") ?? "0")
      const x2 = parseFloat(line.getAttribute("x2") ?? "0")
      const y2 = parseFloat(line.getAttribute("y2") ?? "0")

      if (isOverflow(x1, y1) || isOverflow(x2, y2)) {
        overflowPoints.push(toGlobal(x1, y1))
        overflowPoints.push(toGlobal(x2, y2))
      }
    })

    // Scan <path> elements for overflow content
    svgEl.querySelectorAll("path").forEach((path) => {
      const d = path.getAttribute("d")
      if (!d) return
      const pathPoints = extractPathPoints(d)
      const hasOverflow = pathPoints.some((p) => isOverflow(p.x, p.y))
      if (hasOverflow) {
        pathPoints.forEach((p) => overflowPoints.push(toGlobal(p.x, p.y)))
      }
    })

    // Scan <polyline> elements for overflow content
    svgEl.querySelectorAll("polyline").forEach((polyline) => {
      const pointsAttr = polyline.getAttribute("points")
      if (!pointsAttr) return
      const coords = pointsAttr
        .trim()
        .split(/[\s,]+/)
        .map(Number)
      for (let i = 0; i + 1 < coords.length; i += 2) {
        const lx = coords[i]
        const ly = coords[i + 1]
        if (isOverflow(lx, ly)) {
          // If any point overflows, include all points
          for (let j = 0; j + 1 < coords.length; j += 2) {
            overflowPoints.push(toGlobal(coords[j], coords[j + 1]))
          }
          break
        }
      }
    })

    // Scan <circle> elements for overflow content
    svgEl.querySelectorAll("circle").forEach((circle) => {
      const cx = parseFloat(circle.getAttribute("cx") ?? "0")
      const cy = parseFloat(circle.getAttribute("cy") ?? "0")
      const r = parseFloat(circle.getAttribute("r") ?? "0")

      if (isOverflow(cx - r, cy - r) || isOverflow(cx + r, cy + r)) {
        overflowPoints.push(toGlobal(cx - r, cy - r))
        overflowPoints.push(toGlobal(cx + r, cy + r))
      }
    })
  })

  if (overflowPoints.length === 0) return undefined

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const p of overflowPoints) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Above- and below-`y` glyph extents as a fraction of font-size, by the SVG
 * `dominant-baseline` that places the `<text>` `y` anchor.
 *
 * - `middle` (use-case `<<include>>`/`<<extend>>`, communication messages): `y`
 *   sits at the glyph center, so the box is symmetric. Inter's cap+ascender
 *   half-height is ~0.6em; 0.75 over-includes safely.
 * - alphabetic/`auto`/absent (association role + multiplicity end-labels): `y`
 *   IS the baseline, so the box is ASYMMETRIC — ascenders/caps rise ~0.9em
 *   ABOVE `y` and descenders drop ~0.3em BELOW it. A symmetric ±0.75em would
 *   clip the top of a cap-height label by ~0.15em. Over-include on both sides.
 *
 * Over-including is safe for an export clip; cropping a graded label is not.
 */
const BASELINE_EXTENTS: Record<
  "middle" | "alphabetic",
  { up: number; down: number }
> = {
  middle: { up: 0.75, down: 0.75 },
  alphabetic: { up: 0.9, down: 0.3 },
}

/**
 * Parse `transform="rotate(angle[, cx, cy])"` into its components. Accepts both
 * the comma form (`rotate(30, 10, 20)`, EdgeIncludeExtendLabel) and the
 * space form (`rotate(30 10 20)`, EdgeMiddleLabels). Returns `undefined` for a
 * missing/zero/origin-only rotation so callers skip the rotation math.
 */
function parseRotateTransform(
  transform: string | null
): { angleRad: number; cx: number; cy: number } | undefined {
  if (!transform) return undefined
  const match = transform.match(
    /rotate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+))?\s*\)/
  )
  if (!match) return undefined
  const angleDeg = parseFloat(match[1])
  if (!Number.isFinite(angleDeg) || angleDeg === 0) return undefined
  const cx = match[2] !== undefined ? parseFloat(match[2]) : 0
  const cy = match[3] !== undefined ? parseFloat(match[3]) : 0
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return undefined
  return { angleRad: (angleDeg * Math.PI) / 180, cx, cy }
}

/**
 * Headless fallback for edge-label bounds. jsdom returns an all-zero
 * `getBoundingClientRect` for SVG `<text>`, so derive the label's flow-space box
 * from its absolute `x`/`y`, `text-anchor`, `dominant-baseline`, and a
 * canvas-measured width. Extents round up so a slightly-off measure still
 * encloses the glyphs — over-including is safe for a clip; cropping a graded
 * label is not.
 *
 * Handles the two edge-label transforms emitted by the editor:
 *  - rotated labels (use-case `<<include>>`/`<<extend>>` and the rotated
 *    use-case association labels via `transform="rotate(angle, cx, cy)"`): the
 *    four un-rotated corners are rotated about the pivot before merging, so the
 *    AABB has the correct aspect instead of an axis-aligned box of the wrong
 *    shape;
 *  - alphabetic-baseline labels (association role/multiplicity end-labels, no
 *    `dominant-baseline`): asymmetric vertical extents so the ascender isn't
 *    clipped.
 */
function mergeEdgeTextBoundsFromAttributes(
  textEl: SVGTextElement,
  mergeRect: (x1: number, y1: number, x2: number, y2: number) => void
): void {
  const text = textEl.textContent ?? ""
  if (!text.trim()) return

  const x = parseFloat(textEl.getAttribute("x") ?? "")
  const y = parseFloat(textEl.getAttribute("y") ?? "")
  if (!Number.isFinite(x) || !Number.isFinite(y)) return

  const fontSize =
    parseFloat(textEl.getAttribute("font-size") || textEl.style.fontSize) ||
    DEFAULT_FONT_SIZE
  const fontWeight =
    textEl.getAttribute("font-weight") || textEl.style.fontWeight || "400"
  const width = measureTextWidth(
    text,
    `${fontWeight} ${fontSize}px ${FONT_FAMILY}`
  )

  const anchor = textEl.getAttribute("text-anchor")
  const left =
    anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x
  const right = left + width

  const baseline =
    (textEl.getAttribute("dominant-baseline") ||
      textEl.style.dominantBaseline) === "middle"
      ? "middle"
      : "alphabetic"
  const { up, down } = BASELINE_EXTENTS[baseline]
  const top = y - fontSize * up
  const bottom = y + fontSize * down

  const rotation = parseRotateTransform(textEl.getAttribute("transform"))
  if (!rotation) {
    mergeRect(left, top, right, bottom)
    return
  }

  // Rotate the four un-rotated corners about the pivot and merge their AABB,
  // matching the rendered orientation. SVG rotate() is clockwise in the
  // y-down user space.
  const { angleRad, cx, cy } = rotation
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const rotate = (px: number, py: number) => {
    const dx = px - cx
    const dy = py - cy
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
  }
  const corners = [
    rotate(left, top),
    rotate(right, top),
    rotate(right, bottom),
    rotate(left, bottom),
  ]
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  mergeRect(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))
}

/**
 * Calculate bounds for rendered SVG text and labels.
 *
 * Some labels extend beyond node/edge geometry and are not reliably captured by
 * node or edge path bounds alone. Measuring rendered text via getBBox() gives us
 * the actual SVG-space bounds that should be included in the export clip.
 */
function getTextBoundsFromDOM(
  container: HTMLElement,
  reactFlow: ReactFlowInstance<Node, Edge>
): Rect | undefined {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let foundVisibleText = false

  const mergeRect = (x1: number, y1: number, x2: number, y2: number) => {
    const localMinX = Math.min(x1, x2)
    const localMinY = Math.min(y1, y2)
    const localMaxX = Math.max(x1, x2)
    const localMaxY = Math.max(y1, y2)

    if (
      !Number.isFinite(localMinX) ||
      !Number.isFinite(localMinY) ||
      !Number.isFinite(localMaxX) ||
      !Number.isFinite(localMaxY)
    ) {
      return
    }

    minX = Math.min(minX, localMinX)
    minY = Math.min(minY, localMinY)
    maxX = Math.max(maxX, localMaxX)
    maxY = Math.max(maxY, localMaxY)
    foundVisibleText = true
  }

  // Node text is usually inside nested node SVGs, so getBBox() is local to the
  // node SVG coordinate system. Convert it to flow coordinates manually using
  // node transform + SVG viewBox scale.
  const nodeElements = container.querySelectorAll(".react-flow__node")
  nodeElements.forEach((nodeEl) => {
    const styleStr = nodeEl.getAttribute("style") ?? ""
    const styles = extractStyles(styleStr)
    const nodeX = styles.transform.x
    const nodeY = styles.transform.y

    const svgEl = nodeEl.querySelector("svg")
    if (!svgEl) return

    const viewBox = svgEl.getAttribute("viewBox")
    if (!viewBox) return

    const vbParts = viewBox.split(/[\s,]+/).map(Number)
    if (vbParts.length < 4) return
    const [vbX, vbY, vbW, vbH] = vbParts

    const svgW = parseFloat(svgEl.getAttribute("width") ?? `${vbW}`)
    const svgH = parseFloat(svgEl.getAttribute("height") ?? `${vbH}`)
    if (
      !Number.isFinite(svgW) ||
      !Number.isFinite(svgH) ||
      vbW === 0 ||
      vbH === 0
    ) {
      return
    }
    const scaleX = svgW / vbW
    const scaleY = svgH / vbH

    svgEl.querySelectorAll("text").forEach((textEl) => {
      try {
        const bbox = (textEl as SVGGraphicsElement).getBBox()
        if (
          !Number.isFinite(bbox.x) ||
          !Number.isFinite(bbox.y) ||
          !Number.isFinite(bbox.width) ||
          !Number.isFinite(bbox.height)
        ) {
          return
        }
        if (bbox.width === 0 && bbox.height === 0) {
          return
        }

        const x1 = nodeX + (bbox.x - vbX) * scaleX
        const y1 = nodeY + (bbox.y - vbY) * scaleY
        const x2 = nodeX + (bbox.x + bbox.width - vbX) * scaleX
        const y2 = nodeY + (bbox.y + bbox.height - vbY) * scaleY

        mergeRect(x1, y1, x2, y2)
      } catch {
        // Ignore text nodes that cannot be measured in the current renderer.
      }
    })
  })

  // Edge text is rendered in the edge layer; measuring screen rect and mapping
  // back to flow coordinates keeps us aligned with the current viewport transform.
  const edgeTextElements = container.querySelectorAll(".react-flow__edge text")
  edgeTextElements.forEach((textEl) => {
    try {
      const rect = (textEl as SVGGraphicsElement).getBoundingClientRect()
      if (
        !Number.isFinite(rect.left) ||
        !Number.isFinite(rect.top) ||
        !Number.isFinite(rect.right) ||
        !Number.isFinite(rect.bottom)
      ) {
        return
      }
      if (rect.width === 0 && rect.height === 0) {
        // Headless renderers (jsdom) return an all-zero rect for SVG text, so
        // the screen-rect path above can't see edge labels — and an overhanging
        // label (communication messages, multiplicities) would be silently
        // cropped from the export clip. Edge text carries absolute flow-space
        // x/y, so reconstruct its box from those plus a real measureText width.
        mergeEdgeTextBoundsFromAttributes(textEl as SVGTextElement, mergeRect)
        return
      }

      const corners = [
        reactFlow.screenToFlowPosition({ x: rect.left, y: rect.top }),
        reactFlow.screenToFlowPosition({ x: rect.right, y: rect.top }),
        reactFlow.screenToFlowPosition({ x: rect.left, y: rect.bottom }),
        reactFlow.screenToFlowPosition({ x: rect.right, y: rect.bottom }),
      ]
      const xs = corners.map((point) => point.x)
      const ys = corners.map((point) => point.y)

      mergeRect(
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys)
      )
    } catch {
      // Ignore text nodes that cannot be measured in the current renderer.
    }
  })

  if (!foundVisibleText) return undefined

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

export function getRenderedDiagramBounds(
  reactFlow: ReactFlowInstance<Node, Edge>,
  container: HTMLElement
): Rect {
  let bounds = getNodeBoundsFromDOM(container, reactFlow)

  const edgeBounds = getEdgeBoundsFromDOM(container)
  if (bounds && edgeBounds) {
    bounds = mergeBounds(bounds, edgeBounds)
  } else if (!bounds && edgeBounds) {
    bounds = edgeBounds
  }

  const overflowBounds = getNodeOverflowBoundsFromDOM(container)
  if (bounds && overflowBounds) {
    bounds = mergeBounds(bounds, overflowBounds)
  } else if (!bounds && overflowBounds) {
    bounds = overflowBounds
  }

  const textBounds = getTextBoundsFromDOM(container, reactFlow)
  if (bounds && textBounds) {
    bounds = mergeBounds(bounds, textBounds)
  } else if (!bounds && textBounds) {
    bounds = textBounds
  }

  return bounds ?? { x: 0, y: 0, width: 0, height: 0 }
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

type CSSVariableMap = Readonly<Record<string, string>>

/**
 * Resolve a single CSS variable reference to its final value.
 * Handles recursive var() resolution and fallback values.
 */
function resolveCSSVariable(value: string, cssVarMap?: CSSVariableMap): string {
  let result = value
  let prevResult = ""

  // Keep resolving until no more var() calls are found (handles nested vars)
  while (result !== prevResult && result.includes("var(")) {
    prevResult = result
    result = result.replace(
      VARIABLE_REGEX,
      (_match, variableName: string, fallback?: string) => {
        const trimmedName = variableName.trim()
        const mapped = cssVarMap?.[trimmedName]?.trim()
        if (mapped) {
          // If the resolved value itself contains var(), it will be resolved in the next iteration
          return mapped
        }
        const resolved = CSS_VARIABLE_FALLBACKS[trimmedName]
        if (resolved) return resolved

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
function resolveCurrentColor(
  element: Element,
  inheritedColor: string,
  cssVarMap?: CSSVariableMap
): string {
  // Check if element has a color attribute
  const colorAttr = element.getAttribute("color")
  if (colorAttr) {
    const resolvedColor = resolveCSSVariable(colorAttr, cssVarMap)
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
  inheritedColor: string = STROKE_COLOR,
  cssVarMap?: CSSVariableMap
): void {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element

    // First, resolve the 'color' attribute if present (for currentColor inheritance)
    const currentColor = resolveCurrentColor(element, inheritedColor, cssVarMap)

    // If element has a color attribute, resolve it first
    const colorAttr = element.getAttribute("color")
    if (colorAttr) {
      const resolvedColor = resolveCSSVariable(colorAttr, cssVarMap)
      if (resolvedColor !== colorAttr) {
        element.setAttribute("color", resolvedColor)
      }
    }

    // Process all attributes (including 'style')
    element.getAttributeNames().forEach((attr) => {
      const attrValue = element.getAttribute(attr)
      if (!attrValue) return

      // Resolve CSS variables first
      let resolvedValue = resolveCSSVariable(attrValue, cssVarMap)

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
      replaceCSSVariables(child, currentColor, cssVarMap)
    )
  }
  // Text nodes are not processed — CSS variables only appear in attribute values,
  // and processing text content would corrupt user-authored labels containing "var(".
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
  "font-size",
  "font-weight",
  "font-family",
  "font-style",
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
      // Note: We intentionally do NOT skip opacity: 1.
      // While it's the default in browsers, non-browser SVG renderers (resvg, Inkscape)
      // may not apply the same default, causing overlapping elements to appear darker.

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
 * Default font values matching the browser rendering (app.css / CustomText.tsx).
 * Applied to <text> elements that don't have explicit font attributes,
 * ensuring non-browser SVG renderers (resvg, Inkscape, PowerPoint) render
 * text identically to what the user sees on screen.
 */
const TEXT_FONT_DEFAULTS = {
  "font-size": `${DEFAULT_FONT_SIZE}px`,
  "font-weight": "400",
  "font-family": FONT_FAMILY,
} as const

/**
 * Ensure all <text> elements have explicit font-size, font-weight, and font-family.
 *
 * In the browser, text inherits these from CSS (:root font-family, default font-size).
 * In exported SVGs opened in non-browser renderers, missing attributes cause text to
 * render with the renderer's own defaults (often Times New Roman at an arbitrary size).
 *
 * This pass runs AFTER convertStyleToAttributes so any font props already extracted
 * from inline styles are present as attributes.
 */
function ensureTextFontDefaults(svg: Element): void {
  svg.querySelectorAll("text").forEach((textEl) => {
    for (const [attr, defaultValue] of Object.entries(TEXT_FONT_DEFAULTS)) {
      if (!textEl.hasAttribute(attr)) {
        textEl.setAttribute(attr, defaultValue)
      }
    }
  })
}

// --- compat resolution -----------------------------------------------------
// `svgMode: "compat"` produces an SVG that renders identically in non-browser
// engines (resvg, Skia, pdfmake, Inkscape, PowerPoint), which silently ignore
// browser-only SVG features. Each pass below resolves one to an absolute value.

/**
 * Resolve relative `font-size` (`%`, `em`) to px against the inherited size —
 * otherwise stereotypes (`font-size="85%"`) balloon over the class title. Walks
 * depth-first carrying the resolved px; runs after ensureTextFontDefaults so
 * every <text> already has a px size to inherit.
 */
function resolveRelativeFontSizes(
  el: Element,
  inheritedPx = DEFAULT_FONT_SIZE
) {
  let resolvedPx = inheritedPx
  const raw = el.getAttribute("font-size")?.trim()
  const match = raw?.match(/^(\d*\.?\d+)(%|em|px)?$/)
  if (match) {
    const value = parseFloat(match[1])
    if (match[2] === "%") resolvedPx = (inheritedPx * value) / 100
    else if (match[2] === "em") resolvedPx = inheritedPx * value
    else resolvedPx = value
    el.setAttribute("font-size", `${resolvedPx}px`)
  }
  for (const child of Array.from(el.children)) {
    resolveRelativeFontSizes(child, resolvedPx)
  }
}

/**
 * Flatten cumulative `<tspan dy>` to absolute `y` — Skia collapses sibling
 * tspans onto one line, overlapping a stereotype with its class name. Assumes
 * the flat `<text><tspan/></text>` shape Apollon emits (no nested tspans).
 */
function resolveTspanDy(svg: Element): void {
  svg.querySelectorAll("text").forEach((textEl) => {
    let currentY = parseFloat(textEl.getAttribute("y") ?? "0") || 0
    let seenDy = false
    textEl.querySelectorAll("tspan").forEach((tspan) => {
      const y = tspan.getAttribute("y")
      if (y !== null) currentY = parseFloat(y) || currentY
      const dy = tspan.getAttribute("dy")
      if (dy !== null) {
        currentY += parseFloat(dy) || 0
        seenDy = true
      }
      if (seenDy) {
        tspan.setAttribute("y", `${currentY}`)
        tspan.removeAttribute("dy")
      }
    })
  })
}

// Browser baseline shift (em) per `dominant-baseline` value, measured against
// the bundled Inter. `middle` centres on `y`; `hanging` puts the text top near it.
const BASELINE_SHIFT_EM: Record<string, number> = {
  middle: 0.25,
  central: 0.35,
  hanging: 0.75,
}

/**
 * Resolve `dominant-baseline` to an explicit baseline `y` — non-browser engines
 * draw every label at the alphabetic baseline (too high) otherwise. Runs after
 * resolveTspanDy so tspan `y` is already absolute.
 */
function resolveDominantBaseline(svg: Element): void {
  svg.querySelectorAll("text").forEach((textEl) => {
    const baseline = textEl.getAttribute("dominant-baseline")
    const shiftEm = baseline ? BASELINE_SHIFT_EM[baseline] : undefined
    if (shiftEm === undefined) return

    const textFontSize =
      parseFloat(textEl.getAttribute("font-size") ?? "") || DEFAULT_FONT_SIZE
    const shift = (el: Element, fallbackY: number) => {
      const fontSize =
        parseFloat(el.getAttribute("font-size") ?? "") || textFontSize
      const y = parseFloat(el.getAttribute("y") ?? "") || fallbackY
      el.setAttribute("y", `${y + shiftEm * fontSize}`)
    }

    const tspans = Array.from(textEl.querySelectorAll("tspan"))
    const textY = parseFloat(textEl.getAttribute("y") ?? "0") || 0
    if (tspans.length) tspans.forEach((tspan) => shift(tspan, textY))
    else shift(textEl, 0)
    textEl.removeAttribute("dominant-baseline")
  })
}

/**
 * Replace `text-decoration="underline"` on `<text>` elements with manual
 * `<line>` siblings so the underline is visible in non-browser renderers.
 *
 * resvg 2.6.2 has a rendering bug where 3+ `text-decoration="underline"`
 * attributes across nested `<svg>` elements cause unrelated paths (particularly
 * vertical lines) to disappear. This workaround removes the problematic
 * attribute and draws explicit underline lines using `getBBox()` for accurate
 * text measurements.
 *
 * The SVG must be temporarily attached to the DOM for `getBBox()` to work.
 */
function replaceTextDecorationWithManualUnderline(svg: SVGSVGElement): void {
  const SVG_NS = "http://www.w3.org/2000/svg"
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

      // Measure the text bounding box in SVG coordinate space
      const bbox = (textEl as SVGTextElement).getBBox()

      const line = document.createElementNS(SVG_NS, "line")
      // Position the underline just below the text baseline
      const underlineY = bbox.y + bbox.height
      line.setAttribute("x1", String(bbox.x))
      line.setAttribute("x2", String(bbox.x + bbox.width))
      line.setAttribute("y1", String(underlineY))
      line.setAttribute("y2", String(underlineY))
      line.setAttribute("stroke", textEl.getAttribute("fill") || STROKE_COLOR)
      line.setAttribute("stroke-width", "1.2")

      // Insert the line as a sibling right after the text element
      textEl.parentNode?.insertBefore(line, textEl.nextSibling)
    })
  } finally {
    document.body.removeChild(svg)
    svg.style.removeProperty("position")
    svg.style.removeProperty("left")
    svg.style.removeProperty("top")
  }
}

/**
 * Embed `@font-face` CSS (typically the bundled Inter woff2 as base64) into the
 * export SVG so the document carries its own font and renders identically when
 * opened away from the editor. Inserted first so the face is declared before
 * any `<text>` references it. Idempotent: a second call is a no-op.
 */
function embedFontFaceCss(svg: SVGSVGElement, css: string): void {
  if (svg.querySelector("style[data-apollon-fonts]")) return

  const SVG_NS = "http://www.w3.org/2000/svg"
  const styleEl = document.createElementNS(SVG_NS, "style")
  styleEl.setAttribute("data-apollon-fonts", "")
  styleEl.textContent = css

  svg.insertBefore(styleEl, svg.firstChild)
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

/**
 * @internal — Exported for unit testing only. Not part of the public API.
 */
export const __testing = {
  embedFontFaceCss,
  filterRenderedElements,
  getRenderedDiagramBounds,
  extractPathPoints,
  extractStyles,
  resolveCSSVariable,
  replaceCSSVariables,
  convertStyleToAttributes,
  ensureTextFontDefaults,
  resolveRelativeFontSizes,
  resolveTspanDy,
  resolveDominantBaseline,
  removeMarkerElements,
  replaceTextDecorationWithManualUnderline,
  mergeBounds,
  getNodeBoundsFromDOM,
  getNodeOverflowBoundsFromDOM,
} as const
