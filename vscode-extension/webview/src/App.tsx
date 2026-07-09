import { useCallback, useEffect, useRef, useState } from "react"
import {
  Apollon,
  ApollonControl,
  ApollonDefaultControls,
  type ApollonEditor,
  type UMLModel,
} from "@tumaet/apollon"
import { diagramTypeEntries } from "../../src/shared/diagramTypes"
import type {
  AutoExport,
  DocumentModel,
  ExportFormat,
  HostMessage,
  WebviewMessage,
} from "../../src/shared/protocol"
import { vscode } from "./main"
import { renderSvgToPngBase64 } from "./svgToPng"
import { useVsCodeTheme } from "./theme"

const post = (message: WebviewMessage) => vscode.postMessage(message)

/** How long an "Exported" confirmation lingers before the label goes quiet. */
const STATUS_LINGER_MS = 2000

type ExportStatus = "idle" | "exporting" | "exported" | "failed"

/** What the canvas shows, driven entirely by what the document holds. */
type View =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "invalid"; reason: string }
  | { kind: "editor"; initial: UMLModel }

function DiagramPicker() {
  return (
    <div className="apollon-vscode-notice">
      <h1>New diagram</h1>
      <p>This file is empty. Choose a diagram type to start drawing.</p>
      <div className="apollon-vscode-choices">
        {diagramTypeEntries().map(([diagramType, label]) => (
          <button
            key={diagramType}
            type="button"
            onClick={() => post({ type: "create", diagramType })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="apollon-vscode-notice-hint">
        Nothing is written until you save — undo returns the file to empty.
      </p>
    </div>
  )
}

function InvalidNotice({ reason }: { reason: string }) {
  return (
    <div className="apollon-vscode-notice">
      <h1>This file is not an Apollon diagram</h1>
      <p>
        Apollon could not read it: {reason}. Open it as text to repair the
        contents, then reopen it as a diagram.
      </p>
      <div className="apollon-vscode-choices">
        <button type="button" onClick={() => post({ type: "reopenAsText" })}>
          Open as text
        </button>
      </div>
    </div>
  )
}

const STATUS_COLOR: Record<ExportStatus, string> = {
  idle: "var(--apollon-chrome-text-muted)",
  exporting: "var(--vscode-charts-yellow, #b7791f)",
  exported: "var(--vscode-charts-green, #197d4e)",
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
      className="apollon-glass apollon-vscode-status"
      onClick={() => post({ type: "configureAutoExport" })}
      title={
        autoExport === "off"
          ? "Saving does not write an image. Click to export SVG or PNG on every save."
          : `Every save writes a .${autoExport} next to this diagram. Click to change.`
      }
    >
      <span
        aria-hidden
        className="apollon-vscode-status-dot"
        style={{ color: STATUS_COLOR[autoExport === "off" ? "idle" : status] }}
      />
      <span>{autoExportLabel(autoExport, status)}</span>
    </button>
  )
}

function App() {
  const editorRef = useRef<ApollonEditor | null>(null)
  const theme = useVsCodeTheme()

  const [view, setView] = useState<View>({ kind: "loading" })
  const [external, setExternal] = useState<UMLModel>()
  const [autoExport, setAutoExport] = useState<AutoExport>("off")
  const [status, setStatus] = useState<ExportStatus>("idle")

  /**
   * The model as last synced with the host. Setting `model` makes the editor
   * re-emit it through `subscribeToModelChange`; posting that back would loop
   * the document write straight into another external update.
   */
  const lastSyncedJson = useRef("")

  /**
   * Mount the canvas on the first model, then keep it — later models arrive as
   * the reactive `model` prop, so the viewport and selection survive. A document
   * emptied out from under us (an undone scaffold) falls back to the picker.
   */
  const applyModel = useCallback((model: DocumentModel) => {
    lastSyncedJson.current = JSON.stringify(model)
    if (model === null) {
      setExternal(undefined)
      setView({ kind: "empty" })
      return
    }
    setExternal(model)
    setView((current) =>
      current.kind === "editor" ? current : { kind: "editor", initial: model }
    )
  }, [])

  const runExport = useCallback(
    async (format: ExportFormat, requestId: number) => {
      const editor = editorRef.current
      if (!editor) {
        post({ type: "exportFailed", requestId, reason: "the editor is gone" })
        return
      }
      setStatus("exporting")
      try {
        const rendered = await editor.exportAsSVG({ svgMode: "compat" })
        const payload =
          format === "png" ? await renderSvgToPngBase64(rendered) : rendered.svg
        post({ type: "exportResult", requestId, format, payload })
        setStatus("exported")
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        post({ type: "exportFailed", requestId, reason })
        setStatus("failed")
      }
    },
    []
  )

  useEffect(() => {
    const onMessage = ({ data }: MessageEvent<HostMessage>) => {
      switch (data.type) {
        case "init":
          setAutoExport(data.autoExport)
          applyModel(data.model)
          break
        case "invalid":
          setView({ kind: "invalid", reason: data.reason })
          break
        case "autoExportChanged":
          setAutoExport(data.autoExport)
          break
        case "externalUpdate":
          applyModel(data.model)
          break
        case "export":
          void runExport(data.format, data.requestId)
          break
        default:
          // Every `HostMessage` variant is handled above; adding one without a
          // case here is a compile error rather than a silent no-op.
          data satisfies never
      }
    }
    window.addEventListener("message", onMessage)
    post({ type: "ready" })
    return () => window.removeEventListener("message", onMessage)
  }, [applyModel, runExport])

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
    return <DiagramPicker />
  }
  if (view.kind === "invalid") {
    return <InvalidNotice reason={view.reason} />
  }

  return (
    <Apollon
      ref={editorRef}
      className="apollon-vscode-editor"
      dataTheme={theme}
      defaultModel={view.initial}
      defaultType={view.initial.type}
      // Reactive, so a `git checkout` or an edit in a split JSON editor lands in
      // the canvas without remounting it — the viewport and selection survive.
      model={external}
      onMount={(editor) => {
        const id = editor.subscribeToModelChange((next) => {
          const json = JSON.stringify(next)
          if (json === lastSyncedJson.current) {
            return
          }
          lastSyncedJson.current = json
          post({ type: "modelChanged", model: next })
        })
        return () => editor.unsubscribe(id)
      }}
    >
      <ApollonDefaultControls />
      <ApollonControl
        id="apollon-vscode:auto-export"
        region="top-right"
        groupLabel="Auto-export"
      >
        <AutoExportButton autoExport={autoExport} status={status} />
      </ApollonControl>
    </Apollon>
  )
}

export default App
