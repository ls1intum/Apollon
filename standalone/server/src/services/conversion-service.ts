import {
  ApollonEditor,
  importDiagram,
  type UMLModel,
  type SVG,
} from "@tumaet/apollon"
import { findUnsupportedLabels } from "./glyph-coverage.js"
import { assertValidNodeGeometry } from "./node-geometry.js"

/**
 * Collapses a hidden `*-between-*` connection anchor to the visible named handle
 * on the same side (the token before `-between-`). Those between-slots are
 * resolution-only anchors the headless (JSDOM) render does not position, so
 * React Flow drops any edge bound to one with a missing-handle error and the
 * edge vanishes from the export, even though the browser editor renders it fine.
 * Every node renders the named handles, so re-anchoring keeps the edge; the
 * endpoint shifts to the side's named position, identical for the centred case.
 */
function toNamedHandle(
  handle: string | null | undefined,
  fallback: string
): string {
  const h = handle ?? fallback
  const between = h.indexOf("-between-")
  return between === -1 ? h : h.slice(0, between)
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

  // SSR cannot measure handle geometry, so inject the handles the React Flow
  // renderer needs from each node's (already-validated) real dimensions. Node
  // dimensions themselves are NOT fabricated — assertValidNodeGeometry has
  // guaranteed they are present and positive before we get here.
  private normalizeModelForServerRender = (model: UMLModel): UMLModel => {
    type NodeWithHandles = UMLModel["nodes"][number] & {
      handles?: unknown
    }
    return {
      ...model,
      nodes: model.nodes.map((node) => {
        const n = node as NodeWithHandles
        return {
          ...node,
          handles:
            n.handles ?? this.createDefaultHandles(node.width, node.height),
        }
      }),
      edges: (model.edges ?? []).map((edge, index) => ({
        ...edge,
        id:
          edge.id ??
          `${edge.source ?? "source"}-${edge.target ?? "target"}-${index}`,
        sourceHandle: toNamedHandle(edge.sourceHandle, "right"),
        targetHandle: toNamedHandle(edge.targetHandle, "left"),
        data: {
          ...(edge.data ?? {}),
          points: edge.data?.points ?? [],
        },
      })),
    }
  }

  convertToSvg = async (model: UMLModel): Promise<SVG> => {
    const imported = importDiagram(model)
    // Fail loud on corrupt geometry rather than fabricate a wrong-sized box in a
    // graded export (relayed to a 422 via the worker — see conversion-resource).
    assertValidNodeGeometry(imported)
    const normalizedModel = this.normalizeModelForServerRender(imported)

    // Integrity signal for grading: text outside the bundled Latin Inter renders
    // in a fallback face and may not match the student's editor. Surface it so a
    // grader can review such a submission rather than trust a divergent image.
    const unsupported = findUnsupportedLabels(normalizedModel)
    if (unsupported.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[apollon-export] ${unsupported.length} label(s) contain glyphs outside ` +
          `the bundled font and may not match the editor: ` +
          unsupported.slice(0, 5).join(" | ")
      )
    }

    const svgExport = (await ApollonEditor.exportModelAsSvg(normalizedModel, {
      svgMode: "compat",
    })) as SVG

    if (
      typeof svgExport?.svg === "string" &&
      typeof svgExport.clip?.width === "number" &&
      typeof svgExport.clip?.height === "number"
    ) {
      return svgExport
    }
    throw new Error("Failed to extract SVG: invalid export format")
  }
}
