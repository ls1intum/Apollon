import { Capacitor } from "@capacitor/core"
import { DiagramView } from "@/types"
import { serverURL } from "@/constants"

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

export const isDiagramView = (value: unknown): value is DiagramView =>
  typeof value === "string" &&
  (Object.values(DiagramView) as string[]).includes(value)

export const normalizeSharedDiagramView = (value: unknown): DiagramView =>
  isDiagramView(value) ? value : DEFAULT_SHARED_DIAGRAM_VIEW

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

export const sharedDiagramRoute = (
  diagramId: string,
  view: DiagramView = DEFAULT_SHARED_DIAGRAM_VIEW
) =>
  ({
    to: "/shared/$diagramId",
    params: { diagramId },
    search: { view },
  }) as const

// Origin for externally-shareable links: the web host on native (Capacitor),
// else the page origin (capacitor://localhost isn't externally openable).
export const resolveShareOrigin = (): string => {
  if (Capacitor.isNativePlatform() && serverURL) {
    return serverURL
  }
  return typeof window !== "undefined" ? window.location.origin : ""
}

// Origin for server-rendered assets (the `/api/...` SVG + `/embed` page): the
// configured API host first, else the page origin on web. On native with no
// configured host it returns "" — `capacitor://localhost` is not externally
// resolvable, so callers must treat "" as "can't build a shareable URL".
//
// NOT the same as `resolveShareOrigin` above and not unifiable: a clickable
// share link wants the *page* origin first (stay on staging vs. jumping to the
// prod API host), an embedded asset wants the *API* host first (that's where it
// is served). The two contracts diverge on web+serverURL and native-no-config.
export const resolveServerOrigin = (): string => {
  if (serverURL) return serverURL
  if (Capacitor.isNativePlatform()) return ""
  return typeof window !== "undefined" ? window.location.origin : ""
}

export const buildSharedDiagramUrl = (
  diagramId: string,
  view: DiagramView = DEFAULT_SHARED_DIAGRAM_VIEW,
  origin = resolveShareOrigin()
): string =>
  `${origin}/shared/${encodeURIComponent(diagramId)}?view=${encodeURIComponent(view)}`
