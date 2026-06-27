import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from "react"
import { ApollonEditor } from "@tumaet/apollon"

interface EditorContextType {
  editor?: ApollonEditor
  diagramName: string

  setDiagramName: React.Dispatch<React.SetStateAction<string>>
  setEditor: React.Dispatch<React.SetStateAction<ApollonEditor | undefined>>
}

export const EditorContext = createContext<EditorContextType | undefined>(
  undefined
)

export const useEditorContext = () => {
  const context = useContext(EditorContext)

  if (!context) {
    throw new Error("useEditorContext must be used within an EditorContext")
  }
  return context
}

interface Props {
  children: ReactNode
}

export const EditorProvider: React.FC<Props> = ({ children }) => {
  const [editor, setEditor] = useState<ApollonEditor>()
  const [diagramName, setDiagramName] = useState("Default Diagram")

  const contextValue = useMemo(
    () => ({
      editor,
      setEditor,
      diagramName,
      setDiagramName,
    }),
    [editor, setEditor, diagramName, setDiagramName]
  )

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  )
}
