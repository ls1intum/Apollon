/* eslint-disable */
import { UMLModel, ApollonNode, ApollonEdge, Assessment } from "../typings"
import { UMLDiagramType } from "../types/DiagramType"
import { ClassType } from "../types/nodes/enums"
import { IPoint } from "../edges/Connection"
import {
  V3DiagramFormat,
  V3UMLModel,
  V3UMLElement,
  V3UMLRelationship,
  V3Assessment,
  V3Message,
  V3Messages,
} from "./v3Typings"
import { log } from "../logger"

import {
  ClassNodeProps,
  ObjectNodeProps,
  CommunicationObjectNodeProps,
  ComponentNodeProps,
  ComponentSubsystemNodeProps,
  DeploymentNodeProps,
  DeploymentComponentProps,
  PetriNetPlaceProps,
  BPMNTaskProps,
  BPMNGatewayProps,
  BPMNEventProps,
  ReachabilityGraphMarkingProps,
} from "../types/nodes/NodeProps"
import { MessageData } from "@/edges/EdgeProps"

interface V2DiagramFormat {
  version: string
  size: {
    width: number
    height: number
  }
  type: string
  interactive: {
    elements: string[]
    relationships: string[]
  }
  elements: V3UMLElement[]
  relationships: V3UMLRelationship[]
  assessments: V3Assessment[]
}

/**
 * Convert v2 format to v4 format
 */
export function convertV2ToV4(v2Data: V2DiagramFormat): UMLModel {
  // First convert v2 to v3 structure
  const v3Data: V3DiagramFormat = {
    id: "converted-diagram-" + Date.now(), // Generate a unique ID
    title: "Converted Diagram",
    model: {
      version: "3.0.0",
      type: v2Data.type,
      size: v2Data.size,
      interactive: {
        elements: {},
        relationships: {},
      },
      elements: {},
      relationships: {},
      assessments: {},
    },
  }

  if (v2Data.interactive?.elements) {
    v2Data.interactive.elements.forEach((id) => {
      v3Data.model.interactive.elements[id] = true
    })
  }

  if (v2Data.interactive?.relationships) {
    v2Data.interactive.relationships.forEach((id) => {
      v3Data.model.interactive.relationships[id] = true
    })
  }

  if (v2Data.elements) {
    v2Data.elements.forEach((element) => {
      v3Data.model.elements[element.id] = element
    })
  }
  if (v2Data.relationships) {
    v2Data.relationships.forEach((relationship) => {
      v3Data.model.relationships[relationship.id] = relationship
    })
  }

  if (v2Data.assessments) {
    v2Data.assessments.forEach((assessment) => {
      v3Data.model.assessments[assessment.modelElementId] = assessment
    })
  }

  return convertV3ToV4(v3Data)
}

/**
 * Check if data is in v2 format
 */
export function isV2Format(data: any): data is V2DiagramFormat {
  return (
    data &&
    data.version &&
    data.version.startsWith("2.") &&
    data.size &&
    data.type &&
    Array.isArray(data.elements) &&
    Array.isArray(data.relationships) &&
    Array.isArray(data.assessments) &&
    data.interactive &&
    Array.isArray(data.interactive.elements) &&
    Array.isArray(data.interactive.relationships) &&
    !data.model
  )
}

/**
 * Convert v3 handle directions to v4 handle IDs
 * V3 uses Direction enum, V4 uses HandleId enum
 */
export function convertV3HandleToV4(v3Handle: string): string {
  const handleMap: Record<string, string> = {
    // Main directions
    Up: "top",
    Right: "right",
    Down: "bottom",
    Left: "left",

    // Diagonal/corner handles
    Upright: "right-top",
    Upleft: "left-top",
    Downright: "right-bottom",
    Downleft: "left-bottom",

    // Handle intermediate positions if they exist in V3
    RightTop: "top-right",
    RightBottom: "bottom-right",
    LeftTop: "top-left",
    LeftBottom: "bottom-left",
  }

  return handleMap[v3Handle] || v3Handle.toLowerCase()
}

/**
 * Convert v3 node types to v4 node types
 */
