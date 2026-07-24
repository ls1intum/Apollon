import type { IPoint } from "./edges/types"
import type { DiagramEdgeType, DiagramNodeType } from "./modelElementTypes"
import { UMLDiagramType } from "./types/DiagramType"
import type { OverlayControlInput } from "./overlay/types"
import type { ApollonLabels } from "./i18n/labels"
export type { ApollonLabels } from "./i18n/labels"
import type { TagOptions } from "./utils/tagUtils"
export type { TagOptions, TagConfig } from "./utils/tagUtils"

export { UMLDiagramType, type DiagramNodeType, type DiagramEdgeType }

export type Unsubscriber = () => void

export type Subscribers = {
  [key: number]: Unsubscriber
}

export type UMLModelElementType = DiagramNodeType | DiagramEdgeType

export type CollaborationUser = {
  name: string
  color: string
  id?: string
  imageUrl?: string
}

export type CollaborationCursor = {
  x: number
  y: number
}

export type CollaborationViewport = {
  x: number
  y: number
  zoom: number
}

/**
 * One node a peer is actively dragging or resizing. Broadcast over the
 * ephemeral awareness channel — never written to the Yjs document — so peers
 * can render the in-progress gesture live without growing the CRDT or entering
 * anyone's undo history. The settled position/size is committed once on
 * drop/release through the document like any other edit.
 */
export type DraggingNode = {
  id: string
  position: { x: number; y: number }
  width?: number | null
  height?: number | null
}

export type CollaborationState = {
  user?: CollaborationUser
  cursor?: CollaborationCursor | null
  viewport?: CollaborationViewport | null
  followingClientId?: number | null
  selectedElementId?: string | null
  draggingNodes?: DraggingNode[] | null
}

export type CollaboratorInfo = {
  id: string
  name: string
  color: string
  imageUrl?: string
  clientIds: number[]
  isLocal: boolean
}

export type ApollonCollaborationOptions = {
  enabled?: boolean
  user?: CollaborationUser
  showPresence?: boolean
  showCursors?: boolean
  showSelectionHighlights?: boolean
  showFollow?: boolean
}

export enum Locale {
  en = "en",
  de = "de",
}

export enum ApollonMode {
  Modelling = "Modelling",
  Exporting = "Exporting",
  Assessment = "Assessment",
}

export type ApollonNode = {
  id: string
  width: number
  height: number
  type: DiagramNodeType
  position: {
    x: number
    y: number
  }
  data: {
    [key: string]: unknown
  }
  parentId?: string
  measured: { width: number; height: number }
}

export interface OrthogonalEdgeData {
  [key: string]: unknown
  // Manual waypoint array used by the step-path edges.
  points: IPoint[]
}

export type ApollonEdge = {
  id: string
  source: string
  target: string
  type: DiagramEdgeType
  sourceHandle: string
  targetHandle: string
  data: OrthogonalEdgeData
}

export type InteractiveElements = {
  // Inline index signatures (not `Record<string, boolean>`) so the generated
  // JSON Schema treats these as open maps of element id → boolean. The named
  // `Record` utility is emitted as a closed object and would reject real ids.
  elements: { [id: string]: boolean }
  relationships: { [id: string]: boolean }
}

export type UMLModel = {
  version: `4.${number}.${number}`
  id: string
  title: string
  type: UMLDiagramType
  nodes: ApollonNode[]
  edges: ApollonEdge[]
  assessments: { [id: string]: Assessment }
  interactive?: InteractiveElements
}

export enum ApollonView {
  Modelling = "Modelling",
  Exporting = "Exporting",
  Highlight = "Highlight",
}

export type SvgExportMode = "web" | "compat"

export type ApollonOptions = {
  type?: UMLDiagramType
  mode?: ApollonMode
  view?: ApollonView
  availableViews?: ApollonView[]
  readonly?: boolean
  enablePopups?: boolean
  /**
   * Answer the editor's keyboard shortcuts (see `APOLLON_SHORTCUTS`). Set
   * `false` where the host binds those keys itself. Default `true`.
   */
  keyboardShortcuts?: boolean
  model?: UMLModel
  locale?: Locale
  debug?: boolean
  collaborationEnabled?: boolean
  collaboration?: ApollonCollaborationOptions
  scrollLock?: boolean
  /**
   * The chrome to register (vanilla / imperative). Build descriptors with the
   * built-in factories — `paletteControl()`, `zoomControl({ history })`,
   * `miniMapControl()` — and/or your own. OMIT for the editor defaults (palette +
   * zoom + minimap); pass `[]` for a bare canvas; pass a subset to show only
   * those. In React, compose `<Apollon.Palette|Zoom|MiniMap>` / `<ApollonControl>`
   * children instead — both compile to the same registry records.
   */
  controls?: OverlayControlInput[]
  /**
   * Override any of the editor's own user-facing strings (palette / zoom / minimap
   * tooltips and aria-labels) for i18n. Ships English; a host passes a partial map
   * in its own language and the rest fall back to English. Reactive via
   * `<Apollon labels>` / `editor.setLabels`. See {@link ApollonLabels}.
   */
  labels?: Partial<ApollonLabels>
  /**
   * Enable element-tag authoring (off by default). `true` turns on free-form
   * tagging; an object restricts it: `available` supplies the tags offered in
   * the picker, and `allowCreate` controls whether a user may add tags beyond
   * that list (defaults to `false` when `available` is given, `true` otherwise).
   * Reactive via `<Apollon tags>` / `editor.setTags`. Tags a host puts on the
   * model always load and stay queryable with `getElementIdsByTag` regardless of
   * this option — it gates only the authoring UI. See {@link TagOptions}.
   */
  tags?: boolean | TagOptions
  /**
   * Optional `--apollon-*` CSS custom properties applied to the editor's mount
   * element. Build one with `createApollonTheme(...)`. Fully optional — an
   * un-themed editor falls back to the library's built-in light/dark values.
   */
  theme?: Partial<Record<`--apollon-${string}`, string>>
  /**
   * Sets `data-theme` on the mount element. Optional — when omitted the editor
   * keeps any `data-theme` already on the element / inherited from an ancestor.
   * See `library/THEMING.md`.
   */
  dataTheme?: "light" | "dark"
}

export type FeedbackCorrectionStatus = {
  description?: string
  status: "CORRECT" | "INCORRECT" | "NOT_VALIDATED"
}

export type Assessment = {
  modelElementId: string
  elementType: string
  score: number
  feedback?: string
  dropInfo?: unknown
  label?: string
  labelColor?: string
  correctionStatus?: FeedbackCorrectionStatus
}

export type ExportOptions = {
  margin?:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number }
  keepOriginalSize?: boolean
  include?: string[]
  exclude?: string[]
  /**
   * Controls how SVG output is post-processed.
   * - "web": keep CSS variables for theme-adaptive rendering in browsers
   * - "compat": resolve CSS variables + inline attributes for PowerPoint/Inkscape
   */
  svgMode?: SvgExportMode
}

export type SVG = {
  svg: string
  clip: {
    x: number
    y: number
    width: number
    height: number
  }
}
