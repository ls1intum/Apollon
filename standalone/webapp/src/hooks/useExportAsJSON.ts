import { isPlatform } from "@ionic/react"
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"
import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"

export const useExportAsJSON = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  // Rejects on any failure (missing editor or a mobile Filesystem/Share error)
  // instead of swallowing it, so callers — e.g. the navbar's toast.promise —
  // report a failure rather than a false success.
  const exportAsJSON = async () => {
    if (!editor) {
      throw new Error("Editor context is not available")
    }

    const jsonContent = JSON.stringify(editor.model, null, 2)
    const fileName = `${editor.model.title || "diagram"}.json`

    if (isPlatform("ios") || isPlatform("android")) {
      await Filesystem.writeFile({
        path: fileName,
        data: jsonContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      })
      const fileUri = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      })
      await Share.share({
        title: "Export JSON",
        url: fileUri.uri,
        dialogTitle: "Save JSON to Files",
      })
    } else {
      const fileToDownload = new File([jsonContent], fileName, {
        type: "application/json",
      })
      downloadFile({ file: fileToDownload, fileName })
    }
  }

  return exportAsJSON
}