export function convertV3NodeTypeToV4(v3Type: string): string {
  const typeMap: Record<string, string> = {
    // Class Diagram
    Class: "class",
    AbstractClass: "class",
    Interface: "class",
    Enumeration: "class",
    Package: "package",
    ClassAttribute: "classAttribute",
    ClassMethod: "classMethod",

    // Activity Diagram
    ActivityInitialNode: "activityInitialNode",
    ActivityFinalNode: "activityFinalNode",
    ActivityActionNode: "activityActionNode",
    ActivityObjectNode: "activityObjectNode",
    ActivityForkNode: "activityForkNode",
    ActivityForkNodeHorizontal: "activityForkNodeHorizontal",
    ActivityMergeNode: "activityMergeNode",
    ActivityDecisionNode: "activityMergeNode",
    Activity: "activity",

    // Use Case Diagram
    UseCase: "useCase",
    UseCaseActor: "useCaseActor",
    UseCaseSystem: "useCaseSystem",

    // Communication Diagram
    CommunicationObject: "communicationObjectName",

    // Component Diagram
    Component: "component",
    ComponentInterface: "componentInterface",
    Subsystem: "componentSubsystem",

    // Deployment Diagram
    DeploymentNode: "deploymentNode",
    DeploymentComponent: "deploymentComponent",
    DeploymentArtifact: "deploymentArtifact",
    DeploymentInterface: "deploymentInterface",

    // Object Diagram
    ObjectName: "objectName",
    ObjectAttribute: "objectAttribute",
    ObjectMethod: "objectMethod",

    // Petri Net
    PetriNetPlace: "petriNetPlace",
    PetriNetTransition: "petriNetTransition",

    // Reachability Graph
    ReachabilityGraphMarking: "reachabilityGraphMarking",

    // Syntax Tree
    SyntaxTreeNonterminal: "syntaxTreeNonterminal",
    SyntaxTreeTerminal: "syntaxTreeTerminal",

    // Flowchart
    FlowchartProcess: "flowchartProcess",
    FlowchartDecision: "flowchartDecision",
    FlowchartInputOutput: "flowchartInputOutput",
    FlowchartFunctionCall: "flowchartFunctionCall",
    FlowchartTerminal: "flowchartTerminal",

    // BPMN
    BPMNTask: "bpmnTask",
    BPMNGateway: "bpmnGateway",
    BPMNStartEvent: "bpmnStartEvent",
    BPMNIntermediateEvent: "bpmnIntermediateEvent",
    BPMNEndEvent: "bpmnEndEvent",
    BPMNSubprocess: "bpmnSubprocess",
    BPMNTransaction: "bpmnTransaction",
    BPMNCallActivity: "bpmnCallActivity",
    BPMNAnnotation: "bpmnAnnotation",
    BPMNDataObject: "bpmnDataObject",
    BPMNDataStore: "bpmnDataStore",
    BPMNPool: "bpmnPool",
    BPMNGroup: "bpmnGroup",

    // SFC Diagram
    SfcStart: "sfcStart",
    SfcStep: "sfcStep",
    SfcActionTable: "sfcActionTable",
    SfcTransitionBranch: "sfcTransitionBranch",
    SfcJump: "sfcJump",
    SfcPreviewSpacer: "sfcPreviewSpacer",

    // Special nodes
    ColorDescription: "colorDescription",
    TitleAndDescription: "titleAndDesctiption", // Note the typo in V4: "desctiption"
  }

  return typeMap[v3Type] || v3Type.toLowerCase()
}

/**
 * Convert v3 edge types to v4 edge types
 */
