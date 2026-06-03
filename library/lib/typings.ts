import { DiagramEdgeType, IPoint } from "./edges/types"
import { DiagramNodeType } from "./nodes/types"
import { UMLDiagramType } from "./types/DiagramType"
import { Styles } from "./styles/theme"

export { UMLDiagramType, type DiagramNodeType, type DiagramEdgeType }
export { type Styles }

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

export type CollaborationState = {
  user?: CollaborationUser
  cursor?: CollaborationCursor | null
  selectedElementId?: string | null
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
  elements: Record<string, boolean>
  relationships: Record<string, boolean>
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
