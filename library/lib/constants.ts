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
import { ClassStereotype, UMLDiagramType } from "@/types"
import { CANVAS, EDGES, INTERFACE } from "@/utils/geometry/routingConstants"

export { CANVAS, EDGES, INTERFACE }

/* -------------------------------------------------------------------------- */
/* Canvas                                                                     */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */
export const CSS_VARIABLE_FALLBACKS: Readonly<Record<string, string>> =
  Object.freeze({
    "--apollon-primary": "#3e8acc",
    "--apollon-primary-foreground": "#ffffff",
    "--apollon-foreground": "#000000",
    "--apollon-secondary": "#6c757d",
    "--apollon-interactive-selection": "#f39c12",
    "--apollon-dropzone-accent": "#0064ff",
    "--apollon-on-collaboration-cursor": "#ffffff",
    "--apollon-assessment-positive-text": "#166534",
    "--apollon-assessment-positive-bg": "#dcfce7",
    "--apollon-assessment-negative-text": "#991b1b",
    "--apollon-assessment-negative-bg": "#fee2e2",
    "--apollon-assessment-zero-text": "#1e40af",
    "--apollon-assessment-zero-bg": "#dbeafe",
    "--apollon-collaboration-color-1": "#ffb61e",
    "--apollon-collaboration-color-2": "#37b24d",
    "--apollon-collaboration-color-3": "#1c7ed6",
    "--apollon-collaboration-color-4": "#f03e3e",
    "--apollon-collaboration-color-5": "#ae3ec9",
    "--apollon-collaboration-color-6": "#0ca678",
    "--apollon-collaboration-color-7": "#f76707",
    "--apollon-collaboration-color-8": "#1098ad",
    "--apollon-guide-vertical": "#d63031",
    "--apollon-guide-horizontal": "#0984e3",
    "--apollon-background": "#ffffff",
    "--apollon-background-variant": "#f8f9fa",
    "--apollon-hover-neutral":
      "color-mix(in srgb, var(--apollon-foreground, #000000) 7.5%, transparent)",
    "--apollon-gray": "#e9ecef",
    "--apollon-grid": "rgba(36, 39, 36, 0.1)",
    "--apollon-gray-variant": "#495057",
    "--apollon-danger": "#721c24",
  })

export const STROKE_COLOR = CSS_VARIABLE_FALLBACKS["--apollon-foreground"]
export const FILL_COLOR = CSS_VARIABLE_FALLBACKS["--apollon-background"]

// Re-exported from the leaf module (see lib/fontStack.ts) so `@/constants`
// importers keep working.
export { FONT_FAMILY, DEFAULT_FONT_SIZE }
export const INTERACTIVE_SELECTION_COLOR = `var(--apollon-interactive-selection, ${CSS_VARIABLE_FALLBACKS["--apollon-interactive-selection"]})`
export const INTERACTIVE_SELECTION_FILL = `color-mix(in srgb, var(--apollon-interactive-selection, ${CSS_VARIABLE_FALLBACKS["--apollon-interactive-selection"]}) 18%, transparent)`
// Fainter fill + softer stroke for the secondary (highlighted, not selected)
// state of the assessment selection overlay. Both derive from the SAME
// --apollon-interactive-selection token as the solid color/fill above, so the
// whole affordance themes from one source with no raw color.
export const INTERACTIVE_SELECTION_FILL_FAINT = `color-mix(in srgb, var(--apollon-interactive-selection, ${CSS_VARIABLE_FALLBACKS["--apollon-interactive-selection"]}) 10%, transparent)`
export const INTERACTIVE_SELECTION_STROKE_SOFT = `color-mix(in srgb, var(--apollon-interactive-selection, ${CSS_VARIABLE_FALLBACKS["--apollon-interactive-selection"]}) 50%, transparent)`
// Stronger fill for the highlighted (hover/host-cued) state of the div/g
// selection overlay. Same token, heavier mix — no raw color.
export const INTERACTIVE_SELECTION_FILL_STRONG = `color-mix(in srgb, var(--apollon-interactive-selection, ${CSS_VARIABLE_FALLBACKS["--apollon-interactive-selection"]}) 50%, transparent)`

/**
 * Live-collaboration cursor palette. The SINGLE source the collaboration code
 * reads — it holds no inline hex array. Each entry is a `var(...)` reference to
 * an --apollon-collaboration-color-N token (defined in packages/ui tokens.css,
 * light + dark) with its embed-safe fallback drawn from CSS_VARIABLE_FALLBACKS
 * above, so an assigned cursor color re-resolves per theme yet still paints when
 * the library is embedded standalone with no host tokens.
 */
