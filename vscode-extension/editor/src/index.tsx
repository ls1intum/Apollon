import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "@tumaet/apollon/style.css"
import App from "./App"
import useStore from "./store"
import { UMLDiagramType, UMLModel } from "@tumaet/apollon/react"

export const vscode = acquireVsCodeApi()

const root = createRoot(document.getElementById("editor-root") as HTMLElement)

window.addEventListener("message", (e) => {
  const message = e.data

  if (message.command === "loadDiagram") {
    useStore.setState((prevState) => {
      return {
        model: message.model
          ? (JSON.parse(message.model) as UMLModel)
          : undefined,
        options: {
          ...prevState.options,
          type: message.diagramType as UMLDiagramType,
        },
        loadVersion: prevState.loadVersion + 1,
      }
    })
  }
})

vscode.postMessage({
  type: "editorMounted",
})

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)
