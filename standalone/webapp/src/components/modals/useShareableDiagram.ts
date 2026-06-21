import { useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import type { UMLModel } from "@tumaet/apollon"
import { DiagramView } from "@/types"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import { log } from "@/logger"
import {
  addSharedDiagramEntry,
  markSharedDiagramCopied,
  updateSharedDiagramView,
} from "@/utils/sharedDiagramStorage"
import { buildSharedDiagramUrl } from "@/utils/sharedDiagramLinks"

type Phase = "form" | "creating"

/**
 * The shared "share this diagram" state machine used by both the editor and the
 * dashboard share dialogs. It uploads a snapshot ONCE; after that, changing the
 * access mode only rewrites the `?view=` of the same link — it never creates a
 * second server diagram. Copy is explicit, with a transient "copied" flag.
 */
export function useShareableDiagram(
  modelData: UMLModel | null,
  initialDiagramId?: string
) {
  const [phase, setPhase] = useState<Phase>("form")
  const [diagramId, setDiagramId] = useState<string | null>(
    initialDiagramId ?? null
  )
  const [mode, setMode] = useState<DiagramView>(DiagramView.COLLABORATE)
  const [copied, setCopied] = useState(false)
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current)
    },
    []
  )

  const link = diagramId ? buildSharedDiagramUrl(diagramId, mode) : ""

  const create = async (name: string) => {
    if (!modelData) {
      toast.error("This diagram can't be shared right now.")
      return
    }
    setPhase("creating")
    try {
      const trimmed = name.trim()
      const model =
        trimmed && trimmed !== modelData.title
          ? { ...modelData, title: trimmed }
          : modelData
      const { id } = await DiagramApiClient.createDiagram(model)
      addSharedDiagramEntry(id)
      setDiagramId(id)
      setMode(DiagramView.COLLABORATE)
      setPhase("form")
    } catch (err) {
      log.error("Error creating shared diagram:", err as Error)
      toast.error("Couldn't create the share link. Try again.")
      setPhase("form")
    }
  }

  const copy = async () => {
    if (!link || !diagramId) return
    try {
      await navigator.clipboard.writeText(link)
      markSharedDiagramCopied(diagramId, mode)
      setCopied(true)
      if (copyTimeout.current) clearTimeout(copyTimeout.current)
      copyTimeout.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy the link.")
    }
  }

  const selectMode = (next: DiagramView) => {
    setMode(next)
    if (diagramId) updateSharedDiagramView(diagramId, next)
  }

  return {
    phase,
    diagramId,
    mode,
    copied,
    link,
    isCreating: phase === "creating",
    create,
    copy,
    selectMode,
  }
}
