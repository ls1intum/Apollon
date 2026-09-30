import { useCallback, useEffect, useRef, useState } from "react"
import {
  Apollon,
  ApollonControl,
  ApollonDefaultControls,
  type ApollonEditor,
  type UMLModel,
} from "@tumaet/apollon"
import { onHostMessage, postToHost } from "./jcefBridge"
import { DIAGRAM_TYPES, starterEntries } from "./shared/diagramTypes"
import type {
  AutoExport,
  DocumentModel,
  ExportFormat,
  HostMessage,
} from "./shared/protocol"
import { renderSvgToPngBase64 } from "./svgToPng"
import { useHostTheme } from "./theme"

/** How long an "Exported" confirmation lingers before the label goes quiet. */
const STATUS_LINGER_MS = 2000

type ExportStatus = "idle" | "exporting" | "exported" | "failed"

type LayoutStatus = "idle" | "arranging" | "failed"

/** What the canvas shows, driven entirely by what the document holds. */
type View =
  | { kind: "loading" }
  /** Starter ids the host will accept, not what the canvas can draw. */
  | { kind: "empty"; types: string[] }
  | { kind: "invalid"; reason: string }
  | { kind: "editor"; initial: UMLModel }

function DiagramPicker({ types }: { types: string[] }) {
  const offered = starterEntries(types)
  // A `.puml` gets a subset of the thirteen, so say why the list is short rather
  // than leaving it looking like the others failed to load.
  const isNarrowed = offered.length < Object.keys(DIAGRAM_TYPES).length
  return (
    <div className="apollon-jetbrains-notice">
      <h1>New diagram</h1>
      <p>This file is empty. Choose a diagram type to start drawing.</p>
      <div className="apollon-jetbrains-choices">
        {offered.map(([diagramType, label]) => (
          <button
            key={diagramType}
            type="button"
            onClick={() => postToHost({ type: "create", diagramType })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="apollon-jetbrains-notice-hint">
        {isNarrowed
          ? "These are the diagram types PlantUML can store. Undo returns the file to empty."
          : "Nothing is written until you save — undo returns the file to empty."}
      </p>
    </div>
  )
}

function InvalidNotice({ reason }: { reason: string }) {
  return (
    <div className="apollon-jetbrains-notice">
      {/* Deliberately not "this file is broken": the same notice covers a
          PlantUML diagram family the canvas cannot edit yet, which renders
          perfectly well in the View tab. The host sends a full sentence saying
          which case it is. */}
      <h1>Nothing to edit on the canvas</h1>
      <p>{reason}</p>
      <div className="apollon-jetbrains-choices">
        <button
          type="button"
          onClick={() => postToHost({ type: "reopenAsText" })}
        >
          Open as text
        </button>
      </div>
    </div>
  )
}

const STATUS_COLOR: Record<ExportStatus, string> = {
  idle: "var(--apollon-chrome-text-muted)",
  exporting: "#b7791f",
  exported: "#197d4e",
  failed: "var(--apollon-danger, #d33)",
}

function autoExportLabel(autoExport: AutoExport, status: ExportStatus): string {
  if (autoExport === "off") {
    return "Auto-export off"
  }
  switch (status) {
    case "exporting":
      return "Exporting…"
    case "exported":
      return `Exported ${autoExport.toUpperCase()}`
    case "failed":
      return "Export failed"
    default:
      return `Auto-export ${autoExport.toUpperCase()}`
  }
}

/** Reports where saving writes an image, and opens the picker to change it. */
function AutoExportButton({
  autoExport,
  status,
}: {
  autoExport: AutoExport
  status: ExportStatus
}) {
  return (
    <button
      type="button"
      className="apollon-glass apollon-jetbrains-status"
      onClick={() => postToHost({ type: "configureAutoExport" })}
      title={
        autoExport === "off"
          ? "Saving does not write an image. Click to export SVG or PNG on every save."
          : `Every save writes a .${autoExport} next to this diagram. Click to change.`
      }
    >
      <span
        aria-hidden
        className="apollon-jetbrains-status-dot"
        style={{ color: STATUS_COLOR[autoExport === "off" ? "idle" : status] }}
      />
      <span>{autoExportLabel(autoExport, status)}</span>
    </button>
  )
}

/** Asks the host to arrange the diagram. The host owns the algorithm, in Kotlin — the same one a
 *  fresh PlantUML import goes through — so there is one arrangement rather than two. */
function AutoLayoutButton({
  status,
  onArrange,
}: {
  status: LayoutStatus
  onArrange: () => void
}) {
  return (
    <button
      type="button"
      className="apollon-glass apollon-jetbrains-status"
      disabled={status === "arranging"}
      onClick={onArrange}
      title="Re-arrange every element: relationships decide the rows, unconnected elements are grouped below. Ctrl+Z undoes it."
    >
      <span>
        {status === "arranging"
          ? "Arranging…"
          : status === "failed"
            ? "Auto layout failed"
            : "Auto layout"}
      </span>
    </button>
  )
}

function App() {
  const editorRef = useRef<ApollonEditor | null>(null)
  const theme = useHostTheme()

  const [view, setView] = useState<View>({ kind: "loading" })
  const [external, setExternal] = useState<UMLModel>()
  const [autoExport, setAutoExport] = useState<AutoExport>("off")
  const [status, setStatus] = useState<ExportStatus>("idle")
  const [layoutStatus, setLayoutStatus] = useState<LayoutStatus>("idle")

  /**
   * The model as last synced with the host. Setting `model` makes the editor
   * re-emit it through `subscribeToModelChange`; posting that back would loop
   * the document write straight into another external update.
   */
  const lastSyncedJson = useRef("")

  /**
   * What the picker may offer, as last stated by an `init`. Held in a ref, not
   * state, because it is read while deciding the next view rather than
   * rendered on its own — and it must outlive the model that arrived with it,
   * so that a file emptied later still shows the right shortlist.
   */
  const offeredTypes = useRef<string[]>(Object.keys(DIAGRAM_TYPES))

  /**
   * Mount the canvas on the first model, then keep it — later models arrive as
   * the reactive `model` prop, so the viewport and selection survive. A document
   * emptied out from under us (an undone scaffold) falls back to the picker.
   */
  const applyModel = useCallback((model: DocumentModel) => {
    lastSyncedJson.current = JSON.stringify(model)
    if (model === null) {
      setExternal(undefined)
      setView({ kind: "empty", types: offeredTypes.current })
      return
    }
    setExternal(model)
    setView((current) =>
      current.kind === "editor" ? current : { kind: "editor", initial: model }
    )
  }, [])

  /**
   * Hands the current model to the host to arrange. The canvas is the one that
   * asks, from either trigger, because it is the only side that knows the sizes
   * the browser measured and holds edits still inside the host's commit debounce.
   */
  const requestArrange = useCallback(() => {
    const editor = editorRef.current
    if (!editor) {
      setLayoutStatus("failed")
      return
    }
    setLayoutStatus("arranging")
    postToHost({ type: "autoLayout", model: editor.model })
  }, [])

  /**
   * Applies the arranged model. Deliberately does *not* touch `lastSyncedJson`:
   * the echo through `subscribeToModelChange` is wanted here, because that is
   * what persists the new geometry (the layout sidecar for a `.puml`, the
   * document itself for a `.apollon`). Going through the model prop rather than
   * around it also puts the change on the canvas's own undo stack, so `Ctrl+Z`
   * brings the previous arrangement back.
   */
  const applyArranged = useCallback((model: UMLModel) => {
    setExternal(model)
    setLayoutStatus("idle")
    editorRef.current?.fitView()
  }, [])

  const runExport = useCallback(
    async (format: ExportFormat, requestId: number) => {
      const editor = editorRef.current
      if (!editor) {
        postToHost({
          type: "exportFailed",
          requestId,
          reason: "the editor is gone",
        })
        return
      }
      setStatus("exporting")
      try {
        const rendered = await editor.exportAsSVG({ svgMode: "compat" })
        const payload =
          format === "png" ? await renderSvgToPngBase64(rendered) : rendered.svg
        postToHost({ type: "exportResult", requestId, format, payload })
        setStatus("exported")
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        postToHost({ type: "exportFailed", requestId, reason })
        setStatus("failed")
      }
    },
    []
  )

  useEffect(() => {
    const unsubscribe = onHostMessage((message: HostMessage) => {
      switch (message.type) {
        case "init":
          setAutoExport(message.autoExport)
          offeredTypes.current =
            message.diagramTypes ?? Object.keys(DIAGRAM_TYPES)
          applyModel(message.model)
          break
        case "invalid":
          setView({ kind: "invalid", reason: message.reason })
          break
        case "autoExportChanged":
          setAutoExport(message.autoExport)
          break
        case "externalUpdate":
          applyModel(message.model)
          break
        case "export":
          void runExport(message.format, message.requestId)
          break
        case "autoLayoutRequested":
          requestArrange()
          break
        case "applyLayout":
          applyArranged(message.model)
          break
        default:
          // Every `HostMessage` variant is handled above; adding one without a
          // case here is a compile error rather than a silent no-op.
          message satisfies never
      }
    })
    postToHost({ type: "ready" })
    return unsubscribe
  }, [applyModel, applyArranged, requestArrange, runExport])

  // A confirmation should not read as the steady state.
  useEffect(() => {
    if (status !== "exported") {
      return
    }
    const timer = setTimeout(() => setStatus("idle"), STATUS_LINGER_MS)
    return () => clearTimeout(timer)
  }, [status])

  if (view.kind === "loading") {
    return null
  }
  if (view.kind === "empty") {
    return <DiagramPicker types={view.types} />
  }
  if (view.kind === "invalid") {
    return <InvalidNotice reason={view.reason} />
  }

  return (
    <Apollon
      ref={editorRef}
      className="apollon-jetbrains-editor"
      dataTheme={theme}
      defaultModel={view.initial}
      defaultType={view.initial.type}
      // Reactive, so a `git checkout` or an edit made elsewhere lands in the
      // canvas without remounting it — the viewport and selection survive.
      model={external}
      onMount={(editor) => {
        const id = editor.subscribeToModelChange((next) => {
          const json = JSON.stringify(next)
          if (json === lastSyncedJson.current) {
            return
          }
          lastSyncedJson.current = json
          postToHost({ type: "modelChanged", model: next })
        })
        return () => editor.unsubscribe(id)
      }}
    >
      <ApollonDefaultControls />
      <ApollonControl
        id="apollon-jetbrains:auto-layout"
        region="top-right"
        groupLabel="Auto layout"
      >
        <AutoLayoutButton status={layoutStatus} onArrange={requestArrange} />
      </ApollonControl>
      <ApollonControl
        id="apollon-jetbrains:auto-export"
        region="top-right"
        groupLabel="Auto-export"
      >
        <AutoExportButton autoExport={autoExport} status={status} />
      </ApollonControl>
    </Apollon>
  )
}

export default App
