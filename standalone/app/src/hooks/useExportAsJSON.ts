import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"
import { log } from "@/logger"
import { isPlatform } from "@ionic/react"
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"

export const useExportAsJSON = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()
  const getCurrentModel = usePersistenceModelStore(
    (state) => state.getCurrentModel
  )

  const exportAsJSON = async () => {
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

    if (isPlatform("ios") || isPlatform("android")) {
      //mobile export using Capacitor Filesystem and Share API
      try {
        // Save JSON to temporary location
        await Filesystem.writeFile({
          path: fileName,
          data: jsonContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        })

        // Get the file URI
        const fileUri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        })

        // Open share sheet on iOS to allow saving to Files
        await Share.share({
          title: "Export JSON",
          url: fileUri.uri,
          dialogTitle: "Save JSON to Files",
        })

        log.debug("JSON export initiated on iOS")
      } catch (error) {
        log.error("Failed to export JSON on iOS", error as Error)
      }
    } else {
      //Web download
      const fileToDownload = new File([jsonContent], fileName, {
        type: "application/json",
      })

      downloadFile({ file: fileToDownload, fileName })
    }
  }

  return exportAsJSON
}
