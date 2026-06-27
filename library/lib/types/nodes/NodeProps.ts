import { ClassType } from "./enums"

export type DefaultNodeProps = {
  name: string
  fillColor?: string
  strokeColor?: string
  textColor?: string
}

export type ClassNodeElement = {
  id: string
} & DefaultNodeProps

/** A single partition (lane) inside an activity swimlane. */
export type SwimlaneLane = {
  id: string
  name: string
  /**
   * Lane's extent along the swimlane's primary axis, in absolute flow px. The
   * last lane is elastic (fills the remainder), so resizing the swimlane only
   * changes the last lane. Optional: lanes without it divide the space equally,
   * so existing saved swimlanes render as equal lanes until a separator moves.
   */
  size?: number
}

/**
 * Activity-partition (swimlane) container. Lanes are equal divisions along the
 * primary axis (columns when vertical, rows when horizontal). Elements dropped
 * into the swimlane become its children and move with it; which lane an element
 * belongs to is expressed by where the modeller places it, matching the UML
 * activity-partition notation where partition membership is positional rather
 * than stored per element.
 */
export type ActivitySwimlaneProps = DefaultNodeProps & {
  orientation: "vertical" | "horizontal"
  lanes: SwimlaneLane[]
}

export type ClassNodeProps = {
  methods: ClassNodeElement[]
  attributes: ClassNodeElement[]
  stereotype?: ClassType
} & DefaultNodeProps

export type ObjectNodeProps = {
  methods: ClassNodeElement[]
  attributes: ClassNodeElement[]
} & DefaultNodeProps

// A communication-diagram object is shaped identically to an object-diagram
// object; alias rather than duplicate the definition.
export type CommunicationObjectNodeProps = ObjectNodeProps

export type ComponentNodeProps = {
  isComponentHeaderShown: boolean
} & DefaultNodeProps

export type ComponentSubsystemNodeProps = {
  isComponentSubsystemHeaderShown: boolean
} & DefaultNodeProps

export type DeploymentNodeProps = {
  isComponentHeaderShown: boolean
  stereotype: string
} & DefaultNodeProps

export type DeploymentComponentProps = {
  isComponentHeaderShown: boolean
} & DefaultNodeProps

export type PetriNetPlaceProps = {
  tokens: number
  // Serialized as a string (e.g. "3", "Infinity") in persisted models.
  capacity: number | string
} & DefaultNodeProps

export type BPMNTaskType =
  | "default"
  | "user"
  | "send"
  | "receive"
  | "manual"
  | "business-rule"
  | "script"

export type BPMNMarkerType =
  | "none"
  | "parallel multi instance"
  | "sequential multi instance"
  | "loop"

export type BPMNTaskProps = DefaultNodeProps & {
  taskType: BPMNTaskType
  marker: BPMNMarkerType
}

export type BPMNStartEventType =
  | "default"
  | "message"
  | "timer"
  | "conditional"
  | "signal"

export type BPMNIntermediateEventType =
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

export type BPMNEndEventType =
  | "default"
  | "message"
  | "escalation"
  | "error"
  | "compensation"
  | "signal"
  | "terminate"

// Shared by start/intermediate/end event nodes, so eventType is the union of
// all three.
export type BPMNEventProps = DefaultNodeProps & {
  eventType: BPMNStartEventType | BPMNIntermediateEventType | BPMNEndEventType
}

export type BPMNGatewayType =
  | "complex"
  | "event-based"
  | "exclusive"
  | "inclusive"
  | "parallel"

export type BPMNGatewayProps = DefaultNodeProps & {
  gatewayType: BPMNGatewayType
}

export type BPMNSubprocessProps = DefaultNodeProps
export type BPMNTransactionProps = DefaultNodeProps
export type BPMNCallActivityProps = DefaultNodeProps
export type BPMNAnnotationProps = DefaultNodeProps
export type BPMNDataObjectProps = DefaultNodeProps
export type BPMNDataStoreProps = DefaultNodeProps
export type BPMNPoolProps = DefaultNodeProps
export type BPMNGroupProps = DefaultNodeProps

export type ReachabilityGraphMarkingProps = DefaultNodeProps & {
  isInitialMarking: boolean
}

export type SfcActionRow = DefaultNodeProps & {
  id: string
  identifier: string
}

export type SfcActionTableProps = DefaultNodeProps & {
  actionRows: SfcActionRow[]
}
export type SfcTransitionBranchNodeProps = DefaultNodeProps & {
  // Optional: persisted models created without it omit the key entirely.
  showHint?: boolean
}
