import { DiagramEdgeType, IPoint } from "./edges/types"
import { DiagramNodeType } from "./nodes/types"
import { UMLDiagramType } from "./types/DiagramType"
import type { ControlsOptions } from "./chrome/config"

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
  model?: UMLModel
  locale?: Locale
  debug?: boolean
  collaborationEnabled?: boolean
  collaboration?: ApollonCollaborationOptions
  scrollLock?: boolean
  /**
   * Configure the editor's built-in controls (element palette, minimap, zoom /
   * history cluster): hide, move to another region, re-configure, or replace
   * each. Same shape as `<Apollon controls={…}>` and `editor.setControls(…)`.
   * Arbitrary custom controls go through `addControl` / `<ApollonControl>`.
   */
  controls?: ControlsOptions
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