export function convertV3EdgeTypeToV4(
  v3Type: string,
  flowType?: string
): string {
  const edgeTypeMap: Record<string, string> = {
    // Class Diagram
    ClassBidirectional: "ClassBidirectional",
    ClassUnidirectional: "ClassUnidirectional",
    ClassInheritance: "ClassInheritance",
    ClassRealization: "ClassRealization",
    ClassDependency: "ClassDependency",
    ClassAggregation: "ClassAggregation",
    ClassComposition: "ClassComposition",

    // Activity Diagram
    ActivityControlFlow: "ActivityControlFlow",

    // Use Case Diagram
    UseCaseAssociation: "UseCaseAssociation",
    UseCaseInclude: "UseCaseInclude",
    UseCaseExtend: "UseCaseExtend",
    UseCaseGeneralization: "UseCaseGeneralization",

    // Communication Diagram
    CommunicationLink: "CommunicationLink",

    // Component Diagram
    ComponentDependency: "ComponentDependency",
    ComponentInterfaceProvided: "ComponentProvidedInterface",
    ComponentInterfaceRequired: "ComponentRequiredInterface",
    ComponentInterfaceRequiredQuarter: "ComponentRequiredQuarterInterface",
    ComponentInterfaceRequiredThreeQuarter:
      "ComponentRequiredThreeQuarterInterface",

    // Deployment Diagram
    DeploymentDependency: "DeploymentDependency",
    DeploymentAssociation: "DeploymentAssociation",
    DeploymentInterfaceProvided: "DeploymentProvidedInterface",
    DeploymentInterfaceRequired: "DeploymentRequiredInterface",
    DeploymentInterfaceRequiredQuarter: "DeploymentRequiredQuarterInterface",
    DeploymentInterfaceRequiredThreeQuarter:
      "DeploymentRequiredThreeQuarterInterface",

    // Object Diagram
    ObjectLink: "ObjectLink",

    // Petri Net
    PetriNetArc: "PetriNetArc",

    // Reachability Graph
    ReachabilityGraphArc: "ReachabilityGraphArc",

    // Syntax Tree
    SyntaxTreeLink: "SyntaxTreeLink",

    // Flowchart
    FlowchartFlowline: "FlowChartFlowline",
  }
  if (v3Type === "BPMNFlow" && flowType) {
    const flowTypeMap: Record<string, string> = {
      sequence: "BPMNSequenceFlow",
      message: "BPMNMessageFlow",
      association: "BPMNAssociationFlow",
      dataAssociation: "BPMNDataAssociationFlow",
    }
    return flowTypeMap[flowType] || "BPMNSequenceFlow" // Default to sequence flow
  }

  return edgeTypeMap[v3Type] || v3Type
}

/**
 * Calculate relative position within parent bounds
 */
function calculateRelativePosition(
  child: V3UMLElement,
  parent: V3UMLElement
): { x: number; y: number } {
  return {
    x: child.bounds.x - parent.bounds.x,
    y: child.bounds.y - parent.bounds.y,
  }
}

/**
 * Convert V3 node data to V4 node data format
 */
