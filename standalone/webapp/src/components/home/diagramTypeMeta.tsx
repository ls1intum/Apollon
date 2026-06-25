// Diagram-type metadata: maps each UML diagram type to its display label and
// glyph icon. Consumed by the dashboard gallery and cards. (Previously this
// file also rendered a type-picker grid; that UI has been removed.)
import { cloneElement, isValidElement, type ReactElement } from "react"
import type { UMLDiagramType } from "@tumaet/apollon"

type DiagramTile = {
  type: UMLDiagramType
  title: string
  icon: ReactElement
}

const iconClassName = "h-10 w-10"

const diagramTypes = {
  ClassDiagram: "ClassDiagram",
  ObjectDiagram: "ObjectDiagram",
  ActivityDiagram: "ActivityDiagram",
  UseCaseDiagram: "UseCaseDiagram",
  CommunicationDiagram: "CommunicationDiagram",
  ComponentDiagram: "ComponentDiagram",
  DeploymentDiagram: "DeploymentDiagram",
  PetriNet: "PetriNet",
  ReachabilityGraph: "ReachabilityGraph",
  SyntaxTree: "SyntaxTree",
  Flowchart: "Flowchart",
  BPMN: "BPMN",
  Sfc: "Sfc",
} satisfies Record<string, UMLDiagramType>

const makeTile = (
  type: UMLDiagramType,
  title: string,
  icon: ReactElement
): DiagramTile => ({
  type,
  title,
  icon,
})

