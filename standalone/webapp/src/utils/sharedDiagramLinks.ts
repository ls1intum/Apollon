import { DiagramView } from "@/types"

export type SharedDiagramViewOption = {
  value: DiagramView
  label: string
  badge: string
  description: string
}

export const SHARED_DIAGRAM_VIEW_OPTIONS: readonly SharedDiagramViewOption[] = [
  {
    value: DiagramView.EDIT,
    label: "Edit",
    badge: "Edit mode",
    description: "Anyone with this link can open and edit this shared copy.",
  },
  {
    value: DiagramView.COLLABORATE,
    label: "Collaborate",
    badge: "Collaboration mode",
    description: "Open the same shared copy as a live collaboration session.",
  },
  {
    value: DiagramView.GIVE_FEEDBACK,
    label: "Give feedback",
    badge: "Feedback mode",
    description: "Let reviewers add feedback without changing modelling mode.",
  },
  {
    value: DiagramView.SEE_FEEDBACK,
    label: "Review feedback",
    badge: "Review mode",
    description: "Open feedback in read-only review mode.",
  },
]

export const DEFAULT_SHARED_DIAGRAM_VIEW = DiagramView.EDIT

export const normalizeSharedDiagramView = (value: unknown): DiagramView => {
  return Object.values(DiagramView).includes(value as DiagramView)
    ? (value as DiagramView)
    : DEFAULT_SHARED_DIAGRAM_VIEW
}

export const getSharedDiagramViewOption = (
  view: unknown
): SharedDiagramViewOption => {
  const normalizedView = normalizeSharedDiagramView(view)
  return (
    SHARED_DIAGRAM_VIEW_OPTIONS.find(
      (option) => option.value === normalizedView
    ) ?? SHARED_DIAGRAM_VIEW_OPTIONS[0]
  )
}

export const getSharedDiagramViewBadge = (view: unknown): string =>
  getSharedDiagramViewOption(view).badge

export const buildSharedDiagramPath = (
  diagramId: string,
  view: DiagramView = DEFAULT_SHARED_DIAGRAM_VIEW
): string =>
  `/shared/${encodeURIComponent(diagramId)}?view=${encodeURIComponent(view)}`

export const buildSharedDiagramUrl = (
  diagramId: string,
  view: DiagramView = DEFAULT_SHARED_DIAGRAM_VIEW,
  origin = typeof window !== "undefined" ? window.location.origin : ""
): string => `${origin}${buildSharedDiagramPath(diagramId, view)}`
