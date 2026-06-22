/**
 * Central, immutable constants for Apollon.
 * Grouped by domain, deep-frozen. Import from "@/constants".
 */
import React from "react"
import { FONT_FAMILY, DEFAULT_FONT_SIZE } from "@/fontStack"
import {
  ActivityActionNodeSVG,
  ActivityFinalNodeSVG,
  ActivityForkNodeHorizontalSVG,
  ActivityForkNodeSVG,
  ActivityInitialNodeSVG,
  ActivityMergeNodeSVG,
  ActivityObjectNodeSVG,
  ActivitySVG,
  ActivitySwimlaneSVG,
  ClassSVG,
  PackageSVG,
  UseCaseNodeSVG,
  UseCaseSystemNodeSVG,
  UseCaseActorNodeSVG,
  ComponentNodeSVG,
  ComponentInterfaceNodeSVG,
  ComponentSubsystemNodeSVG,
  FlowchartTerminalNodeSVG,
  FlowchartProcessNodeSVG,
  FlowchartDecisionNodeSVG,
  FlowchartInputOutputNodeSVG,
  FlowchartFunctionCallNodeSVG,
  DeploymentNodeSVG,
  DeploymentComponentSVG,
  DeploymentArtifactSVG,
  DeploymentInterfaceSVG,
  SyntaxTreeNonterminalNodeSVG,
  SyntaxTreeTerminalNodeSVG,
  ObjectNameSVG,
  CommunicationObjectNameSVG,
  PetriNetPlaceSVG,
  PetriNetTransitionSVG,
  BPMNTaskNodeSVG,
  BPMNEventNodeSVG,
  BPMNGatewayNodeSVG,
  BPMNSubprocessNodeSVG,
  BPMNAnnotationNodeSVG,
  BPMNDataObjectNodeSVG,
  BPMNDataStoreNodeSVG,
  BPMNPoolNodeSVG,
  BPMNGroupNodeSVG,
  ColorDescriptionSVG,
  SfcStartNodeSVG,
  SfcStepNodeSVG,
  SfcJumpNodeSVG,
  SfcTransitionBranchNodeSVG,
  SfcActionTableNodeSVG,
} from "@/components"
import { ReachabilityGraphMarkingSVG } from "@/components/svgs/nodes/reachabilityGraphDiagram/ReachabilityGraphMarkingSVG"
import { DiagramNodeType } from "@/nodes"
import { ClassType, UMLDiagramType } from "@/types"
import { v4 as uuidv4 } from "uuid"

/* -------------------------------------------------------------------------- */
/* Canvas                                                                     */
/* -------------------------------------------------------------------------- */
export const CANVAS = Object.freeze({
  MIN_SCALE_TO_ZOOM_OUT: 0.4,
  MAX_SCALE_TO_ZOOM_IN: 2.5,
  MOUSE_UP_OFFSET_PX: 5,
  SNAP_TO_GRID_PX: 5,
  EXTRA_SPACE_FOR_EXTENSION: 10,
  PASTE_OFFSET_PX: 20,
} as const)

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */
export const CSS_VARIABLE_FALLBACKS: Readonly<Record<string, string>> =
  Object.freeze({
    "--apollon-primary": "#3e8acc",
    "--apollon-primary-contrast": "#000000",
    "--apollon-secondary": "#6c757d",
    "--apollon-alert-warning-yellow": "#ffc107",
    "--apollon-alert-warning-background": "#fff3cd",
    "--apollon-alert-warning-border": "#ffeeba",
    "--apollon-interactive-selection": "#f39c12",
    "--apollon-guide-vertical": "#d63031",
    "--apollon-guide-horizontal": "#0984e3",
    "--apollon-background": "#ffffff",
    "--apollon-background-inverse": "#000000",
    "--apollon-background-variant": "#f8f9fa",
    "--apollon-gray": "#e9ecef",
    "--apollon-grid": "rgba(36, 39, 36, 0.1)",
    "--apollon-gray-variant": "#495057",
    "--apollon-alert-danger-color": "#721c24",
    "--apollon-alert-danger-background": "#f8d7da",
    "--apollon-alert-danger-border": "#f5c6cb",
    "--apollon-switch-box-border-color": "#dee2e6",
    "--apollon-list-group-color": "#ffffff",
    "--apollon-btn-outline-secondary-color": "#6c757d",
    "--apollon-modal-bottom-border": "#e9ecef",
  })

