import type { UMLDiagramType, UMLModel } from "@tumaet/apollon"

/** Sibling image the editor can render next to the `.apollon` file. */
export type ExportFormat = "svg" | "png"

/** `"off"` disables the sibling-image export; otherwise it is written on save. */
export type AutoExport = "off" | ExportFormat

/**
 * What a `.apollon` document currently holds. `null` means the file is empty —
 * a freshly created one — and the canvas offers a diagram-type picker rather
 * than reporting a parse failure.
 */
export type DocumentModel = UMLModel | null

/** Host → webview. */
export type HostMessage =
  | { type: "init"; model: DocumentModel; autoExport: AutoExport }
  /** Non-empty, but not a diagram. The canvas offers to reopen it as text. */
  | { type: "invalid"; reason: string }
  | { type: "config"; autoExport: AutoExport }
  /** The document changed underneath us (git, a split JSON editor, revert). */
  | { type: "externalUpdate"; model: DocumentModel }
  | { type: "export"; format: ExportFormat; requestId: number }

/** Webview → host. */
export type WebviewMessage =
  | { type: "ready" }
  | { type: "modelChanged"; model: UMLModel }
  /** The picker's choice for an empty document. The host writes the scaffold. */
  | { type: "create"; diagramType: UMLDiagramType }
  | { type: "reopenAsText" }
  | { type: "configureAutoExport" }
  /**
   * `payload` is SVG markup for `svg`, and base64-encoded bytes for `png` —
   * webview messages are JSON-serialized, so binary cannot cross as-is.
   */
  | {
      type: "exportResult"
      requestId: number
      format: ExportFormat
      payload: string
    }
  | { type: "exportFailed"; requestId: number; reason: string }
