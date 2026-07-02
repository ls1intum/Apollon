/**
 * Every user-facing string the editor renders itself, as one flat, typed
 * dictionary. This is Apollon's i18n seam: the library ships English defaults and
 * a host (e.g. Artemis, which is multilingual) overrides any subset via
 * `ApollonOptions.labels` / `<Apollon labels={…}>`, so the editor's own chrome
 * speaks the host's language instead of stranding English tooltips in a localized
 * UI. Strings are plain; the few that interpolate are functions so a translation
 * keeps control of word order.
 *
 * Keys are grouped by area in the comments but kept FLAT so overriding is a shallow
 * merge (no deep-merge surprises) and every key is individually replaceable.
 */
export interface ApollonLabels {
  // Zoom / history cluster
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

  // Minimap
  showMinimap: string
  /** Tooltip on the collapsed minimap toggle. */
  showMinimapHint: string
  hideMinimap: string

  // Element palette
  elementPalette: string

  // Edit popovers (shared)
  edge: string
  label: string
  type: string
  connection: string
  stereotype: string
  object: string
  source: string
  target: string

  // Assessment feedback
  addComment: string

  // BPMN
  startEvent: string
  intermediateEvent: string
  gateway: string
  gatewayType: string
  pool: string
  task: string
  endEvent: string

  // Petri net
  marking: string
  tokens: string
  capacity: string
  weight: string

  // Syntax tree
  nonterminal: string
  terminal: string

  // Class diagram
  class: string
  reorderAttribute: string
  newAttribute: string
  addAttribute: string
  reorderMethod: string
  newMethod: string
  addMethod: string

  // Communication diagram
  messages: string
  message: string

  // Activity diagram (swimlane)
  swimlane: string
  lanes: string
  reorderLane: string
  laneName: string
  orientation: string

  // Component / deployment diagram
  componentName: string
  subsystemName: string
  stereotypePlaceholder: string

  // SFC diagram
  actionTable: string
  actions: string
  id: string
  actionName: string
  condition: string

  // Edge type select
  edgeType: string

  // Edge toolbar
  deleteEdge: string
  editEdge: string

  // Style editor
  customColor: string
}

/** The shipped English strings — the fallback for any key a host doesn't override. */
export const DEFAULT_LABELS: ApollonLabels = {
  zoomToolbar: "Zoom and history controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fitView: "Fit view",
  resetZoom: "Reset zoom to 100%",
  zoomReadout: (percent) => `Zoom is ${percent}%, reset to 100%`,
  undo: "Undo",
  undoHint: "Undo (Ctrl+Z)",
  redo: "Redo",
  redoHint: "Redo (Ctrl+Y or Ctrl+Shift+Z)",
  showMinimap: "Show minimap",
  showMinimapHint: "Show minimap (overview)",
  hideMinimap: "Hide minimap",
  elementPalette: "Element palette",
  edge: "Edge",
  label: "Label",
  type: "Type",
  connection: "Connection",
  stereotype: "Stereotype",
  object: "Object",
  source: "Source",
  target: "Target",
  addComment: "Add a comment…",
  startEvent: "Start Event",
  intermediateEvent: "Intermediate Event",
  gateway: "Gateway",
  gatewayType: "Gateway Type",
  pool: "Pool",
  task: "Task",
  endEvent: "End Event",
  marking: "Marking",
  tokens: "Tokens",
  capacity: "Capacity",
  weight: "Weight",
  nonterminal: "Nonterminal",
  terminal: "Terminal",
  class: "Class",
  reorderAttribute: "Reorder attribute",
  newAttribute: "New attribute",
  addAttribute: "Add attribute",
  reorderMethod: "Reorder method",
  newMethod: "New method",
  addMethod: "Add method",
  messages: "Messages",
  message: "Message",
  swimlane: "Swimlane",
  lanes: "Lanes",
  reorderLane: "Reorder lane",
  laneName: "Lane name",
  orientation: "Orientation",
  componentName: "Component name",
  subsystemName: "Subsystem name",
  stereotypePlaceholder: "e.g. «device»",
  actionTable: "Action Table",
  actions: "Actions",
  id: "ID",
  actionName: "Action name",
  condition: "Condition",
  edgeType: "Edge Type",
  deleteEdge: "Delete edge",
  editEdge: "Edit edge",
  customColor: "Custom color",
}

/** Merge a host's partial overrides over the English defaults (shallow, per key). */
export const mergeLabels = (
  overrides?: Partial<ApollonLabels>
): ApollonLabels =>
  overrides ? { ...DEFAULT_LABELS, ...overrides } : DEFAULT_LABELS
