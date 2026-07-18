import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import { importDiagram } from "@tumaet/apollon"
import { toast } from "react-toastify"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { log } from "@/logger"

/**
 * Imports a diagram file as a NEW local diagram and opens it — the one path
 * behind the File-menu "Import" item, the home page's import button, and the
 * drag-and-drop dropzone, so all three behave identically. A `.json` exported
 * from Apollon (any 2.x/3.x/4.x version; `importDiagram` migrates older ones)
 * becomes a fresh diagram keyed by its own id; the current diagram is never
 * touched.
 */
export function useImportDiagramFile() {
  const createModel = usePersistenceModelStore((state) => state.createModel)
  const navigate = useNavigate()

  return useCallback(
    async (file: File) => {
      try {
        const model = importDiagram(JSON.parse(await file.text()))
        if (!model?.id) throw new Error("Imported diagram has no id")

        createModel(model)
        await navigate({
          to: "/local/$id",
          params: { id: model.id },
          replace: true,
        })
        toast.success(`Imported "${model.title || "Untitled diagram"}".`)
      } catch (error) {
        log.error("Failed to import diagram file", error as Error)
        toast.error(
          `Couldn't import "${file.name}" — it isn't a valid Apollon diagram.`
        )
      }
    },
    [createModel, navigate]
  )
}