export const STROKE_COLOR = CSS_VARIABLE_FALLBACKS["--apollon-primary-contrast"]
export const FILL_COLOR = CSS_VARIABLE_FALLBACKS["--apollon-background"]

// Re-exported from the leaf module (see lib/fontStack.ts) so `@/constants`
// importers keep working.
export { FONT_FAMILY, DEFAULT_FONT_SIZE }
export const INTERACTIVE_SELECTION_COLOR = `var(--apollon-interactive-selection, ${CSS_VARIABLE_FALLBACKS["--apollon-interactive-selection"]})`
export const INTERACTIVE_SELECTION_FILL = `color-mix(in srgb, var(--apollon-interactive-selection, ${CSS_VARIABLE_FALLBACKS["--apollon-interactive-selection"]}) 18%, transparent)`

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */
export const LAYOUT = Object.freeze({
  DEFAULT_FONT: `400 ${DEFAULT_FONT_SIZE}px ${FONT_FAMILY}`,
  DEFAULT_HEADER_HEIGHT: 40,
  DEFAULT_HEADER_HEIGHT_WITH_STEREOTYPE: 50,
  DEFAULT_ATTRIBUTE_HEIGHT: 30,
  DEFAULT_METHOD_HEIGHT: 30,
  DEFAULT_PADDING: 10,
  LINE_WIDTH: 2,
  LINE_WIDTH_INTERFACE: 2,
  LINE_WIDTH_EDGE: 2,
  ICON_LINE_WIDTH: 1.5,
  /**
   * Typography tokens for wrapped node labels. `NAME_FONT_SIZE` is the shared
   * diagram text size (so measured and rendered labels agree); `NAME_LINE_HEIGHT`
   * is `round(size * 1.2)` — what pretext uses internally and what `MultilineText`
   * falls back to when no explicit line-height is passed.
   */
  NAME_FONT_SIZE: DEFAULT_FONT_SIZE,
  NAME_LINE_HEIGHT: Math.round(DEFAULT_FONT_SIZE * 1.2),
  /** Stereotype tspans like `«component»` render at 0.8em of the name font. */
  STEREOTYPE_LINE_HEIGHT: 15,
  STEREOTYPE_NAME_GAP: 4,
} as const)

/**
 * Treat narrow portrait viewports and short phone-landscape viewports as
 * mobile. The portrait bound stops just below 768px so iPads (768px portrait)
 * keep the regular desktop layout; the second clause catches phones in
 * landscape, where the short height distinguishes them from tablets.
 *
 * NOTE: mirrored in standalone/webapp/src/constants/responsive.ts (the webapp
 * can't import the library's curated public surface). Keep both in sync.
 */
export const MOBILE_VIEW_QUERY =
  "(max-width: 767.95px), (max-width: 950px) and (max-height: 500px)"

const generateUUID = () => uuidv4()

// Interface-component sizing. The flat aliases below are local-only —
// they were leaking publicly through the constants module before. Public
// consumers (and the rest of the library) should reach for `INTERFACE.*`.
const INTERFACE_SIZE = 30
const INTERFACE_RADIUS = INTERFACE_SIZE / 2
const INTERFACE_STROKE_WIDTH = 2
const INTERFACE_SOCKET_GAP = 4

export const INTERFACE = Object.freeze({
  SIZE: INTERFACE_SIZE,
  RADIUS: INTERFACE_RADIUS,
  STROKE_WIDTH: INTERFACE_STROKE_WIDTH,
  SOCKET_GAP: INTERFACE_SOCKET_GAP,
} as const)

/* -------------------------------------------------------------------------- */
/* Edges                                                                      */
/* -------------------------------------------------------------------------- */
// Base marker size. `MARKER_BASE_SIZE` scales the inline reachability-graph
// arrow against the shared MARKERS sprite; `BPMN_MARKER_SIZE` is local-only
// (used a few lines below for BPMN message markers — was incorrectly public).
export const MARKER_BASE_SIZE = 18
const BPMN_MARKER_SIZE = 11

