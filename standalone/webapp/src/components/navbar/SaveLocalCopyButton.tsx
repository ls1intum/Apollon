import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { SaveIcon } from "lucide-react"
import { toast } from "react-toastify"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { useEditorContext } from "@/contexts"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"
import { versioningStrings as t } from "@/components/versioning/strings"
import { cloneModelAsLocalCopy } from "@/utils/saveLocalDiagramCopy"
import { log } from "@/logger"
import { navbarButtonStyle } from "./styleConstants"

interface Props {
  /** Foreground colour, mirrors `VersionHistoryButton`'s convention. */
  color?: string
  /** Label-span classes, mirrors `VersionHistoryButton` — the desktop bar
   * passes `"hidden lg:inline"` to collapse to the icon when space is tight. */
  labelClassName?: string
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
 * Only rendered on the shared/collab editor (`/shared/:id`). On `/local/:id`
 * the diagram already lives in `usePersistenceModelStore`, and on `/` (the
 * gallery) there is no editor — the local Save / Save-version flows cover
 * those cases. `useDiagramIdFromPath()` returns an id for BOTH `/local/:id`
 * and `/shared/:id`, so the pathname guard is what scopes this to shared.
 */
export const SaveLocalCopyButton = ({
  color,
  labelClassName,
  onAfter,
}: Props) => {
  const diagramId = useDiagramIdFromPath()
  const { pathname } = useLocation()
  const { editor } = useEditorContext()
  const createModel = usePersistenceModelStore((s) => s.createModel)
  const navigate = useNavigate()

  if (!diagramId || !editor || !pathname.startsWith("/shared/")) return null

  const handleClick = () => {
    try {
      const copy = cloneModelAsLocalCopy(editor.model)
      createModel(copy)
      toast.success(t.saveLocalCopySuccess, { autoClose: 6000 })
      // Mirrors `JsonFileImportButton` — navigate to the new local route so
      // the user lands on the diagram they just saved. `/` is now the
      // gallery, so we route to `/local/<newId>` explicitly.
      navigate({ to: "/local/$id", params: { id: copy.id }, replace: true })
    } catch (err) {
      log.error("Save a local copy failed", err as Error)
      toast.error(t.saveLocalCopyFailed)
    } finally {
      onAfter?.()
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className={navbarButtonStyle()}
        style={color ? { color } : undefined}
        onClick={handleClick}
        aria-label={t.saveLocalCopyButton}
      >
        <SaveIcon className="size-4" aria-hidden />
        <span className={labelClassName}>{t.saveLocalCopyButton}</span>
      </TooltipTrigger>
      <TooltipContent>{t.saveLocalCopyButton}</TooltipContent>
    </Tooltip>
  )
}
