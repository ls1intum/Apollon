import "global-jsdom/register"
import path from "node:path"
import type { UMLModel, SVG } from "@tumaet/apollon"

// Mock ResizeObserver for JSDOM
if (typeof global.ResizeObserver === "undefined") {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(global as any).ResizeObserver = MockResizeObserver
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const loadApollonModuleOnce = () => {
  try {
    return require("@tumaet/apollon")
  } catch {
    const fallbackCandidates = [
      path.resolve(process.cwd(), "library/dist/index.js"),
      path.resolve(process.cwd(), "../library/dist/index.js"),
      path.resolve(process.cwd(), "../../library/dist/index.js"),
    ]

    for (const fallbackPath of fallbackCandidates) {
      try {
        return require(fallbackPath)
      } catch {
        // try next fallback
      }
    }

    throw new Error("Failed to load @tumaet/apollon module")
  }
}

const loadApollonModule = async (retries = 20, delayMs = 300) => {
  let lastError: unknown

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return loadApollonModuleOnce()
    } catch (error) {
      lastError = error
      await sleep(delayMs)
    }
  }

  throw new Error(
    `Failed to load @tumaet/apollon after ${retries} attempts: ${String(lastError)}`
  )
}

export class ConversionService {
  private readonly EDGE_ENDPOINT_INSET_PX = -3

  private calculateAdjustedQuarter = (value: number): number => {
    const quarter = value / 4
    return Math.floor(quarter / 10) * 10
  }

  private createDefaultHandles = (width: number, height: number) => {
    const adjustedWidth = this.calculateAdjustedQuarter(width)
    const adjustedHeight = this.calculateAdjustedQuarter(height)
    const inset = this.EDGE_ENDPOINT_INSET_PX

    const baseHandles = [
      { id: "top-left", position: "top", x: adjustedWidth, y: inset },
      { id: "top", position: "top", x: width / 2, y: inset },
      { id: "top-right", position: "top", x: width - adjustedWidth, y: inset },

      {
        id: "right-top",
        position: "right",
        x: width - inset,
        y: adjustedHeight,
      },
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

  /**
   * Ensures model has render-ready defaults for server-side React Flow export.
   * Server-side rendering cannot measure dimensions/handle geometry, so defaults are injected.
   */
  private normalizeModelForServerRender = (model: UMLModel): UMLModel => {
    if (!model || !model.nodes) {
      throw new Error("Invalid model: missing nodes property")
    }

    return {
      ...model,
      nodes: model.nodes.map((node) => ({
        ...node,
        width: node.width ?? 100,
        height: node.height ?? 50,
        measured: {
          width: node.measured?.width ?? node.width ?? 100,
          height: node.measured?.height ?? node.height ?? 50,
        },
        handles:
          (node as any).handles ??
          this.createDefaultHandles(node.width ?? 100, node.height ?? 50),
      })),
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

  convertToSvg = async (model: UMLModel): Promise<SVG> => {
    if (typeof window.requestAnimationFrame !== "function") {
      ;(window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
        setTimeout(() => cb(Date.now()), 16)
    }
    if (typeof window.cancelAnimationFrame !== "function") {
      ;(window as any).cancelAnimationFrame = (id: number) => clearTimeout(id)
    }

    // JSDOM does not implement getBBox; mock it to allow SVG export.
    // @ts-ignore - JSDOM does not implement getBBox.
    window.SVGElement.prototype.getBBox = () => ({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    })

    const { ApollonEditor, importDiagram } = await loadApollonModule()

    const normalizedModel = this.normalizeModelForServerRender(
      importDiagram(model)
    )
    const svgExport = (await ApollonEditor.exportModelAsSvg(normalizedModel, {
      svgMode: "compat",
    })) as SVG

    // exportModelAsSvg returns { svg: string, clip: { x, y, width, height } }
    if (
      svgExport &&
      typeof svgExport.svg === "string" &&
      svgExport.clip &&
      typeof svgExport.clip.width === "number" &&
      typeof svgExport.clip.height === "number"
    ) {
      return svgExport
    }

    throw new Error("Failed to extract SVG: invalid export format")
  }
}