export const EDGES = Object.freeze({
  /** Negative padding extends target point to node boundary (React Flow handles are offset 3px) */
  MARKER_PADDING: -3,
  /** Positive padding pulls source point back to node boundary (React Flow handles are offset 3px from node edge) */
  SOURCE_CONNECTION_POINT_PADDING: 3,
  /** Border radius for step-style edge corners */
  STEP_BORDER_RADIUS: 0,
  /** Width of the invisible stroke used for edge selection/highlighting */
  EDGE_HIGHLIGHT_STROKE_WIDTH: 15,
  /** Height of the line-jump bridge used when edges cross */
  EDGE_LINE_JUMP_HEIGHT: 10,
  /** Length of the line-jump bridge along the crossed segment */
  EDGE_LINE_JUMP_WIDTH: 16,
  /** Stub length locked to node, matches getSmoothStepPath offset */
  STUB_LENGTH: 30,
  /** Minimum total edge length (screen px) for the endpoint reconnect handles
   * to be active. Short edges fall back to always-editable (see
   * useStepPathEdge), so this only gates medium/long edges. */
  BEND_MIN_LENGTH: 100,
  /** Bend handle long-axis size, in screen px (the minimum kept across zoom). */
  BEND_HANDLE_SCREEN_LENGTH_PX: 34,
  /** Minimum clearance, in screen px, between a bend handle and the segment's
   * corners — how close a handle is allowed to sit to a corner. */
  BEND_HANDLE_CORNER_CLEARANCE_PX: 10,
  /** A segment shows a bend handle once its ON-SCREEN length can host the
   * handle with corner clearance on both sides: 34 + 2*10 = 54px. Screen-based
   * so zooming in reveals handles on shorter segments (and never hides them). */
  BEND_HANDLE_MIN_SEGMENT_SCREEN_PX: 34 + 2 * 10,
  /** "Safe area" next to a node, in flow px: a bend handle is never placed
   * within this distance of a node connection point, and that part of a
   * terminal segment is excluded when deciding whether a handle fits. Keeps
   * handles out of the locked stub so dragging never produces a detached
   * slim sliver near the node. */
  BEND_HANDLE_SAFE_AREA_PX: 25,
  /** Size of the invisible endpoint hit target used for edge reconnection */
  ENDPOINT_HIT_TARGET_SIZE: 24,
  /** Grid step a dragged bend snaps to; matches the canvas grid so bends line
   * up with grid-snapped node handles. */
  BEND_SNAP_GRID_PX: CANVAS.SNAP_TO_GRID_PX,
  /** Connector length at/below which a *monotonic* orthogonal stair-step (a
   * same-direction dogleg) is treated as a rounding artifact and flattened.
   * Must stay strictly below BEND_SNAP_GRID_PX, otherwise the smallest
   * deliberate single-step bend would be flattened and the edge would snap
   * back to a straight line on release. */
  ORTHOGONAL_DOGLEG_TOLERANCE_PX: 2,
  /** Gap at/below which two parallel arms that double back over each other
   * (an opposite-direction U-turn) are treated as a degenerate self-overlap
   * and the route is reset. Independent of the snap grid: a doubled-back
   * U-turn is never a deliberate edit, so this stays at the visual-merge
   * threshold rather than the per-step threshold. */
  ORTHOGONAL_ARM_OVERLAP_PX: 10,
  /** Perpendicular gap (flow px) between an edge's mid-segment line and the
   * near edge of its relationship/stereotype label. The label sits this far
   * off the line on whichever side is clearer. */
  LABEL_GAP: 14,
  /** Nominal label line height (flow px) used as the across-text depth of the
   * candidate box when scoring which side a label sits on. Constant by
   * construction — placement never measures the rendered text (mirrors the
   * messageLayout.ts invariant). */
  LABEL_LINE_HEIGHT: 14,
  /** Nominal half-width (flow px) of a label along its text axis, used only to
   * build the candidate box for side scoring. Coarse on purpose: we choose a
   * side, not a pixel-perfect fit. */
  LABEL_NOMINAL_HALF_EXTENT: 40,
} as const)

/* -------------------------------------------------------------------------- */
/* Z-Index                                                                    */
/* -------------------------------------------------------------------------- */
export const ZINDEX = Object.freeze({
  BASE: 0,
  HEADER_SWITCH: 1,
  DRAGGABLE_GHOST: 2,
  MINIMAP: 5,
  PANEL: 10,
  MODAL: 9998,
  LABEL: 9998,
  DRAGGABLE_ELEMENT: 9999,
  TOOLTIP: 10000,
} as const)