function convertV3NodeDataToV4(
  element: V3UMLElement,
  allElements: Record<string, V3UMLElement>
): any {
  const baseData = {
    name: element.name,
    ...(element.fillColor && { fillColor: element.fillColor }),
    ...(element.strokeColor && { strokeColor: element.strokeColor }),
    ...(element.textColor && { textColor: element.textColor }),
    ...(element.highlight && { highlight: element.highlight }),
    ...(element.assessmentNote && { assessmentNote: element.assessmentNote }),
  }

  switch (element.type) {
    case "Class":
    case "AbstractClass":
    case "Interface":
    case "Enumeration": {
      const attributes: Array<{ id: string; name: string }> = []
      const methods: Array<{ id: string; name: string }> = []
      Object.values(allElements).forEach((childElement) => {
        if (childElement.owner === element.id) {
          if (childElement.type === "ClassAttribute") {
            attributes.push({
              id: childElement.id,
              name: childElement.name,
              ...(childElement.fillColor && {
                fillColor: childElement.fillColor,
              }),
              ...(childElement.textColor && {
                textColor: childElement.textColor,
              }),
            })
          } else if (childElement.type === "ClassMethod") {
            methods.push({
              id: childElement.id,
              name: childElement.name,
              ...(childElement.fillColor && {
                fillColor: childElement.fillColor,
              }),
              ...(childElement.textColor && {
                textColor: childElement.textColor,
              }),
            })
          }
        }
      })

      // Determine stereotype
      let stereotype: ClassType | undefined
      if (element.type === "AbstractClass") {
        stereotype = ClassType.Abstract
      } else if (element.type === "Interface") {
        stereotype = ClassType.Interface
      } else if (element.type === "Enumeration") {
        stereotype = ClassType.Enumeration
      }

      const classData: ClassNodeProps = {
        ...baseData,
        methods,
        attributes,
        ...(stereotype && { stereotype }),
      }
      return classData
    }

    case "ObjectName": {
      const attributes: Array<{ id: string; name: string }> = []
      const methods: Array<{ id: string; name: string }> = []

      Object.values(allElements).forEach((childElement) => {
        if (childElement.owner === element.id) {
          if (childElement.type === "ObjectAttribute") {
            attributes.push({
              id: childElement.id,
              name: childElement.name,
              ...(childElement.fillColor && {
                fillColor: childElement.fillColor,
              }),
              ...(childElement.textColor && {
                textColor: childElement.textColor,
              }),
            })
          } else if (childElement.type === "ObjectMethod") {
            methods.push({
              id: childElement.id,
              name: childElement.name,
              ...(childElement.fillColor && {
                fillColor: childElement.fillColor,
              }),
              ...(childElement.textColor && {
                textColor: childElement.textColor,
              }),
            })
          }
        }
      })

      const objectData: ObjectNodeProps = {
        ...baseData,
        methods,
        attributes,
      }
      return objectData
    }

    case "CommunicationObject": {
      const attributes: Array<{ id: string; name: string }> = []
      const methods: Array<{ id: string; name: string }> = []
      Object.values(allElements).forEach((childElement) => {
        if (childElement.owner === element.id) {
          if (childElement.type === "ObjectAttribute") {
            attributes.push({
              id: childElement.id,
              name: childElement.name,
              ...(childElement.fillColor && {
                fillColor: childElement.fillColor,
              }),
              ...(childElement.textColor && {
                textColor: childElement.textColor,
              }),
            })
          } else if (childElement.type === "ObjectMethod") {
            methods.push({
              id: childElement.id,
              name: childElement.name,
              ...(childElement.fillColor && {
                fillColor: childElement.fillColor,
              }),
              ...(childElement.textColor && {
                textColor: childElement.textColor,
              }),
            })
          }
        }
      })
      const communicationData: CommunicationObjectNodeProps = {
        ...baseData,
        methods,
        attributes,
      }
      return communicationData
    }

    case "Component": {
      const componentData: ComponentNodeProps = {
        ...baseData,
        isComponentHeaderShown: element.displayStereotype !== false,
      }
      return componentData
    }

    case "ComponentSubsystem": {
      const subsystemData: ComponentSubsystemNodeProps = {
        ...baseData,
        isComponentSubsystemHeaderShown: element.displayStereotype !== false,
      }
      return subsystemData
    }

    case "DeploymentNode": {
      const deploymentData: DeploymentNodeProps = {
        ...baseData,
        isComponentHeaderShown: element.displayStereotype !== false,
        stereotype: element.stereotype || "",
      }
      return deploymentData
    }

    case "DeploymentComponent": {
      const deploymentComponentData: DeploymentComponentProps = {
        ...baseData,
        isComponentHeaderShown: element.displayStereotype !== false,
      }
      return deploymentComponentData
    }

    case "PetriNetPlace": {
      let capacity: number | "Infinity" = "Infinity"
      if (element.capacity !== undefined) {
        if (typeof element.capacity === "number") {
          capacity = element.capacity
        } else if (typeof element.capacity === "string") {
          if (element.capacity === "Infinity" || element.capacity === "∞") {
            capacity = "Infinity"
          } else {
            const parsed = parseFloat(element.capacity)
            capacity = isNaN(parsed) ? "Infinity" : parsed
          }
        }
      }

      const petriNetData: PetriNetPlaceProps = {
        ...baseData,
        tokens: element.amountOfTokens || 0,
        capacity,
      }
      return petriNetData
    }

    case "BPMNTask": {
      const bpmnTaskData: BPMNTaskProps = {
        ...baseData,
        taskType: (element.taskType as any) || "default",
        marker: (element.marker as any) || "none",
      }
      return bpmnTaskData
    }

    case "BPMNGateway": {
      const bpmnGatewayData: BPMNGatewayProps = {
        ...baseData,
        gatewayType: (element.gatewayType as any) || "exclusive",
      }
      return bpmnGatewayData
    }

    case "BPMNStartEvent": {
      const bpmnStartEventData: BPMNEventProps = {
        ...baseData,
        eventType: (element.eventType as any) || "default",
      }
      return bpmnStartEventData
    }

    case "BPMNIntermediateEvent": {
      const bpmnIntermediateEventData: BPMNEventProps = {
        ...baseData,
        eventType: (element.eventType as any) || "default",
      }
      return bpmnIntermediateEventData
    }

    case "BPMNEndEvent": {
      const bpmnEndEventData: BPMNEventProps = {
        ...baseData,
        eventType: (element.eventType as any) || "default",
      }
      return bpmnEndEventData
    }

    case "ReachabilityGraphMarking": {
      const reachabilityData: ReachabilityGraphMarkingProps = {
        ...baseData,
        isInitialMarking: element.isInitialMarking || false,
      }
      return reachabilityData
    }

    // For other BPMN elements that just need base data
    case "BPMNSubprocess":
    case "BPMNTransaction":
    case "BPMNCallActivity":
    case "BPMNAnnotation":
    case "BPMNDataObject":
    case "BPMNDataStore":
    case "BPMNPool":
    case "BPMNGroup":
      return baseData

    default:
      // For all other node types, return base data
      return baseData
  }
}
/**
 * Convert V3 messages format to V4 MessageData array
 */
