import { UMLDiagramType } from "@/types/DiagramType"
import {
  ApollonEdge,
  ApollonNode,
  DiagramEdgeType,
  DiagramNodeType,
} from "@/typings"
import { type Node, type Edge } from "@xyflow/react"
const diagramTypeValues = new Set(Object.values(UMLDiagramType))

const isDiagramType = (value: unknown): value is UMLDiagramType => {
  return diagramTypeValues.has(value as UMLDiagramType)
}

export const parseDiagramType = (
  value: unknown,
  fallback: UMLDiagramType = UMLDiagramType.ClassDiagram
): UMLDiagramType => {
  return isDiagramType(value) ? value : fallback
}

export const mapFromReactFlowNodeToApollonNode = (node: Node): ApollonNode => {
  return {
    id: node.id,
    width: node.width ?? 0,
    height: node.height ?? 0,
    type: node.type! as DiagramNodeType,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
    parentId: node.parentId,
    data: node.data,
    measured: {
      width: node.measured?.width ?? 0,
      height: node.measured?.height ?? 0,
    },
  }
}

export const mapFromReactFlowEdgeToApollonEdge = (edge: Edge): ApollonEdge => {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type! as DiagramEdgeType,
    sourceHandle: edge.sourceHandle ?? "",
    targetHandle: edge.targetHandle ?? "",
    data: {
      ...edge.data,
      points: Array.isArray(edge.data?.points) ? edge.data.points : [],
    },
  }
}
