import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { DropdownMenuItem } from "@tumaet/ui/components/dropdown-menu"
import React, { useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { importDiagram } from "@tumaet/apollon/react"
import { log } from "@/logger"

/** Props for the pure {@link JsonFileImportButtonView}. */
interface JsonFileImportButtonViewProps {
  /** Fired with the chosen file when the user picks one from the native picker. */
  onFile: (file: File) => void
  /** Fired to close the surrounding menu once a file has been chosen. */
  onClose: () => void
}

/**
 * Pure "Import" menu entry. Renders a dropdown item that opens a hidden native
 * file picker and reports the chosen `File` via `onFile` (then `onClose`). It
 * does no parsing, persistence, or navigation — see {@link JsonFileImportButton}.
 */
export function JsonFileImportButtonView({
  onFile,
  onClose,
}: JsonFileImportButtonViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    onClose()
    onFile(file)

    event.target.value = ""
  }

  return (
    <>
      {/* Keep the menu open on click — opening the native file picker is async,
          and the hidden input must stay mounted until a file is chosen, at
          which point handleFileChange closes the menu. */}
      <DropdownMenuItem
        closeOnClick={false}
        onClick={() => fileInputRef.current?.click()}
      >
        Import
      </DropdownMenuItem>
      <input
        type="file"
        accept=".json,application/json"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  )
}

/**
 * Container: reads the chosen JSON file, imports it into a persisted model, and
 * navigates to the new local diagram. Wires {@link JsonFileImportButtonView}.
 */
export const JsonFileImportButton: React.FC<{ close: () => void }> = ({
  close,
}) => {
  const createModel = usePersistenceModelStore((state) => state.createModel)
  const navigate = useNavigate()

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)

        const processedModel = importDiagram(json)
        createModel(processedModel)
        navigate({
          to: "/local/$id",
          params: { id: processedModel.id },
          replace: true,
        })
      } catch (error) {
        log.error("Invalid JSON file", error as Error)
      }
    }
    reader.readAsText(file)
  }

  return <JsonFileImportButtonView onFile={handleFile} onClose={close} />
}
