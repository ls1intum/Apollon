import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "@tumaet/apollon/style.css"
import App from "./App"
import useStore from "./store"
import { UMLDiagramType, UMLModel } from "@tumaet/apollon"

export const vscode = acquireVsCodeApi()

// Bridge VS Code's theme to Apollon. VS Code toggles `vscode-light` /
// `vscode-dark` / `vscode-high-contrast(-light)` classes on <body>, but the
// library's chrome (glass tint, shadows, hairlines) keys its dark variants off
// `[data-theme="dark"]`. Mirror the VS Code theme onto the root's data-theme so
// the chrome themes correctly and follows live theme switches.
function syncApollonTheme() {
  const c = document.body.classList
  const isDark =
    c.contains("vscode-dark") ||
    (c.contains("vscode-high-contrast") &&
      !c.contains("vscode-high-contrast-light"))
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")
}
syncApollonTheme()
new MutationObserver(syncApollonTheme).observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
})

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
