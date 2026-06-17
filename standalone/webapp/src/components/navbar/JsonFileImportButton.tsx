import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { DropdownMenuItem } from "@tumaet/ui/components/dropdown-menu"
import React, { useRef } from "react"
import { useNavigate } from "react-router"
import { importDiagram } from "@tumaet/apollon/react"
import { log } from "@/logger"

export const JsonFileImportButton: React.FC<{ close: () => void }> = (
  props
) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createModel = usePersistenceModelStore((state) => state.createModel)
  const navigate = useNavigate()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    props.close()

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)

        const processedModel = importDiagram(json)
        createModel(processedModel)
        navigate(`/local/${processedModel.id}`, { replace: true })
      } catch (error) {
        log.error("Invalid JSON file", error as Error)
      }
    }
    reader.readAsText(file)

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