/* -------------------------------------------------------------------------- */
/* Markers                                                                    */
/* -------------------------------------------------------------------------- */
export type MarkerShape =
  | "triangle"
  | "arrow"
  | "rhombus"
  | "circle"
  | "semicircle"

export interface MarkerConfig {
  readonly type: MarkerShape
  readonly filled: boolean
  readonly size: number
  readonly widthFactor: number
  readonly heightFactor: number
  readonly arcSpanDegrees?: number // Only for semicircle type: arc span in degrees
}

// Interface socket markers - radius derived from INTERFACE.RADIUS
const INTERFACE_SOCKET_SIZE = INTERFACE_RADIUS // Must equal INTERFACE.SIZE / 2

export const MARKER_CONFIGS = Object.freeze({
  // Class diagram markers - golden ratio inspired proportions
  "black-rhombus": {
    type: "rhombus",
    filled: true,
    size: MARKER_BASE_SIZE,
    widthFactor: 1.0,
    heightFactor: 0.618,
  },
  "white-rhombus": {
    type: "rhombus",
    filled: false,
    size: MARKER_BASE_SIZE,
    widthFactor: 1.0,
    heightFactor: 0.618,
  },
  "white-triangle": {
    type: "triangle",
    filled: false,
    size: MARKER_BASE_SIZE,
    widthFactor: 1.0,
    heightFactor: 0.866,
  },
  "black-triangle": {
    type: "triangle",
    filled: true,
    size: MARKER_BASE_SIZE,
    widthFactor: 1.0,
    heightFactor: 0.866,
  },
  "black-arrow": {
    type: "arrow",
    filled: false,
    size: MARKER_BASE_SIZE,
    widthFactor: 1.0,
    heightFactor: 0.866,
  },
  // Component/Deployment diagram - interface socket
  // Size = interface radius so arc perfectly overlaps the interface circle
  "required-interface": {
    type: "semicircle",
    filled: false,
    size: INTERFACE_SOCKET_SIZE,
    widthFactor: 1,
    heightFactor: 1,
    arcSpanDegrees: 150,
  },
  "required-interface-quarter": {
    type: "semicircle",
    filled: false,
    size: INTERFACE_SOCKET_SIZE,
    widthFactor: 1,
    heightFactor: 1,
    arcSpanDegrees: 90,
  },
  "required-interface-threequarter": {
    type: "semicircle",
    filled: false,
    size: INTERFACE_SOCKET_SIZE,
    widthFactor: 1,
    heightFactor: 1,
    arcSpanDegrees: 270,
  },
  // BPMN markers - compact style
  "bpmn-white-triangle": {
    type: "triangle",
    filled: false,
    size: BPMN_MARKER_SIZE,
    widthFactor: 1.0,
    heightFactor: 0.866,
  },
  "bpmn-black-triangle": {
    type: "triangle",
    filled: true,
    size: BPMN_MARKER_SIZE,
    widthFactor: 1.0,
    heightFactor: 0.866,
  },
  "bpmn-white-circle": {
    type: "circle",
    filled: false,
    size: BPMN_MARKER_SIZE,
    widthFactor: 1,
    heightFactor: 1,
  },
  "bpmn-arrow": {
    type: "arrow",
    filled: false,
    size: BPMN_MARKER_SIZE,
    widthFactor: 1.0,
    heightFactor: 0.866,
  },
} as const satisfies Record<string, MarkerConfig>)

export type MarkerId = keyof typeof MARKER_CONFIGS

export const MARKERS = Object.freeze({
  STROKE_WIDTH: Object.freeze({
    triangle: 1.3,
    arrow: 1.5,
    rhombus: 1.3,
    circle: 1.3,
    semicircle: 2, // Must match INTERFACE.STROKE_WIDTH for pixel-perfect alignment
  } as const satisfies Record<MarkerShape, number>),
} as const)

/* -------------------------------------------------------------------------- */
/* Sidebar / Palette                                                          */
/* -------------------------------------------------------------------------- */
export const DROPS = Object.freeze({
  SIDEBAR_PREVIEW_SCALE: 0.8,
  DEFAULT_ELEMENT_WIDTH: 160,
} as const)

