/**
 * Flat, typed dictionary of the strings the editor renders itself. The library
 * ships English defaults; a host overrides any subset via `labels` (a shallow,
 * per-key merge). Strings that interpolate are functions so a translation keeps
 * control of word order.
 */
export interface ApollonLabels {
  // Zoom / history / multi-select cluster
  zoomToolbar: string
  zoomIn: string
  zoomOut: string
  fitView: string
  /** Tooltip on the % readout button. */
  resetZoom: string
  /** Accessible name of the % readout (interpolates the live zoom level). */
  zoomReadout: (percent: number) => string
  undo: string
  /** Tooltip incl. the keyboard shortcut. */
  undoHint: string
  redo: string
  redoHint: string
  multiSelection: string
  multiSelectionHint: string

  // Minimap
  miniMap: string
  showMinimap: string
  /** Tooltip on the collapsed minimap toggle. */
  showMinimapHint: string
  hideMinimap: string

  selectionActions: string
  elementPalette: string
  paletteModelView: string
  paletteSelectElementsView: string
  paletteHighlightHint: string

  // Edit popovers (shared)
  edge: string
  label: string
  type: string
  connection: string
  stereotype: string
  object: string
  source: string
  target: string
  style: string
  selectPlaceholder: string

  // Assessment feedback
  addComment: string
  points: string
  negativePointsAllowed: string
  feedback: string
  deleteAssessment: string
  deleteAssessmentFor: (name: string) => string
  assessmentFor: (type: string) => string
  nextAssessment: string
  noComment: string
  notGraded: string
  node: string
  attribute: string
  method: string
  /** Visible title for a concrete node type identifier. */
  nodeTypeLabel: (nodeType?: string) => string

  // BPMN
  startEvent: string
  intermediateEvent: string
  gateway: string
  gatewayType: string
  startType: string
  endType: string
  intermediateType: string
  taskType: string
  marker: string
  pool: string
  task: string
  endEvent: string

  // BPMN option labels (start / end / intermediate event, gateway, task type + marker)
  bpmnDefault: string
  bpmnTimer: string
  bpmnConditional: string
  bpmnSignal: string
  bpmnEscalation: string
  bpmnError: string
  bpmnCompensation: string
  bpmnTerminate: string
  bpmnMessageCatch: string
  bpmnMessageThrow: string
  bpmnTimerCatch: string
  bpmnEscalationThrow: string
  bpmnConditionalCatch: string
  bpmnLinkCatch: string
  bpmnLinkThrow: string
  bpmnCompensationThrow: string
  bpmnSignalCatch: string
  bpmnSignalThrow: string
  bpmnExclusive: string
  bpmnParallel: string
  bpmnInclusive: string
  bpmnEventBased: string
  bpmnComplex: string
  bpmnUser: string
  bpmnSend: string
  bpmnReceive: string
  bpmnManual: string
  bpmnBusinessRule: string
  bpmnScript: string
  bpmnMarkerNone: string
  bpmnParallelMultiInstance: string
  bpmnSequentialMultiInstance: string
  bpmnLoop: string

  // Petri net
  marking: string
  tokens: string
  capacity: string
  weight: string
  setFiniteCapacity: string
  setInfiniteCapacity: string

  // Syntax tree
  nonterminal: string
  terminal: string

  // Class diagram
  class: string
  classType: string
  abstractClass: string
  interface: string
  enumeration: string
  reorderAttribute: string
  newAttribute: string
  addAttribute: string
  deleteAttribute: string
  attributes: string
  reorderMethod: string
  newMethod: string
  addMethod: string
  deleteMethod: string
  methods: string
  markMethodAsAbstract: string
  unmarkMethodAsAbstract: string
  abstractMethod: string

  // Communication diagram
  messages: string
  message: string
  addMessage: string
  deleteMessage: (label: string) => string
  switchDirection: (direction: string) => string
  switchDirectionFor: (label: string, direction: string) => string
  messagePlaceholder: (index: number) => string
  messageFallbackLabel: (index: number) => string
  messageExists: string
  duplicateMessage: string

  // Activity diagram (swimlane)
  swimlane: string
  lanes: string
  reorderLane: string
  deleteLane: string
  addLane: string
  laneName: string
  defaultLaneName: (index: number) => string
  orientation: string
  orientationVertical: string
  orientationHorizontal: string
  resizeLane: string

  // Component / deployment diagram
  componentName: string
  subsystemName: string
  stereotypePlaceholder: string

  // Reachability graph
  isInitialMarking: string

  // SFC diagram
  actionTable: string
  actions: string
  id: string
  actionName: string
  condition: string
  deleteActionRow: string
  addActionRow: string
  showCrossbar: string
  negatedCondition: string

  // Edges (shared)
  edgeType: string
  swapSourceTarget: string
  multiplicityLabel: (name: string) => string
  roleLabel: (name: string) => string
  deleteEdge: string
  editEdge: string

