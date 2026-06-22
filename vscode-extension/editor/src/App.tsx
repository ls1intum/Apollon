import { useCallback, useEffect, useRef, useState } from "react"
import {
  Apollon,
  ApollonControl,
  ApollonEditor,
  UMLModel,
} from "@tumaet/apollon/react"
import { vscode } from "./index"
import { convertRenderedSVGToPNG } from "./utils/converter"
import useStore from "./store"

type ExportType = "svg" | "png"
type ExportStatus = "idle" | "exporting" | "synced" | "error"

const STATUS_LABEL: Record<ExportStatus, string> = {
  idle: "Auto-export",
  exporting: "Exporting…",
  synced: "Auto-exported",
  error: "Export failed",
}
const STATUS_COLOR: Record<ExportStatus, string> = {
  idle: "var(--apollon-chrome-text-muted)",
  exporting: "var(--home-toast-warning, #b7791f)",
  synced: "var(--home-toast-success, #197d4e)",
  error: "var(--apollon-alert-danger-color, #d33)",
}

function App() {
  const editorRef = useRef<ApollonEditor | null>(null)
  const [format, setFormat] = useState<ExportType>("svg")
  const [status, setStatus] = useState<ExportStatus>("idle")
  // Read the latest format inside the (stable) export callback without
  // re-subscribing on every change. Synced in an effect (not during render).
  const formatRef = useRef(format)
  useEffect(() => {
    formatRef.current = format
  }, [format])
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const model = useStore((state) => state.model)
  const loadVersion = useStore((state) => state.loadVersion)
  const options = useStore((state) => state.options)

  // Render the diagram to the chosen format and hand the bytes to the host, which
  // writes the sibling <name>.svg / <name>.png next to the .apollon file.
  const runExport = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    const exportType = formatRef.current
    setStatus("exporting")
    try {
      const diagramSVG = await editor.exportAsSVG({ svgMode: "compat" })
      let exportContent: string | number[]
      if (exportType === "png") {
        const arrayBuffer = await (
          await convertRenderedSVGToPNG(diagramSVG, true)
        ).arrayBuffer()
        exportContent = Array.from(new Uint8Array(arrayBuffer))
      } else {
        exportContent = diagramSVG.svg
      }
      vscode.postMessage({
        type: "exportDiagram",
        exportType,
        exportContent,
        auto: true,
      })
      setStatus("synced")
    } catch {
      setStatus("error")
    }
  }, [])

  // Debounced auto-export: coalesces a burst of edits into one render.
  const scheduleExport = useCallback(() => {
    setStatus("exporting")
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => void runExport(), 700)
  }, [runExport])

  // Re-export immediately when the user switches format.
  useEffect(() => {
    if (editorRef.current) void runExport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format])

  return (
    <Apollon
      key={loadVersion}
      ref={editorRef}
      className="flex flex-col overflow-hidden w-full h-screen bg-[var(--apollon-background)]"
      defaultModel={model}
      defaultType={options.type}
      defaultMode={options.mode}
      readonly={options.readonly}
      enablePopups={options.enablePopups}
      onMount={(editor) => {
        const id = editor.subscribeToModelChange((next: UMLModel) => {
          useStore.setState({ model: next })
          vscode.postMessage({ type: "saveDiagram", model: next })
          scheduleExport()
        })
        // Export once on open so the sibling image exists straight away.
        void runExport()
        return () => {
          if (debounce.current) clearTimeout(debounce.current)
          editor.unsubscribe(id)
        }
      }}
    >
      {/* Auto-export status island (top-left), in the shared floating-glass language. */}
      <ApollonControl
        id="vscode:export"
        region="top-left"
        groupLabel="Auto-export"
      >
        <div
          className="apollon-glass apollon-chrome-island"
          title={`Automatically exports <diagram>.${format} next to the .apollon file on every change`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 8px",
            color: "var(--apollon-chrome-text)",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              backgroundColor: STATUS_COLOR[status],
              transition: "background-color 150ms",
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
            {STATUS_LABEL[status]}
          </span>
          <select
            id="export-type"
            className="vscode-select"
            aria-label="Export format"
            value={format}
            onChange={(e) =>
              setFormat(e.currentTarget.value.toLowerCase() as ExportType)
            }
          >
            <option value="svg">SVG</option>
            <option value="png">PNG</option>
          </select>
        </div>
      </ApollonControl>
    </Apollon>
  )
}

export default App
