import { Button, Tooltip } from "@mui/material"
import SaveAltIcon from "@mui/icons-material/SaveAlt"
import { v4 as uuidv4 } from "uuid"
import { toast } from "react-toastify"
import { useNavigate } from "react-router"
import type { UMLModel } from "@tumaet/apollon"
import { useEditorContext } from "@/contexts"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"
import { secondary } from "@/constants"
import { versioningStrings as t } from "@/components/versioning/strings"
import { log } from "@/logger"

interface Props {
  /** Foreground colour, mirrors `VersionHistoryButton`'s convention. */
  color?: string
  /** Mobile menu close callback when rendered inside the hamburger. */
  onAfter?: () => void
}

/**
 * Durability escape hatch on shared/collab routes. Snapshots the editor's
 * current model into `usePersistenceModelStore` so a server-side TTL
 * expiry (120 days, see `record-of-processing.md:103`) can't lose the
 * user's own work. Explicit user action — no silent caching, no GDPR
 * surface (the user copies their own viewable content on their own device).
 *
 * Hidden when there's no URL diagramId (i.e. on `/` already) — the local
 * Save / Save-version flows already cover that case.
 */
export const SaveLocalCopyButton = ({ color = secondary, onAfter }: Props) => {
  const diagramId = useDiagramIdFromPath()
  const { editor } = useEditorContext()
  const createModel = usePersistenceModelStore((s) => s.createModel)
  const navigate = useNavigate()

  if (!diagramId || !editor) return null

  const handleClick = () => {
    try {
      // Deep-clone before mutating the id — a shallow spread would leave
      // `nodes`/`edges`/`assessments` referenced by both the live editor
      // model and the local copy, so subsequent edits in either would
      // corrupt the other. `structuredClone` is Baseline 2022.
      const copy: UMLModel = { ...structuredClone(editor.model), id: uuidv4() }
      createModel(copy)
      toast.success(t.saveLocalCopySuccess, { autoClose: 6000 })
      // Mirrors `JsonFileImportButton` — navigate back to the local route
      // so the user lands on the diagram they just saved.
      navigate("/", {
        replace: true,
        state: { timeStapToCreate: Date.now() },
      })
    } catch (err) {
      log.error("Save a local copy failed", err as Error)
      toast.error(t.saveLocalCopyFailed)
    } finally {
      onAfter?.()
    }
  }

  return (
    <Tooltip title={t.saveLocalCopyButton}>
      <Button
        sx={{ textTransform: "none", minWidth: 0, gap: 0.5 }}
        onClick={handleClick}
        aria-label={t.saveLocalCopyButton}
        startIcon={
          <SaveAltIcon fontSize="small" htmlColor={color} aria-hidden />
        }
      >
        <span style={{ color }}>{t.saveLocalCopyButton}</span>
      </Button>
    </Tooltip>
  )
}