  // Edge type option labels
  deploymentAssociation: string
  deploymentDependency: string
  providedInterface: string
  requiredInterface: string
  sequenceFlow: string
  messageFlow: string
  associationFlow: string
  dataAssociationFlow: string
  association: string
  include: string
  extend: string
  generalization: string
  biAssociation: string
  uniAssociation: string
  aggregation: string
  composition: string
  inheritance: string
  dependency: string
  realization: string

  // Style editor
  lineColor: string
  textColor: string
  fillColor: string
  namePlaceholder: string
  editColors: string
  editColorsFor: (label: string) => string
  colorPicker: (label: string) => string
  pickColor: string
  customColor: string
  custom: string
  reset: string
  /** Interpolated a11y label + tooltip for the header stereotype toggle. */
  stereotypeToggleLabel: (name: string) => string
  stereotypeToggleTooltip: (shown: boolean, name: string) => string

  // Lowercase element-kind nouns interpolated into a11y labels (color editor,
  // stereotype toggle). Split out so a translation can decline them separately.
  attributeWord: string
  methodWord: string
  classWord: string
  objectWord: string
  communicationObjectWord: string
  componentWord: string
  subsystemWord: string
  nodeWord: string
}

// Camel-case diagram prefixes stripped from a node type before humanising, so a
// popover title reads as the bare element name ("petriNetTransition" ->
// "Transition") and matches the hand-written titles on type-specific popovers.
const NODE_TYPE_DIAGRAM_PREFIXES = [
  "petriNet",
  "reachabilityGraph",
  "syntaxTree",
  "flowchart",
  "activity",
  "useCase",
  "component",
  "deployment",
  "communication",
  "bpmn",
  "sfc",
]

