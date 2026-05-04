import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"
import { log } from "@/logger"

export const useExportAsJSON = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()
  const getCurrentModel = usePersistenceModelStore(
    (state) => state.getCurrentModel
  )

  const exportAsJSON = () => {
    if (!editor) {
      log.error("Editor context is not available")
      return
    }

    const currentModel = getCurrentModel()
    if (!currentModel) {
      log.error("Current model is not available")
      return
    }

    const model = editor.model
    const jsonContent = JSON.stringify(model, null, 2)
    const diagramTitle = editor.model.title || "diagram"
    const fileName = `${diagramTitle}.json`
    const fileToDownload = new File([jsonContent], fileName, {
      type: "application/json",
    })

    downloadFile({ file: fileToDownload, fileName })
  }

  return exportAsJSON
}
