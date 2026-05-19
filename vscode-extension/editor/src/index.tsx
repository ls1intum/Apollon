import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "@tumaet/apollon/style.css"
import App from "./App"
import useStore from "./store"
import { UMLDiagramType, UMLModel } from "@tumaet/apollon"
import { setTheme } from "./theme-switcher/theme-switcher"

export const vscode = acquireVsCodeApi()

setTheme("light")

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
        createNewEditor: true,
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
