import { useState } from "react"
import { ApollonEditor } from "@tumaet/apollon"
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
} from "@vscode/webview-ui-toolkit/react"
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
    const diagramSVG = await editor!.exportAsSVG()
    let exportContent

    switch (exportType) {
      case "png":
        const arrayBuffer = await (
          await convertRenderedSVGToPNG(diagramSVG, true)
        ).arrayBuffer()
        exportContent = Array.from(new Uint8Array(arrayBuffer))
        break
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
      <div className="app-bar">
        <VSCodeButton className="m-3" onClick={exportDiagram}>
          Export
        </VSCodeButton>
        <VSCodeDropdown
          id="export-type"
          className="m-3"
          style={{ height: "24px" }}
          onInput={(e) => {
            setExportType(
              (e.target as HTMLInputElement).value.toLowerCase() as ExportType
            )
          }}
        >
          <VSCodeOption>SVG</VSCodeOption>
          <VSCodeOption>PNG</VSCodeOption>
        </VSCodeDropdown>
      </div>
      <ApollonEditorProvider value={{ editor, setEditor: handleSetEditor }}>
        <ApollonEditorComponent />
      </ApollonEditorProvider>
    </>
  )
}

export default App
