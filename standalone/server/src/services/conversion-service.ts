/**
 * Server-side SVG export pipeline for the Apollon library running under
 * JSDOM. Used by the conversion-renderer (PNG via resvg-js, PDF via
 * svg2pdf+jsPDF) and ultimately by the Artemis exam-integrity flow.
 *
 * Performance shape: every shim and module load runs **once** at module
 * import time, not per-render. This means the worker thread that imports
 * us pays the boot cost when it's spawned (in parallel with whatever else
 * the main process is doing) and every subsequent message processes in
 * tens of milliseconds rather than seconds.
 */
import "global-jsdom/register"
import type { UMLModel, SVG } from "@tumaet/apollon"

// ---------------------------------------------------------------------------
// One-time JSDOM polyfills (module load).
// ---------------------------------------------------------------------------

if (typeof globalThis.ResizeObserver === "undefined") {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver
}

if (typeof window !== "undefined") {
  if (typeof window.requestAnimationFrame !== "function") {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(
        () => cb(Date.now()),
        16
      ) as unknown as number) as typeof window.requestAnimationFrame
  }
  if (typeof window.cancelAnimationFrame !== "function") {
    window.cancelAnimationFrame = ((id: number) =>
      clearTimeout(
        id as unknown as NodeJS.Timeout
      )) as typeof window.cancelAnimationFrame
  }
  // jsdom doesn't implement getBBox. Apollon's bounds calculation calls it
  // for every <text>/<tspan> when computing the export viewBox; returning a
  // constant 10×10 makes the library *under-size* the diagram so wider
  // stereotype labels (e.g. «Enumeration») get clipped at the page edge in
  // the resulting PDF/PNG.
  //
  // We approximate text metrics from font-size + character count using the
  // average Inter-bold glyph width (~0.6 em). Exact metrics would require
  // shaping; this is close enough to keep every label on-page across all
  // 13 Apollon diagram types we ship.
  const INTER_AVG_GLYPH_EM = 0.6
  ;(
    window.SVGElement.prototype as unknown as {
      getBBox: (this: SVGElement) => DOMRect
    }
  ).getBBox = function (this: SVGElement): DOMRect {
    const tag = this.tagName?.toLowerCase()
    if (tag === "text" || tag === "tspan") {
      const text = this.textContent ?? ""
      const fontSizeAttr = this.getAttribute("font-size") ?? "16"
      const fontSize = Number.parseFloat(fontSizeAttr) || 16
      // Bold weights are slightly wider, but svg2pdf's downstream measurer
      // adds its own padding so we don't double-correct.
      const width = text.length * fontSize * INTER_AVG_GLYPH_EM
      const height = fontSize * 1.2
      return { x: 0, y: 0, width, height } as DOMRect
    }
    return { x: 0, y: 0, width: 10, height: 10 } as DOMRect
  }
}

// ---------------------------------------------------------------------------
// Eager Apollon library load. Top-level `require` so the cost is paid at
// worker spawn, not on the first user request.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ApollonEditor, importDiagram } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@tumaet/apollon") as typeof import("@tumaet/apollon")

// ---------------------------------------------------------------------------
// Server-render normalisation.
//
// Without a browser, React Flow can't measure node geometry; we inject
// sensible defaults so the SVG export doesn't NaN. Pure: no allocation per
// node beyond what the result holds.
// ---------------------------------------------------------------------------

const EDGE_ENDPOINT_INSET_PX = -3
const DEFAULT_NODE_WIDTH = 100
const DEFAULT_NODE_HEIGHT = 50

function calculateAdjustedQuarter(value: number): number {
  return Math.floor(value / 4 / 10) * 10
}

function createDefaultHandles(width: number, height: number) {
  const adjustedWidth = calculateAdjustedQuarter(width)
  const adjustedHeight = calculateAdjustedQuarter(height)
  const inset = EDGE_ENDPOINT_INSET_PX

  const baseHandles = [
    { id: "top-left", position: "top", x: adjustedWidth, y: inset },
    { id: "top", position: "top", x: width / 2, y: inset },
    { id: "top-right", position: "top", x: width - adjustedWidth, y: inset },
    { id: "right-top", position: "right", x: width - inset, y: adjustedHeight },
    { id: "right", position: "right", x: width - inset, y: height / 2 },
    {
      id: "right-bottom",
      position: "right",
      x: width - inset,
      y: height - adjustedHeight,
    },
    {
      id: "bottom-right",
      position: "bottom",
      x: width - adjustedWidth,
      y: height - inset,
    },
    { id: "bottom", position: "bottom", x: width / 2, y: height - inset },
    {
      id: "bottom-left",
      position: "bottom",
      x: adjustedWidth,
      y: height - inset,
    },
    {
      id: "left-bottom",
      position: "left",
      x: inset,
      y: height - adjustedHeight,
    },
    { id: "left", position: "left", x: inset, y: height / 2 },
    { id: "left-top", position: "left", x: inset, y: adjustedHeight },
  ]

  return baseHandles.flatMap((handle) => [
    { ...handle, type: "source", width: 1, height: 1 },
    { ...handle, type: "target", width: 1, height: 1 },
  ])
}

function normalizeModelForServerRender(model: UMLModel): UMLModel {
  if (!model || !model.nodes) {
    throw new Error("Invalid model: missing nodes property")
  }
  return {
    ...model,
    nodes: model.nodes.map((node) => {
      const width = node.width ?? DEFAULT_NODE_WIDTH
      const height = node.height ?? DEFAULT_NODE_HEIGHT
      return {
        ...node,
        width,
        height,
        measured: {
          width: node.measured?.width ?? width,
          height: node.measured?.height ?? height,
        },
        handles:
          (node as { handles?: unknown }).handles ??
          createDefaultHandles(width, height),
      }
    }),
    edges: (model.edges ?? []).map((edge, index) => ({
      ...edge,
      id:
        edge.id ??
        `${edge.source ?? "source"}-${edge.target ?? "target"}-${index}`,
      sourceHandle: edge.sourceHandle ?? "right",
      targetHandle: edge.targetHandle ?? "left",
      data: {
        ...(edge.data ?? {}),
        points: edge.data?.points ?? [],
      },
    })),
  }
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export async function convertModelToSvg(model: UMLModel): Promise<SVG> {
  const normalized = normalizeModelForServerRender(importDiagram(model))
  const svgExport = (await ApollonEditor.exportModelAsSvg(normalized, {
    svgMode: "compat",
  })) as SVG

  if (
    !svgExport ||
    typeof svgExport.svg !== "string" ||
    !svgExport.clip ||
    typeof svgExport.clip.width !== "number" ||
    typeof svgExport.clip.height !== "number"
  ) {
    throw new Error("Failed to extract SVG: invalid export format")
  }
  return svgExport
}
