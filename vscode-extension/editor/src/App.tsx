import { useRef, useState } from "react"
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

function App() {
  const editorRef = useRef<ApollonEditor | null>(null)
  const [exportType, setExportType] = useState<ExportType>("svg")

  const model = useStore((state) => state.model)
  const loadVersion = useStore((state) => state.loadVersion)
  const options = useStore((state) => state.options)

  const exportDiagram = async () => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const diagramSVG = await editor.exportAsSVG({ svgMode: "compat" })
    let exportContent

    switch (exportType) {
      case "png": {
        const arrayBuffer = await (
          await convertRenderedSVGToPNG(diagramSVG, true)
        ).arrayBuffer()
        exportContent = Array.from(new Uint8Array(arrayBuffer))
        break
      }
      case "svg":
        exportContent = diagramSVG.svg
        break
    }

    vscode.postMessage({
      type: "exportDiagram",
      exportType: exportType,
      exportContent: exportContent,
    })
  }

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
        })
        return () => editor.unsubscribe(id)
      }}
    >
      {/* Export toolbar mounted as immersive in-canvas chrome via the overlay
          API, instead of a separate bar above the canvas. */}
      <ApollonControl id="vscode:export" region="top-right" groupLabel="Export">
        <div className="app-bar items-center gap-2 px-3">
          <button
            type="button"
            className="vscode-button"
            onClick={exportDiagram}
          >
            Export
          </button>
          <select
            id="export-type"
            className="vscode-select"
            value={exportType}
            onChange={(e) =>
              setExportType(e.currentTarget.value.toLowerCase() as ExportType)
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
