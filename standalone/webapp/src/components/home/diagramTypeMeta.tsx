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
  EntityRelationship: "EntityRelationship",
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
      <path d="M31 22 L33 24 L31 26" stroke="currentColor" strokeWidth="2" />
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
        x1="13"
        y1="18"
        x2="35"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="13"
        y1="22"
        x2="27"
        y2="22"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="13"
        y1="28"
        x2="33"
        y2="28"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  componentDiagram: makeTile(
    diagramTypes.ComponentDiagram,
    "Component Diagram",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="10"
        y="9"
        width="28"
        height="30"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="14"
        y="14"
        width="6"
        height="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="14"
        y="22"
        width="6"
        height="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="23"
        y1="20"
        x2="34"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="23"
        y1="26"
        x2="31"
        y2="26"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  deploymentDiagram: makeTile(
    diagramTypes.DeploymentDiagram,
    "Deployment Diagram",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="7"
        y="12"
        width="18"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="23"
        y="24"
        width="18"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="25"
        y1="18"
        x2="23"
        y2="30"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M25 28 L23 30 L21 28" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  flowchart: makeTile(
    diagramTypes.Flowchart,
    "Flowchart",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <polygon
        points="24,8 36,20 24,32 12,20"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="24"
        y1="32"
        x2="24"
        y2="40"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M22 38 L24 40 L26 38" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  syntaxTree: makeTile(
    diagramTypes.SyntaxTree,
    "Syntax Tree",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="14" cy="24" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="34" cy="24" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="38" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="38" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="28" cy="38" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="38" cy="38" r="3" stroke="currentColor" strokeWidth="2" />
      <line
        x1="21"
        y1="13"
        x2="16"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="27"
        y1="13"
        x2="32"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="12"
        y1="27"
        x2="10"
        y2="35"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="16"
        y1="27"
        x2="20"
        y2="35"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="32"
        y1="27"
        x2="28"
        y2="35"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="36"
        y1="27"
        x2="38"
        y2="35"
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
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <circle cx="12" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="36" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="34" r="4" stroke="currentColor" strokeWidth="2" />
      <line
        x1="16"
        y1="14"
        x2="32"
        y2="14"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <line
        x1="14"
        y1="17"
        x2="22"
        y2="31"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <line
        x1="34"
        y1="17"
        x2="26"
        y2="31"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
    </svg>
  ),
  petriNet: makeTile(
    diagramTypes.PetriNet,
    "Petri Net",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <circle cx="10" cy="24" r="5" stroke="currentColor" strokeWidth="2" />
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
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="36" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="34" r="5" stroke="currentColor" strokeWidth="2" />
      <line
        x1="17"
        y1="12"
        x2="31"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M29 10 L31 12 L29 14" stroke="currentColor" strokeWidth="2" />
      <line
        x1="15"
        y1="16"
        x2="21"
        y2="29"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M19 27 L21 29 L23 27" stroke="currentColor" strokeWidth="2" />
      <line
        x1="33"
        y1="16"
        x2="27"
        y2="29"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M25 27 L27 29 L29 27" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  bpmn: makeTile(
    diagramTypes.BPMN,
    "BPMN",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <circle cx="10" cy="24" r="5" stroke="currentColor" strokeWidth="2" />
      <rect
        x="20"
        y="16"
        width="14"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="41" cy="24" r="4" stroke="currentColor" strokeWidth="2" />
      <line
        x1="15"
        y1="24"
        x2="20"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="34"
        y1="24"
        x2="37"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M35 22 L37 24 L35 26" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  entityRelationship: makeTile(
    diagramTypes.EntityRelationship,
    "Entity-Relationship Diagram",
    <svg className={iconClassName} viewBox="0 0 48 48" fill="none">
      <rect
        x="4"
        y="18"
        width="14"
        height="12"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M30 17 L37 24 L30 31 L23 24 Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <ellipse
        cx="42"
        cy="10"
        rx="5"
        ry="3.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="18"
        y1="24"
        x2="23"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="37"
        y1="20"
        x2="40"
        y2="13"
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
  EntityRelationship: "ER",
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
