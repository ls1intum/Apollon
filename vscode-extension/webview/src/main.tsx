import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@tumaet/apollon/style.css"
import "./index.css"
import App from "./App"

export const vscode = acquireVsCodeApi()

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
