import {
  ApollonEditor,
  buildServerRenderHandles,
  importDiagram,
  type UMLModel,
  type SVG,
} from "@tumaet/apollon"
import { findUnsupportedLabels } from "./glyph-coverage.js"
import { assertValidNodeGeometry } from "./node-geometry.js"

export class ConversionService {
  // SSR cannot measure handle geometry, so inject the handles the React Flow
  // renderer needs. They are derived from the library's connection-anchor model
  // (the single source of truth the editor also renders from), so an exported
  // edge resolves to the exact point shown on the canvas — including the
  // referenced anchor of every edge touching the node. Node dimensions are NOT
  // fabricated — assertValidNodeGeometry guarantees they are present and
  // positive before we get here.
  private normalizeModelForServerRender = (model: UMLModel): UMLModel => {
    type NodeWithHandles = UMLModel["nodes"][number] & {
      handles?: unknown
    }

    // Anchor ids each node's edges reference, so every saved endpoint is backed
    // by an SSR handle (mirrors the editor's ConnectHandles addressable anchors).
    const anchorIdsByNode = new Map<string, Set<string>>()
    const remember = (
      nodeId: string | undefined,
      handle: string | null | undefined
    ) => {
      if (!nodeId || !handle) return
      const set = anchorIdsByNode.get(nodeId) ?? new Set<string>()
      set.add(handle)
      anchorIdsByNode.set(nodeId, set)
    }
    for (const edge of model.edges ?? []) {
      remember(edge.source, edge.sourceHandle)
      remember(edge.target, edge.targetHandle)
    }

    return {
      ...model,
      nodes: model.nodes.map((node) => {
        const n = node as NodeWithHandles
        return {
          ...node,
          handles:
            n.handles ??
            buildServerRenderHandles({
              nodeType: node.type,
              width: node.width,
              height: node.height,
              anchorIds: [...(anchorIdsByNode.get(node.id) ?? [])],
            }),
        }
      }),
      edges: (model.edges ?? []).map((edge, index) => ({
        ...edge,
        id:
          edge.id ??
          `${edge.source ?? "source"}-${edge.target ?? "target"}-${index}`,
        sourceHandle: edge.sourceHandle ?? "r:0.500",
        targetHandle: edge.targetHandle ?? "l:0.500",
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