export type DropElementConfig = {
  readonly type: DiagramNodeType
  readonly width: number
  readonly height: number
  /** Size of the node when dropped on the canvas, if it should differ from the
   * sidebar preview size (`width`/`height`). Lets a large element preview small
   * in the palette without shrinking the rest of the picker. */
  readonly dropWidth?: number
  readonly dropHeight?: number
  readonly defaultData?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly svg: React.FC<any>
  readonly marginTop?: number
}

export const dropElementConfigs: Readonly<
  Record<UMLDiagramType, ReadonlyArray<DropElementConfig>>
> = Object.freeze({
  [UMLDiagramType.ClassDiagram]: [
    {
      type: "package",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 120,
      defaultData: { name: "Package" },
      svg: PackageSVG,
    },
    {
      type: "class",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 100,
      defaultData: {
        name: "Class",
        methods: [{ id: generateUUID(), name: "+ method()" }],
        attributes: [{ id: generateUUID(), name: "+ attribute: Type" }],
      },
      svg: ClassSVG,
    },
    {
      type: "class",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 110,
      defaultData: {
        name: "Abstract",
        stereotype: ClassType.Abstract,
        methods: [{ id: generateUUID(), name: "+ method()" }],
        attributes: [{ id: generateUUID(), name: "+ attribute: Type" }],
      },
      svg: ClassSVG,
    },
    {
      type: "class",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 140,
      defaultData: {
        name: "Enumeration",
        stereotype: ClassType.Enumeration,
        methods: [],
        attributes: [
          { id: generateUUID(), name: "Case 1" },
          { id: generateUUID(), name: "Case 2" },
          { id: generateUUID(), name: "Case 3" },
        ],
      },
      svg: ClassSVG,
    },
    {
      type: "class",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 110,
      defaultData: {
        name: "Interface",
        stereotype: ClassType.Interface,
        methods: [{ id: generateUUID(), name: "+ method()" }],
        attributes: [{ id: generateUUID(), name: "+ attribute: Type" }],
      },
      svg: ClassSVG,
    },
  ],
  [UMLDiagramType.ObjectDiagram]: [
    {
      type: "objectName",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 70,
      defaultData: {
        name: "Object",
        attributes: [{ id: generateUUID(), name: "attribute = value" }],
        methods: [],
      },
      svg: ObjectNameSVG,
    },
  ],
  [UMLDiagramType.ActivityDiagram]: [
    {
      type: "activity",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 120,
      defaultData: { name: "Activity" },
      svg: ActivitySVG,
    },
    {
      type: "activityInitialNode",
      width: 50,
      height: 50,
      defaultData: { name: "ActivityInitialNode" },
      svg: ActivityInitialNodeSVG,
    },
    {
      type: "activityFinalNode",
      width: 50,
      height: 50,
      defaultData: { name: "ActivityFinalNode" },
      svg: ActivityFinalNodeSVG,
    },
    {
      type: "activityActionNode",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 120,
      defaultData: { name: "Action" },
      svg: ActivityActionNodeSVG,
    },
    {
      type: "activityObjectNode",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 120,
      defaultData: { name: "Object" },
      svg: ActivityObjectNodeSVG,
    },
    {
      type: "activityMergeNode",
      width: DROPS.DEFAULT_ELEMENT_WIDTH,
      height: 120,
      defaultData: { name: "Condition" },
      svg: ActivityMergeNodeSVG,
    },
    {
      type: "activityForkNode",
      width: 20,
      height: 100,
      defaultData: { name: "Fork" },
      svg: ActivityForkNodeSVG,
    },
    {
      type: "activityForkNodeHorizontal",
      width: 100,
      height: 20,
      defaultData: { name: "Fork" },
      svg: ActivityForkNodeHorizontalSVG,
    },
    {
      type: "activitySwimlane",
      // Preview small (the picker shares one Math.min scale, so a big item
      // shrinks every sibling) but drop a properly sized swimlane on the canvas.
      width: 160,
      height: 100,
      dropWidth: 400,
      dropHeight: 240,
      defaultData: {
        name: "",
        orientation: "vertical",
        lanes: [
          { id: "lane-1", name: "Lane 1" },
          { id: "lane-2", name: "Lane 2" },
        ],
      },
      svg: ActivitySwimlaneSVG,
    },
  ],
  [UMLDiagramType.UseCaseDiagram]: [
    {
      type: "useCase",
      width: 160,
      height: 100,
      defaultData: { name: "Use Case" },
      svg: UseCaseNodeSVG,
    },
    {
      type: "useCaseActor",
      width: 100,
      height: 150,
      defaultData: { name: "Actor" },
      svg: UseCaseActorNodeSVG,
    },
    {
      type: "useCaseSystem",
      width: 160,
      height: 120,
      defaultData: { name: "System" },
      svg: UseCaseSystemNodeSVG,
    },
  ],
  [UMLDiagramType.CommunicationDiagram]: [
    {
      type: "communicationObjectName",
      width: 160,
      height: 70,
      defaultData: {
        name: "Object",
        methods: [],
        attributes: [{ id: generateUUID(), name: "attribute = value" }],
      },
      svg: CommunicationObjectNameSVG,
    },
  ],
  [UMLDiagramType.ComponentDiagram]: [
    {
      type: "component",
      width: 180,
      height: 120,
      defaultData: { name: "Component", isComponentHeaderShown: true },
      svg: ComponentNodeSVG,
    },
    {
      type: "componentSubsystem",
      width: 180,
      height: 120,
      defaultData: { name: "Subsystem", isComponentSubsystemHeaderShown: true },
      svg: ComponentSubsystemNodeSVG,
    },
    {
      type: "componentInterface",
      width: INTERFACE_SIZE,
      height: INTERFACE_SIZE,
      defaultData: { name: "Interface" },
      svg: ComponentInterfaceNodeSVG,
      marginTop: 10,
    }, // Must use INTERFACE.SIZE
  ],
  [UMLDiagramType.DeploymentDiagram]: [
    {
      type: "deploymentNode",
      width: 160,
      height: 100,
      defaultData: {
        name: "Node",
        isComponentHeaderShown: true,
        stereotype: "node",
      },
      svg: DeploymentNodeSVG,
    },
    {
      type: "deploymentComponent",
      width: 160,
      height: 100,
      defaultData: { name: "Component", isComponentHeaderShown: true },
      svg: DeploymentComponentSVG,
    },
    {
      type: "deploymentArtifact",
      width: 160,
      height: 50,
      defaultData: { name: "Artifact" },
      svg: DeploymentArtifactSVG,
    },
    {
      type: "deploymentInterface",
      width: INTERFACE_SIZE,
      height: INTERFACE_SIZE,
      defaultData: { name: "Interface" },
      svg: DeploymentInterfaceSVG,
      marginTop: 10,
    }, // Must use INTERFACE.SIZE
  ],
  [UMLDiagramType.SyntaxTree]: [
    {
      type: "syntaxTreeNonterminal",
      width: 160,
      height: 100,
      defaultData: { name: "Nonterminal" },
      svg: SyntaxTreeNonterminalNodeSVG,
    },
    {
      type: "syntaxTreeTerminal",
      width: 160,
      height: 100,
      defaultData: { name: "Terminal" },
      svg: SyntaxTreeTerminalNodeSVG,
    },
  ],
  [UMLDiagramType.PetriNet]: [
    {
      type: "petriNetTransition",
      width: 30,
      height: 60,
      defaultData: { name: "Transition" },
      svg: PetriNetTransitionSVG,
      marginTop: 15,
    },
    {
      type: "petriNetPlace",
      width: 60,
      height: 60,
      defaultData: { name: "Place" },
      svg: PetriNetPlaceSVG,
      marginTop: 5,
    },
  ],
  [UMLDiagramType.ReachabilityGraph]: [
    {
      type: "reachabilityGraphMarking",
      width: 160,
      height: 120,
      defaultData: { name: "Marking" },
      svg: ReachabilityGraphMarkingSVG,
    },
  ],
  [UMLDiagramType.Flowchart]: [
    {
      type: "flowchartTerminal",
      width: 160,
      height: 70,
      defaultData: { name: "Terminal" },
      svg: FlowchartTerminalNodeSVG,
    },
    {
      type: "flowchartProcess",
      width: 160,
      height: 70,
      defaultData: { name: "Process" },
      svg: FlowchartProcessNodeSVG,
    },
    {
      type: "flowchartDecision",
      width: 160,
      height: 70,
      defaultData: { name: "Decision" },
      svg: FlowchartDecisionNodeSVG,
    },
    {
      type: "flowchartInputOutput",
      width: 140,
      height: 70,
      defaultData: { name: "Input/Output" },
      svg: FlowchartInputOutputNodeSVG,
    },
    {
      type: "flowchartFunctionCall",
      width: 160,
      height: 70,
      defaultData: { name: "Function Call" },
      svg: FlowchartFunctionCallNodeSVG,
    },
  ],
  [UMLDiagramType.BPMN]: [
    {
      type: "bpmnTask",
      width: 160,
      height: 60,
      defaultData: { name: "Task" },
      svg: BPMNTaskNodeSVG,
    },
    {
      type: "bpmnSubprocess",
      width: 160,
      height: 60,
      defaultData: { name: "Subprocess" },
      svg: BPMNSubprocessNodeSVG,
    },
    {
      type: "bpmnTransaction",
      width: 160,
      height: 60,
      defaultData: { name: "Transaction", variant: "transaction" },
      svg: BPMNSubprocessNodeSVG,
    },
    {
      type: "bpmnCallActivity",
      width: 160,
      height: 60,
      defaultData: { name: "Call Activity", variant: "call" },
      svg: BPMNSubprocessNodeSVG,
    },
    {
      type: "bpmnGroup",
      width: 160,
      height: 60,
      defaultData: { name: "Group" },
      svg: BPMNGroupNodeSVG,
    },
    {
      type: "bpmnAnnotation",
      width: 160,
      height: 60,
      defaultData: { name: "Annotation" },
      svg: BPMNAnnotationNodeSVG,
    },
    {
      type: "bpmnStartEvent",
      width: 40,
      height: 40,
      defaultData: { name: "", variant: "start" },
      svg: BPMNEventNodeSVG,
    },
    {
      type: "bpmnIntermediateEvent",
      width: 40,
      height: 40,
      defaultData: { name: "", variant: "intermediate" },
      svg: BPMNEventNodeSVG,
    },
    {
      type: "bpmnEndEvent",
      width: 40,
      height: 40,
      defaultData: { name: "", variant: "end" },
      svg: BPMNEventNodeSVG,
    },
    {
      type: "bpmnGateway",
      width: 40,
      height: 40,
      defaultData: { name: "" },
      svg: BPMNGatewayNodeSVG,
    },
    {
      type: "bpmnDataObject",
      width: 40,
      height: 60,
      defaultData: { name: "" },
      svg: BPMNDataObjectNodeSVG,
    },
    {
      type: "bpmnDataStore",
      width: 60,
      height: 60,
      defaultData: { name: "" },
      svg: BPMNDataStoreNodeSVG,
    },
    {
      type: "bpmnPool",
      width: 160,
      height: 80,
      defaultData: { name: "Pool" },
      svg: BPMNPoolNodeSVG,
    },
  ],
  [UMLDiagramType.Sfc]: [
    {
      type: "sfcStart",
      width: 160,
      height: 70,
      defaultData: { name: "Start" },
      svg: SfcStartNodeSVG,
    },
    {
      type: "sfcStep",
      width: 160,
      height: 70,
      defaultData: { name: "Step" },
      svg: SfcStepNodeSVG,
    },
    {
      type: "sfcJump",
      width: 96,
      height: 48,
      defaultData: { name: "Jump" },
      svg: SfcJumpNodeSVG,
    },
    {
      type: "sfcTransitionBranch",
      width: 30,
      height: 30,
      defaultData: { name: "Branch", showHint: true },
      svg: SfcTransitionBranchNodeSVG,
    },
    {
      type: "sfcActionTable",
      width: 160,
      height: 30,
      defaultData: {
        name: "Action Table",
        actionRows: [
          {
            id: "1",
            identifier: "A",
            name: "Actions",
            fillColor: "",
            strokeColor: "",
          },
        ],
      },
      svg: SfcActionTableNodeSVG,
    },
  ],
})

export const ColorDescriptionConfig: DropElementConfig = Object.freeze({
  type: "colorDescription",
  width: 160,
  height: 50,
  defaultData: { name: "Color Description" },
  svg: ColorDescriptionSVG,
})
