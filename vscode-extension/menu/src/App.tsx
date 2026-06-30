import { useState } from "react"
import type { UMLDiagramType } from "@tumaet/apollon"
import useStore from "./store"
import { vscode } from "./index"

const diagramTypes: UMLDiagramType[] = [
  "ClassDiagram",
  "ObjectDiagram",
  "ComponentDiagram",
  "DeploymentDiagram",
  "Flowchart",
  "SyntaxTree",
  "ActivityDiagram",
  "UseCaseDiagram",
  "CommunicationDiagram",
  "PetriNet",
  "ReachabilityGraph",
  "BPMN",
]

// Reject filesystem-illegal characters in user-supplied diagram names.
// eslint-disable-next-line no-control-regex
const INVALID_NAME_RE = /[\x00-\x1f\x80-\x9f<>:"/\\|?*]/

function App() {
  const existingDiagrams = useStore((state) => state.diagrams)
  const [newDiagramName, setNewDiagramName] = useState("")
  const [newDiagramType, setNewDiagramType] =
    useState<UMLDiagramType>("ClassDiagram")
  const [existingDiagramPath, setExistingDiagramPath] = useState<
    string | undefined
  >(undefined)

  const isValidDiagramName = (name: string) =>
    name.length > 0 && !INVALID_NAME_RE.test(name)

  const createDiagram = () => {
    vscode.postMessage({
      type: "createDiagram",
      name: newDiagramName,
      diagramType: newDiagramType,
    })
  }

  const loadDiagram = () => {
    vscode.postMessage({
      type: "loadDiagram",
      path: existingDiagramPath ?? existingDiagrams![0],
    })
  }

  return (
    <div className="flex flex-col mx-5 gap-2">
      <label htmlFor="new-diagram-name">New diagram name</label>
      <input
        id="new-diagram-name"
        type="text"
        className="vscode-input"
        value={newDiagramName}
        onChange={(e) => setNewDiagramName(e.currentTarget.value)}
      />
      <select
        id="new-diagram-type"
        className="vscode-select mt-3"
        value={newDiagramType}
        onChange={(e) =>
          setNewDiagramType(e.currentTarget.value as UMLDiagramType)
        }
      >
        {diagramTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="vscode-button my-3"
        disabled={!isValidDiagramName(newDiagramName)}
        onClick={createDiagram}
      >
        Create new diagram
      </button>

      {!existingDiagrams && (
        <div className="flex flex-col items-center justify-center gap-2">
          <span
            className="inline-block h-5 w-5 rounded-full border-2 border-current border-r-transparent animate-spin"
            role="status"
            aria-label="Fetching diagrams"
          />
          <p>Fetching diagrams</p>
        </div>
      )}
      {existingDiagrams && existingDiagrams.length === 0 && (
        <p>There are no diagrams available to load</p>
      )}
      {existingDiagrams && existingDiagrams.length > 0 && (
        <div className="dropdown-container">
          <label htmlFor="existing-diagrams">Existing diagrams</label>
          <select
            id="existing-diagrams"
            className="vscode-select w-full"
            value={existingDiagramPath ?? existingDiagrams[0]}
            onChange={(e) => setExistingDiagramPath(e.currentTarget.value)}
          >
            {existingDiagrams.map((diagram) => (
              <option key={diagram} value={diagram}>
                {diagram}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="button"
        className="vscode-button my-3"
        disabled={!existingDiagrams || existingDiagrams.length === 0}
        onClick={loadDiagram}
      >
        Load diagram
      </button>
    </div>
  )
}

export default App
