import { useState, useCallback } from "react"
import { readFileContent } from "@/utils/readFileContent"
import { useEditorContext } from "@/contexts"
import { log } from "@/logger"

export const useImportHandler = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false)
  const { editor } = useEditorContext()

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      setErrorMessage(null)

      const file = event.target.files?.[0]

      if (!file) {
        setErrorMessage("No file selected.")
        setSnackbarOpen(true)
        return
      }

      if (!file.name.endsWith(".json")) {
        setErrorMessage("Please select a file with a .json extension.")
        setSnackbarOpen(true)
        return
      }

      try {
        const content = await readFileContent(file)
        event.target.value = ""
        log.debug("Importing content:", content)
      } catch {
        setErrorMessage("An error occurred during import.")
        setSnackbarOpen(true)
      }
    },
    [editor]
  )

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return
    }
    setSnackbarOpen(false)
  }

  return {
    errorMessage,
    snackbarOpen,
    handleImport,
    handleSnackbarClose,
  }
}
