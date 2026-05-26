import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import useStore from "./store"

export const vscode = acquireVsCodeApi()

const root = createRoot(document.getElementById("menu-root") as HTMLElement)

vscode.postMessage({
  type: "fetchDiagrams",
})

window.addEventListener("message", (e) => {
  const message = e.data
  if (message.command === "updateDiagrams") {
    useStore.setState({
      diagrams: message.diagrams,
    })
  }
})

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)
