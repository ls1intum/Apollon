import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { MenuItem } from "@mui/material"
import React, { useRef } from "react"
import { useNavigate } from "react-router"
import { importDiagram } from "@tumaet/apollon"
import { log } from "@/logger"

export const JsonFileImportButton: React.FC<{ close: () => void }> = (
  props
) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createModel = usePersistenceModelStore((state) => state.createModel)
  const navigate = useNavigate()

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    props.close()

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const timeStapToCreate = new Date().getTime()
        const json = JSON.parse(e.target?.result as string)

        const processedModel = importDiagram(json)
        createModel(processedModel)

        navigate("..", {
          relative: "route",
          replace: true,
          state: { timeStapToCreate },
        })
      } catch (error) {
        log.error("Invalid JSON file", error as Error)
      }
    }
    reader.readAsText(file)

    event.target.value = ""
  }

  return (
    <div>
      <MenuItem onClick={handleButtonClick}>Import</MenuItem>
      <input
        type="file"
        accept=".json,application/json"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  )
}
