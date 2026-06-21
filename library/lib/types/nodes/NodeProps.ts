import { ClassType, ErEntityKind, ErRelationshipKind } from "./enums"

export type DefaultNodeProps = {
  name: string
  fillColor?: string
  strokeColor?: string
  textColor?: string
}

export type ClassNodeElement = {
  id: string
} & DefaultNodeProps

export type ClassNodeProps = {
  methods: ClassNodeElement[]
  attributes: ClassNodeElement[]
  stereotype?: ClassType
} & DefaultNodeProps

export type ObjectNodeProps = {
  methods: ClassNodeElement[]
  attributes: ClassNodeElement[]
} & DefaultNodeProps

export type CommunicationObjectNodeProps = {
  methods: ClassNodeElement[]
  attributes: ClassNodeElement[]
} & DefaultNodeProps

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

// Entity-Relationship (Chen) nodes. Attributes are first-class nodes (ellipses)
// connected to their owner by a link edge, exactly as Chen notation draws them.
export type ErEntityProps = DefaultNodeProps & {
  kind: ErEntityKind
}

export type ErRelationshipProps = DefaultNodeProps & {
  kind: ErRelationshipKind
}

export type ErAttributeProps = DefaultNodeProps & {
  // Combinable Chen decorations (all optional; omitted keys default to false).
  // Composite attributes need no flag — they are simply attributes that own
  // child attributes through link edges.
  isKey?: boolean // underlined name (primary key)
  isPartialKey?: boolean // dashed underline (discriminator of a weak entity)
  isMultivalued?: boolean // double ellipse
  isDerived?: boolean // dashed ellipse
}

// Crow's-foot (Mermaid / Information-Engineering) entity: a table box whose
// columns are listed as structured rows — name, data type, and key role(s) —
// matching how Mermaid `erDiagram`, DBML and physical ER tools render a table.
// `keys` is an array because a column can be both PK and FK (Mermaid's "PK, FK").
export type ErCfColumnKey = "PK" | "FK" | "UK"
export type ErCfColumn = ClassNodeElement & {
  type?: string
  keys?: ErCfColumnKey[]
}
export type ErCfEntityProps = DefaultNodeProps & {
  attributes: ErCfColumn[]
}
