import { DropdownMenuItem } from "@tumaet/ui/components/dropdown-menu"
import React, { useRef } from "react"
import { useImportDiagramFile } from "@/hooks/useImportDiagramFile"

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
 * Container: imports the chosen JSON file as a new local diagram and opens it.
 * Wires {@link JsonFileImportButtonView} to the shared import path.
 */
export const JsonFileImportButton: React.FC<{ close: () => void }> = ({
  close,
}) => {
  const importFile = useImportDiagramFile()
  return (
    <JsonFileImportButtonView
      onFile={(file) => void importFile(file)}
      onClose={close}
    />
  )
}
