import { cloneElement, isValidElement, type ReactElement } from "react"
import type { UMLDiagramType } from "@tumaet/apollon"
import { useNavigate } from "react-router"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"

type DiagramTile = {
  type: UMLDiagramType
  title: string
  description: string
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
  description: string,
  icon: ReactElement
): DiagramTile => ({
  type,
  title,
  description,
  icon,
})

const diagramTiles = {
  classDiagram: makeTile(
    diagramTypes.ClassDiagram,
    "Class Diagram",
    "Model classes, attributes, methods, and relationships.",
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
    "Visualize control flow and process steps.",
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
    "Capture actors and their system interactions.",
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
    "Show object instances and links at runtime.",
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
    "Outline software components and dependencies.",
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
    "Map software artifacts to infrastructure nodes.",
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
    "Describe decisions and operational flow.",
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
    "Represent syntax nodes and parse hierarchy.",
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
    "Design sequential control with transitions.",
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
    "Focus on object collaboration and messages.",
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
    "Model places, transitions, and token flow.",
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
    "Analyze reachable states and transitions.",
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
    "Model business processes with events and tasks.",
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
}

const sections: Array<{ title: string; tiles: DiagramTile[] }> = [
  {
    title: "Most Used",
    tiles: [
      diagramTiles.classDiagram,
      diagramTiles.activityDiagram,
      diagramTiles.useCaseDiagram,
    ],
  },
  {
    title: "Structural",
    tiles: [
      diagramTiles.objectDiagram,
      diagramTiles.componentDiagram,
      diagramTiles.deploymentDiagram,
      diagramTiles.flowchart,
      diagramTiles.syntaxTree,
      diagramTiles.sfc,
    ],
  },
  {
    title: "Behavioral",
    tiles: [
      diagramTiles.communicationDiagram,
      diagramTiles.petriNet,
      diagramTiles.reachabilityGraph,
      diagramTiles.bpmn,
    ],
  },
]

const tilesByType: Partial<Record<UMLDiagramType, DiagramTile>> = sections
  .flatMap((section) => section.tiles)
  .reduce(
    (result, tile) => ({
      ...result,
      [tile.type]: tile,
    }),
    {}
  )

export const getDiagramTypeLabel = (type: UMLDiagramType) =>
  tilesByType[type]?.title ?? type

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

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const buildDefaultName = (baseTitle: string, existingTitles: string[]) => {
  const escapedBaseTitle = escapeRegExp(baseTitle)
  const pattern = new RegExp(`^${escapedBaseTitle}(?: (\\d+))?$`)
  const usedNumbers = new Set<number>()

  for (const title of existingTitles) {
    const match = title.match(pattern)
    if (!match) continue
    if (match[1]) {
      usedNumbers.add(Number(match[1]))
    } else {
      usedNumbers.add(1)
    }
  }

  if (!usedNumbers.has(1)) {
    return baseTitle
  }

  let nextNumber = 2
  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1
  }

  return `${baseTitle} ${nextNumber}`
}

export const DiagramTypeGrid = () => {
  const navigate = useNavigate()

  const handleCreateDiagram = (tile: DiagramTile) => {
    const { models, createModelByTitleAndType } =
      usePersistenceModelStore.getState()
    const existingTitles = Object.values(models).map(
      (persistentModel) => persistentModel.model.title
    )
    const title = buildDefaultName(tile.title, existingTitles)
    const newId = createModelByTitleAndType(title, tile.type)
    navigate(`/local/${newId}`)
  }

  return (
    <div className="rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-6 transition-colors duration-200">
      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--home-text-secondary)] transition-colors duration-200">
              {section.title}
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.tiles.map((tile) => (
                <button
                  key={tile.type}
                  type="button"
                  onClick={() => handleCreateDiagram(tile)}
                  className="group flex cursor-pointer items-start gap-3 rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] p-4 text-left transition-colors duration-200 hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-color)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                >
                  <div className="shrink-0 text-[var(--home-accent-color)] transition-colors duration-200 group-hover:text-white">
                    {tile.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--home-text-primary)] transition-colors duration-200 group-hover:text-white">
                      {tile.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--home-text-secondary)] transition-colors duration-200 group-hover:text-white/90">
                      {tile.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
