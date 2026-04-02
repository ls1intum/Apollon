import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import App from "./App"
import reportWebVitals from "./reportWebVitals"
import useStore from "./store"

export const vscode = acquireVsCodeApi()

const root = ReactDOM.createRoot(
  document.getElementById("menu-root") as HTMLElement
)

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
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
