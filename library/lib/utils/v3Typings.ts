/* eslint-disable @typescript-eslint/no-explicit-any -- mirrors the legacy V3 JSON model shape (pre-typed-schema); intentionally loose at this boundary. */
import type { IPoint } from "../edges/Connection"

export type V3Selection = {
  elements: { [id: string]: boolean }
  relationships: { [id: string]: boolean }
}

export type V3UMLClassifier = {
  attributes: string[] // Array of attribute element IDs
  methods: string[] // Array of method element IDs
}

export type V3UMLDeploymentNode = {
  stereotype: string
  displayStereotype: boolean
}

export type V3UMLDeploymentComponent = {
  displayStereotype: boolean
}

export type V3UMLComponentSubsystem = {
  stereotype: string
  displayStereotype: boolean
}

export type V3UMLComponentComponent = {
  displayStereotype: boolean
}

export type V3UMLPetriNetPlace = {
  amountOfTokens: number
  capacity: number | string
}

export type V3BPMNTask = {
  taskType:
    | "default"
    | "user"
    | "send"
    | "receive"
    | "manual"
    | "business-rule"
    | "script"
  marker:
    | "none"
    | "parallel multi instance"
    | "sequential multi instance"
    | "loop"
}

export type V3BPMNGateway = {
  gatewayType:
    | "complex"
    | "event-based"
    | "exclusive"
    | "inclusive"
    | "parallel"
}

export type V3BPMNStartEvent = {
  eventType: "default" | "message" | "timer" | "conditional" | "signal"
}

export type V3BPMNIntermediateEvent = {
  eventType:
    | "default"
    | "message-catch"
    | "message-throw"
    | "timer-catch"
    | "escalation-throw"
    | "conditional-catch"
    | "link-catch"
    | "link-throw"
    | "compensation-throw"
    | "signal-catch"
    | "signal-throw"
}

export type V3BPMNEndEvent = {
  eventType:
    | "default"
    | "message"
    | "escalation"
    | "error"
    | "compensation"
    | "signal"
    | "terminate"
}

export type V3UMLReachabilityGraphMarking = {
  isInitialMarking: boolean
}

export interface V3UMLModel {
  version: string
  type: string // Loose `string` (not UMLDiagramType) to allow any type during conversion
  size: {
    width: number
    height: number
  }
  interactive: {
    elements: Record<string, boolean>
    relationships: Record<string, boolean>
  }
  elements: Record<string, V3UMLElement>
  relationships: Record<string, V3UMLRelationship>
  assessments: Record<string, V3Assessment>
}

export type V3UMLModelElementType = string

export type V3UMLModelElement = {
  id: string
  name: string
  type: V3UMLModelElementType
  owner: string | null
  bounds: { x: number; y: number; width: number; height: number }
  highlight?: string
  fillColor?: string
  strokeColor?: string
  textColor?: string
  assessmentNote?: string
}

// Union type for all V3 element types with their specific properties
export type V3UMLElement = V3UMLModelElement &
  Partial<V3UMLClassifier> &
  Partial<V3UMLDeploymentNode> &
  Partial<V3UMLDeploymentComponent> &
  Partial<V3UMLComponentSubsystem> &
  Partial<V3UMLComponentComponent> &
  Partial<V3UMLPetriNetPlace> &
  Partial<V3BPMNTask> &
  Partial<V3BPMNGateway> &
  Partial<V3BPMNStartEvent> &
  Partial<V3BPMNIntermediateEvent> &
  Partial<V3BPMNEndEvent> &
  Partial<V3UMLReachabilityGraphMarking>

export type V3UMLRelationship = V3UMLModelElement & {
  path: IPoint[]
  source: {
    element: string
    direction: string
    multiplicity?: string
    role?: string
  }
  target: {
    element: string
    direction: string
    multiplicity?: string
    role?: string
  }
  isManuallyLayouted?: boolean
  // Communication Link specific
  messages?: {
    [id: string]: {
      id: string
      name: string
      direction: "source" | "target"
    }
  }
  // BPMN specific
  flowType?: string
}

export type V3Assessment = {
  modelElementId: string
  elementType: string
  score: number
  feedback?: string
  dropInfo?: any
  label?: string
  labelColor?: string
  correctionStatus?: {
    description?: string
    status: "CORRECT" | "INCORRECT" | "NOT_VALIDATED"
  }
}

export type V3DiagramFormat = {
  id: string
  title: string
  model: V3UMLModel
  lastUpdate?: string
}

export type V3Message = {
  id: string
  name: string
  direction: "source" | "target"
}

export type V3Messages = {
  [id: string]: V3Message
}