export const COLLAB_CURSOR_PALETTE: ReadonlyArray<string> = Object.freeze(
  Array.from(
    { length: 8 },
    (_, i) =>
      `var(--apollon-collaboration-color-${i + 1}, ${
        CSS_VARIABLE_FALLBACKS[`--apollon-collaboration-color-${i + 1}`]
      })`
  )
)

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
 * Media query for the compact "mobile" palette layout. First clause: portrait
 * phones, stopping below 768px so iPad portrait keeps the desktop layout. Second
 * clause: phones in landscape, where the short height distinguishes them from
 * tablets.
 *
 * Governs the PALETTE only. The webapp navbar uses its own width-only
 * `NARROW_VIEW_QUERY` (standalone/webapp/src/constants/responsive.ts) which does
 * not match landscape phones, so there the navbar stays full-size while the
 * palette still compacts.
 */
export const MOBILE_VIEW_QUERY =
  "(max-width: 767.95px), (max-width: 950px) and (max-height: 500px)"

// RFC 4122 v4 UUID via crypto.getRandomValues — available in every context the
// editor runs in (secure or not, browser or Node ≥19 (global Web Crypto)),
// unlike crypto.randomUUID() which requires a secure context an embeddable host
// can't be assumed to provide.
export const generateUUID = (): string => {
  const b = crypto.getRandomValues(new Uint8Array(16))
  // RFC-4122 v4: version nibble (4) at byte 6, variant (10xx) at byte 8.
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"))
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10, 16).join("")}`
}

/* -------------------------------------------------------------------------- */
/* Edges                                                                      */
/* -------------------------------------------------------------------------- */
// Base marker size. `MARKER_BASE_SIZE` scales the inline reachability-graph
// arrow against the shared MARKERS sprite; `BPMN_MARKER_SIZE` is local-only
// (used a few lines below for BPMN message markers).
export const MARKER_BASE_SIZE = 18
const BPMN_MARKER_SIZE = 11
// Aggregation/composition diamonds run longer than the other class markers so
// they carry at least the inheritance triangle's visual weight, as in draw.io
// (24-long diamond vs 16-long triangle) and Mermaid (equal areas). Capped at 24
// because 24 * RHOMBUS_HEIGHT_FACTOR stays under the triangle's height, so the
// diamond never overhangs a node border further than the triangle does.
const RHOMBUS_MARKER_SIZE = 24
// 1/phi, inside the 0.588-0.706 thickness band those tools use.
const RHOMBUS_HEIGHT_FACTOR = 0.618

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
const INTERFACE_SOCKET_SIZE = INTERFACE.RADIUS // Must equal INTERFACE.SIZE / 2

export const MARKER_CONFIGS = Object.freeze({
  // Class diagram markers
  "black-rhombus": {
    type: "rhombus",
    filled: true,
    size: RHOMBUS_MARKER_SIZE,
    widthFactor: 1.0,
    heightFactor: RHOMBUS_HEIGHT_FACTOR,
  },
  "white-rhombus": {
    type: "rhombus",
    filled: false,
    size: RHOMBUS_MARKER_SIZE,
    widthFactor: 1.0,
    heightFactor: RHOMBUS_HEIGHT_FACTOR,
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
    // Two opposing sockets leave an 8° seam at both joins instead of merging
    // into a visually indistinguishable 360° ring. At the canonical 18px
    // socket radius, 8° is the smallest grid-friendly seam that also clears a
    // provided-interface line passing through it at the current stroke width.
    arcSpanDegrees: 172,
  },
  "required-interface-quarter": {
    type: "semicircle",
    filled: false,
    size: INTERFACE_SOCKET_SIZE,
    widthFactor: 1,
    heightFactor: 1,
    // Adjacent cardinal sockets retain the same 5° seam.
    arcSpanDegrees: 85,
  },
  "required-interface-threequarter": {
    type: "semicircle",
    filled: false,
    size: INTERFACE_SOCKET_SIZE,
    widthFactor: 1,
    heightFactor: 1,
    arcSpanDegrees: 265,
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
  /**
   * Max pointer travel over a palette press for it to count as a tap
   * (click-to-place) rather than a drag. Touch is looser: finger-roll on an
   * intended tap routinely exceeds a mouse-tight threshold, and misreading a
   * touch tap as a drag drops the node hidden under the palette — the exact
   * failure this feature removes.
   */
  TAP_SLOP_MOUSE_PX: 8,
  TAP_SLOP_TOUCH_PX: 16,
  /**
   * Diagonal offset applied to each consecutive tap-placed node so a burst of
   * taps cascades instead of stacking — the same affordance, and the same
   * step, as pasting repeatedly.
   */
  TAP_CASCADE_PX: CANVAS.PASTE_OFFSET_PX,
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
      // No keyword line (abstract is an italic name, not a «keyword»), so this
      // is 10px shorter than the interface/enumeration templates.
      height: 100,
      defaultData: {
        name: "Abstract",
        isAbstract: true,
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
        stereotype: ClassStereotype.Enumeration,
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
        stereotype: ClassStereotype.Interface,
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
      width: INTERFACE.SIZE,
      height: INTERFACE.SIZE,
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
      width: INTERFACE.SIZE,
      height: INTERFACE.SIZE,
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
      defaultData: { name: "Input / Output" },
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