export function convertV3MessagesToV4(
  messages: V3Messages | MessageData[] | undefined
): MessageData[] {
  if (!messages) {
    return []
  }

  // If already V4 format (array), return as is
  if (Array.isArray(messages)) {
    return messages as MessageData[]
  }

  // If V3 format (object with IDs), convert to array
  if (typeof messages === "object" && messages !== null) {
    return Object.values(messages).map((message: V3Message) => ({
      text: message.name,
      direction: message.direction === "source" ? "target" : "source",
      id: message.id,
    }))
  }

  return []
}

/**
 * Convert v3 element to v4 node
 */
function convertV3ElementToV4Node(
  element: V3UMLElement,
  allElements: Record<string, V3UMLElement>
): ApollonNode {
  let position = { x: element.bounds.x, y: element.bounds.y }
  if (element.owner) {
    const parent = allElements[element.owner]
    if (parent) {
      position = calculateRelativePosition(element, parent)
    }
  }

  const data = convertV3NodeDataToV4(element, allElements)

  const baseNode: ApollonNode = {
    id: element.id,
    type: convertV3NodeTypeToV4(element.type) as any,
    position,
    width: element.bounds.width,
    height: element.bounds.height,
    measured: {
      width: element.bounds.width,
      height: element.bounds.height,
    },
    data,
    ...(element.owner && { parentId: element.owner }),
  }

  return baseNode
}

/**
 * Convert v3 relationship to v4 edge
 */
function convertV3RelationshipToV4Edge(
  relationship: V3UMLRelationship
): ApollonEdge {
  const edgeType = convertV3EdgeTypeToV4(
    relationship.type,
    relationship.flowType
  )
  let points: IPoint[] = []
  if (relationship.path && relationship.path.length > 0) {
    points = relationship.path.map((point) => ({
      x: point.x + relationship.bounds.x,
      y: point.y + relationship.bounds.y,
    }))
  }

  const edge: ApollonEdge = {
    id: relationship.id,
    source: relationship.source.element,
    target: relationship.target.element,
    type: edgeType as any,
    sourceHandle: convertV3HandleToV4(relationship.source.direction || ""),
    targetHandle: convertV3HandleToV4(relationship.target.direction || ""),
    data: {
      label: relationship.name || "",
      sourceMultiplicity: relationship.source.multiplicity || "",
      targetMultiplicity: relationship.target.multiplicity || "",
      sourceRole: relationship.source.role || "",
      targetRole: relationship.target.role || "",
      isManuallyLayouted: relationship.isManuallyLayouted || false,
      messages: convertV3MessagesToV4(relationship.messages),
      // Preserve flowType for BPMN edges
      ...(relationship.flowType && { flowType: relationship.flowType }),
      // Visual properties
      ...(relationship.fillColor && { fillColor: relationship.fillColor }),
      ...(relationship.strokeColor && {
        strokeColor: relationship.strokeColor,
      }),
      ...(relationship.textColor && { textColor: relationship.textColor }),
      ...(relationship.highlight && { highlight: relationship.highlight }),
      ...(relationship.assessmentNote && {
        assessmentNote: relationship.assessmentNote,
      }),
      points: points,
    },
  }

  return edge
}