function defaultNodeTypeLabel(nodeType?: string): string {
  if (!nodeType) return "Element"

  const prefix = NODE_TYPE_DIAGRAM_PREFIXES.find(
    (p) => nodeType.startsWith(p) && nodeType.length > p.length
  )
  const base = prefix ? nodeType.slice(prefix.length) : nodeType

  return base
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

/** The shipped English strings — the fallback for any key a host doesn't override. */
export const DEFAULT_LABELS: ApollonLabels = Object.freeze<ApollonLabels>({
  zoomToolbar: "Zoom, history and selection controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fitView: "Fit view",
  resetZoom: "Reset zoom to 100%",
  zoomReadout: (percent) => `Zoom is ${percent}%, reset to 100%`,
  undo: "Undo",
  undoHint: "Undo (Ctrl+Z)",
  redo: "Redo",
  redoHint: "Redo (Ctrl+Y or Ctrl+Shift+Z)",
  multiSelection: "Select multiple elements",
  multiSelectionHint: "Select multiple: click elements to add or remove",
  miniMap: "Mini map",
  showMinimap: "Show minimap",
  showMinimapHint: "Show minimap (overview)",
  hideMinimap: "Hide minimap",
  selectionActions: "Selection actions",
  elementPalette: "Element palette",
  paletteModelView: "Model",
  paletteSelectElementsView: "Select Elements",
  paletteHighlightHint:
    "Click nodes or relationships to toggle whether they are interactive.",
  edge: "Edge",
  label: "Label",
  type: "Type",
  connection: "Connection",
  stereotype: "Stereotype",
  object: "Object",
  source: "Source",
  target: "Target",
  style: "Style",
  selectPlaceholder: "Select…",
  addComment: "Add a comment…",
  points: "Points",
  negativePointsAllowed: "Negative points are allowed.",
  feedback: "Feedback",
  deleteAssessment: "Delete assessment",
  deleteAssessmentFor: (name) => `Delete assessment for ${name}`,
  assessmentFor: (type) => `Assessment for ${type}`,
  nextAssessment: "Next Assessment",
  noComment: "No comment",
  notGraded: "Not graded",
  node: "Node",
  attribute: "Attribute",
  method: "Method",
  nodeTypeLabel: defaultNodeTypeLabel,
  startEvent: "Start Event",
  intermediateEvent: "Intermediate Event",
  gateway: "Gateway",
  gatewayType: "Gateway Type",
  startType: "Start Type",
  endType: "End Type",
  intermediateType: "Intermediate Type",
  taskType: "Task Type",
  marker: "Marker",
  pool: "Pool",
  task: "Task",
  endEvent: "End Event",
  bpmnDefault: "Default",
  bpmnTimer: "Timer",
  bpmnConditional: "Conditional",
  bpmnSignal: "Signal",
  bpmnEscalation: "Escalation",
  bpmnError: "Error",
  bpmnCompensation: "Compensation",
  bpmnTerminate: "Terminate",
  bpmnMessageCatch: "Message Catch",
  bpmnMessageThrow: "Message Throw",
  bpmnTimerCatch: "Timer Catch",
  bpmnEscalationThrow: "Escalation Throw",
  bpmnConditionalCatch: "Conditional Catch",
  bpmnLinkCatch: "Link Catch",
  bpmnLinkThrow: "Link Throw",
  bpmnCompensationThrow: "Compensation Throw",
  bpmnSignalCatch: "Signal Catch",
  bpmnSignalThrow: "Signal Throw",
  bpmnExclusive: "Exclusive",
  bpmnParallel: "Parallel",
  bpmnInclusive: "Inclusive",
  bpmnEventBased: "Event-based",
  bpmnComplex: "Complex",
  bpmnUser: "User",
  bpmnSend: "Send",
  bpmnReceive: "Receive",
  bpmnManual: "Manual",
  bpmnBusinessRule: "Business Rule",
  bpmnScript: "Script",
  bpmnMarkerNone: "None",
  bpmnParallelMultiInstance: "Parallel multi instance",
  bpmnSequentialMultiInstance: "Sequential multi instance",
  bpmnLoop: "Loop",
  marking: "Marking",
  tokens: "Tokens",
  capacity: "Capacity",
  weight: "Weight",
  setFiniteCapacity: "Set a finite capacity",
  setInfiniteCapacity: "Set capacity to infinite",
  nonterminal: "Nonterminal",
  terminal: "Terminal",
  class: "Class",
  classType: "Class type",
  abstractClass: "Abstract Class",
  interface: "Interface",
  enumeration: "Enumeration",
  reorderAttribute: "Reorder attribute",
  newAttribute: "New attribute",
  addAttribute: "Add attribute",
  deleteAttribute: "Delete attribute",
  attributes: "Attributes",
  reorderMethod: "Reorder method",
  newMethod: "New method",
  addMethod: "Add method",
  deleteMethod: "Delete method",
  methods: "Methods",
  markMethodAsAbstract: "Mark method as abstract",
  unmarkMethodAsAbstract: "Unmark method as abstract",
  abstractMethod: "Abstract method (italic)",
  messages: "Messages",
  message: "Message",
  addMessage: "Add message",
  deleteMessage: (label) => `Delete ${label}`,
  switchDirection: (direction) => `Switch direction: ${direction}`,
  switchDirectionFor: (label, direction) =>
    `Switch direction for ${label}: ${direction}`,
  messagePlaceholder: (index) => `Message ${index}`,
  messageFallbackLabel: (index) => `message ${index}`,
  messageExists: "This message already exists",
  duplicateMessage: "Duplicate message",
  swimlane: "Swimlane",
  lanes: "Lanes",
  reorderLane: "Reorder lane",
  deleteLane: "Delete lane",
  addLane: "Add lane",
  laneName: "Lane name",
  defaultLaneName: (index) => `Lane ${index}`,
  orientation: "Orientation",
  orientationVertical: "Vertical (columns)",
  orientationHorizontal: "Horizontal (rows)",
  resizeLane: "Resize lane",
  componentName: "Component name",
  subsystemName: "Subsystem name",
  stereotypePlaceholder: "e.g. «device»",
  isInitialMarking: "Is Initial Marking",
  actionTable: "Action Table",
  actions: "Actions",
  id: "ID",
  actionName: "Action name",
  condition: "Condition",
  deleteActionRow: "Delete action row",
  addActionRow: "Add action row",
  showCrossbar: "Show crossbar",
  negatedCondition: "Negated condition (overline)",
  edgeType: "Edge Type",
  swapSourceTarget: "Swap source and target",
  multiplicityLabel: (name) => `${name} Multiplicity`,
  roleLabel: (name) => `${name} Role`,
  deleteEdge: "Delete edge",
  editEdge: "Edit edge",
  deploymentAssociation: "Deployment Association",
  deploymentDependency: "Deployment Dependency",
  providedInterface: "Provided Interface",
  requiredInterface: "Required Interface",
  sequenceFlow: "Sequence Flow",
  messageFlow: "Message Flow",
  associationFlow: "Association Flow",
  dataAssociationFlow: "Data Association Flow",
  association: "Association",
  include: "Include",
  extend: "Extend",
  generalization: "Generalization",
  biAssociation: "Bi-Association",
  uniAssociation: "Uni-Association",
  aggregation: "Aggregation",
  composition: "Composition",
  inheritance: "Inheritance",
  dependency: "Dependency",
  realization: "Realization",
  lineColor: "Line Color",
  textColor: "Text Color",
  fillColor: "Fill Color",
  namePlaceholder: "Name",
  editColors: "Edit colors",
  editColorsFor: (label) => `Edit ${label} colors`,
  colorPicker: (label) => `${label} picker`,
  pickColor: "Pick a color",
  customColor: "Custom color",
  custom: "Custom",
  reset: "Reset",
  stereotypeToggleLabel: (name) => `${name} stereotype`,
  stereotypeToggleTooltip: (shown, name) =>
    `${shown ? "Hide" : "Show"} ${name} stereotype`,
  attributeWord: "attribute",
  methodWord: "method",
  classWord: "class",
  objectWord: "object",
  communicationObjectWord: "communication object",
  componentWord: "component",
  subsystemWord: "subsystem",
  nodeWord: "node",
})

/** Merge a host's partial overrides over the English defaults (shallow, per key). */
export const mergeLabels = (
  overrides?: Partial<ApollonLabels>
): ApollonLabels =>
  overrides ? { ...DEFAULT_LABELS, ...overrides } : DEFAULT_LABELS