const diagramTiles = {
  classDiagram: makeTile(
    diagramTypes.ClassDiagram,
    "Class Diagram",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="6"
        y="8"
        width="36"
        height="30"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="6"
        y1="18"
        x2="42"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="14"
        y1="25"
        x2="34"
        y2="25"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="14"
        y1="31"
        x2="28"
        y2="31"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  activityDiagram: makeTile(
    diagramTypes.ActivityDiagram,
    "Activity Diagram",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <circle cx="10" cy="24" r="4" fill="currentColor" />
      <rect
        x="17"
        y="18"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="38" cy="24" r="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="38" cy="24" r="2" fill="currentColor" />
      <line
        x1="14"
        y1="24"
        x2="17"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="29"
        y1="24"
        x2="33"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  useCaseDiagram: makeTile(
    diagramTypes.UseCaseDiagram,
    "Use Case Diagram",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <circle cx="11" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
      <line
        x1="11"
        y1="18"
        x2="11"
        y2="29"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="6"
        y1="23"
        x2="16"
        y2="23"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="11"
        y1="29"
        x2="6"
        y2="35"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="11"
        y1="29"
        x2="16"
        y2="35"
        stroke="currentColor"
        strokeWidth="2"
      />
      <ellipse
        cx="32"
        cy="24"
        rx="11"
        ry="7"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  objectDiagram: makeTile(
    diagramTypes.ObjectDiagram,
    "Object Diagram",
    // Object node: a single rectangle whose name is UNDERLINED (the sole UML
    // distinction from a Class box — no header rule, no compartments).
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="8"
        y="10"
        width="32"
        height="28"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="18"
        y1="17"
        x2="30"
        y2="17"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="14"
        y1="20"
        x2="34"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="14"
        y1="30"
        x2="34"
        y2="30"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  componentDiagram: makeTile(
    diagramTypes.ComponentDiagram,
    "Component Diagram",
    // Component node: a plain body rectangle with the UML «component» tab glyph
    // (a small rectangle with two short stubs poking out past a vertical bar) in
    // the top-right corner — the way the editor actually draws it.
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="8"
        y="10"
        width="32"
        height="28"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M30 14 H37 V25 H30 V22 M30 18 H27 M30 22 H27"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M30 16 V20" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  deploymentDiagram: makeTile(
    diagramTypes.DeploymentDiagram,
    "Deployment Diagram",
    // Deployment «node»: a 3D box (cube). Front rectangle plus a top and a right
    // face, mirroring the editor's DeploymentNodeSVG.
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="6"
        y="14"
        width="26"
        height="22"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M6 14 l6 -6 H38 l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M38 8 V30 l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  flowchart: makeTile(
    diagramTypes.Flowchart,
    "Flowchart",
    // Flowchart: a process rectangle flowing (down an arrow) into a decision
    // diamond — conveys FLOW, with the diamond as the signature shape.
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="14"
        y="6"
        width="20"
        height="10"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="24"
        y1="16"
        x2="24"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M21 22 L24 25 L27 22" stroke="currentColor" strokeWidth="2" />
      <polygon
        points="24,25 35,35 24,45 13,35"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  syntaxTree: makeTile(
    diagramTypes.SyntaxTree,
    "Syntax Tree",
    // Syntax tree: one root node branching down to two leaves. Rounded-rect nodes
    // match the editor; kept to three nodes so it stays legible at 36px.
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="18"
        y="6"
        width="12"
        height="10"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="6"
        y="32"
        width="12"
        height="10"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="30"
        y="32"
        width="12"
        height="10"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="21"
        y1="16"
        x2="13"
        y2="32"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="27"
        y1="16"
        x2="35"
        y2="32"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  sfc: makeTile(
    diagramTypes.Sfc,
    "SFC",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="14"
        y="7"
        width="20"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="24"
        y1="17"
        x2="24"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="16"
        y1="24"
        x2="32"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="24"
        y1="24"
        x2="24"
        y2="31"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="14"
        y="31"
        width="20"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  communicationDiagram: makeTile(
    diagramTypes.CommunicationDiagram,
    "Communication Diagram",
    // Communication diagram: object rectangles (with an underlined name tick)
    // joined by SOLID links, one carrying a numbered message arrow.
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="6"
        y="8"
        width="14"
        height="9"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="9"
        y1="14"
        x2="17"
        y2="14"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="28"
        y="31"
        width="14"
        height="9"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="31"
        y1="37"
        x2="39"
        y2="37"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="18"
        y1="19"
        x2="30"
        y2="29"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M30 24 L31 30 L25 29"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  petriNet: makeTile(
    diagramTypes.PetriNet,
    "Petri Net",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <circle cx="10" cy="24" r="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="24" r="1.8" fill="currentColor" />
      <rect
        x="20"
        y="18"
        width="8"
        height="12"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="38" cy="24" r="5" stroke="currentColor" strokeWidth="2" />
      <line
        x1="15"
        y1="24"
        x2="20"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="28"
        y1="24"
        x2="33"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M31 22 L33 24 L31 26" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  reachabilityGraph: makeTile(
    diagramTypes.ReachabilityGraph,
    "Reachability Graph",
    // Reachability graph: rounded-square markings (as the editor draws them)
    // connected by directed arrows.
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="30"
        y="6"
        width="12"
        height="12"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="18"
        y="30"
        width="12"
        height="12"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="18"
        y1="12"
        x2="30"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M28 10 L30 12 L28 14" stroke="currentColor" strokeWidth="2" />
      <line
        x1="34"
        y1="18"
        x2="27"
        y2="29"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M30 28 L27 30 L29 26" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  bpmn: makeTile(
    diagramTypes.BPMN,
    "BPMN",
    // BPMN: start event circle → exclusive gateway (diamond with an X) → end
    // event circle. The gateway diamond is BPMN's signature flow element.
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <circle cx="9" cy="24" r="5" stroke="currentColor" strokeWidth="2" />
      <polygon
        points="24,16 32,24 24,32 16,24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M21 21 L27 27 M27 21 L21 27"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="39" cy="24" r="5" stroke="currentColor" strokeWidth="2" />
      <line
        x1="14"
        y1="24"
        x2="16"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="32"
        y1="24"
        x2="34"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
}

const tilesByType: Partial<Record<UMLDiagramType, DiagramTile>> = Object.values(
  diagramTiles
).reduce<Partial<Record<UMLDiagramType, DiagramTile>>>((result, tile) => {
  result[tile.type] = tile
  return result
}, {})

export const getDiagramTypeLabel = (type: UMLDiagramType) =>
  tilesByType[type]?.title ?? type

/** Short badge label for each diagram type (e.g. "Class", "Object", "SFC"). */
const shortLabelsByType: Partial<Record<UMLDiagramType, string>> = {
  ClassDiagram: "Class",
  ObjectDiagram: "Object",
  ActivityDiagram: "Activity",
  UseCaseDiagram: "UseCase",
  CommunicationDiagram: "Comm",
  ComponentDiagram: "Component",
  DeploymentDiagram: "Deploy",
  PetriNet: "Petri",
  ReachabilityGraph: "Reach",
  SyntaxTree: "Syntax",
  Flowchart: "Flow",
  BPMN: "BPMN",
  Sfc: "SFC",
}

export const getDiagramTypeShortLabel = (type: UMLDiagramType): string =>
  shortLabelsByType[type] ?? type

export const getDiagramTypeIcon = (
  type: UMLDiagramType,
  customClassName?: string
) => {
  const fallback = (
    <svg
      className={customClassName ?? iconClassName}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="8"
        y="10"
        width="32"
        height="28"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="12"
        y1="18"
        x2="36"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )

  const icon = tilesByType[type]?.icon as
    | ReactElement<{ className?: string }>
    | undefined
  if (!icon || !isValidElement(icon) || !customClassName) {
    return icon ?? fallback
  }

  return cloneElement(icon, {
    className: customClassName,
  })
}