/**
 * Convert V3 assessment to V4 assessment
 */
function convertV3AssessmentToV4(v3Assessment: V3Assessment): Assessment {
  return {
    modelElementId: v3Assessment.modelElementId,
    elementType: v3Assessment.elementType as any, // This needs proper typing
    score: v3Assessment.score,
    ...(v3Assessment.feedback && { feedback: v3Assessment.feedback }),
    ...(v3Assessment.dropInfo && { dropInfo: v3Assessment.dropInfo }),
    ...(v3Assessment.label && { label: v3Assessment.label }),
    ...(v3Assessment.labelColor && { labelColor: v3Assessment.labelColor }),
    ...(v3Assessment.correctionStatus && {
      correctionStatus: v3Assessment.correctionStatus,
    }),
  }
}

/**
 * Main conversion function from v3 to v4 format
 */
export function convertV3ToV4(v3Data: V3DiagramFormat | V3UMLModel): UMLModel {
  // Support both wrapped and flat V3 shapes
  const model: V3UMLModel =
    (v3Data as V3DiagramFormat).model || (v3Data as V3UMLModel)
  const id = (v3Data as V3DiagramFormat).id || "converted-diagram-" + Date.now()
  const title = (v3Data as V3DiagramFormat).title || ""

  const nodes: ApollonNode[] = Object.values(model.elements)
    .filter(
      (element) =>
        ![
          "ClassAttribute",
          "ClassMethod",
          "ObjectAttribute",
          "ObjectMethod",
        ].includes(element.type)
    )
    .map((element) => convertV3ElementToV4Node(element, model.elements))

  const edges: ApollonEdge[] = Object.values(model.relationships).map(
    (relationship) => convertV3RelationshipToV4Edge(relationship)
  )

  const assessments: Record<string, Assessment> = {}
  if (model.assessments) {
    Object.entries(model.assessments).forEach(([id, v3Assessment]) => {
      try {
        assessments[id] = convertV3AssessmentToV4(v3Assessment)
      } catch (error) {
        log.warn(`Failed to convert assessment for element ${id}:`, error)
      }
    })
  }

  return {
    version: "4.0.0",
    id,
    title,
    type: model.type as UMLDiagramType,
    nodes,
    edges,
    assessments,
  }
}

/**
 * Check if data is in v3 format
 */
export function isV3Format(data: any): data is V3DiagramFormat {
  // Accept both wrapped ({ id, title, model: V3UMLModel }) and flat V3 model
  const wrapped =
    data &&
    data.model &&
    data.model.version &&
    typeof data.model.version === "string" &&
    data.model.version.startsWith("3.") &&
    data.model.elements &&
    data.model.relationships &&
    typeof data.model.elements === "object" &&
    typeof data.model.relationships === "object"

  const flat =
    data &&
    data.version &&
    typeof data.version === "string" &&
    data.version.startsWith("3.") &&
    data.elements &&
    data.relationships &&
    typeof data.elements === "object" &&
    typeof data.relationships === "object"

  return !!(wrapped || flat)
}

/**
 * Check if data is in v4 format
 */
export function isV4Format(data: any): data is UMLModel {
  return (
    data &&
    data.version &&
    data.version.startsWith("4.") &&
    Array.isArray(data.nodes) &&
    Array.isArray(data.edges)
  )
}

/**
 * Universal import function that handles v2, v3 and v4 formats
 */
export function importDiagram(data: any | V3UMLModel): UMLModel {
  if (isV4Format(data)) {
    return data
  }

  if (isV3Format(data)) {
    return convertV3ToV4(data)
  }

  if (isV2Format(data)) {
    return convertV2ToV4(data)
  }

  if (data.model) {
    //playground
    return importDiagram(data.model)
  }

  throw new Error(
    "Unsupported diagram format. Only 2.x.x, 3.x.x and 4.x.x formats are supported."
  )
}
