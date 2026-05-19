import { useState } from "react"
import { ApollonEditor } from "@tumaet/apollon/react"
import { ApollonEditorProvider } from "./ApollonEditor/ApollonEditorContext"
import { ApollonEditorComponent } from "./ApollonEditor/ApollonEditorComponent"
import { vscode } from "./index"
import { convertRenderedSVGToPNG } from "./utils/converter"

type ExportType = "svg" | "png"

function App() {
  const [editor, setEditor] = useState<ApollonEditor>()
  const [exportType, setExportType] = useState<ExportType>("svg")
  const handleSetEditor = (newEditor: ApollonEditor) => {
    setEditor(newEditor)
  }

  const exportDiagram = async () => {
    const diagramSVG = await editor!.exportAsSVG({ svgMode: "compat" })
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
    <>
      <div className="app-bar items-center gap-2 px-3">
        <button type="button" className="vscode-button" onClick={exportDiagram}>
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
      <ApollonEditorProvider value={{ editor, setEditor: handleSetEditor }}>
        <ApollonEditorComponent />
      </ApollonEditorProvider>
    </>
  )
}

export default App
