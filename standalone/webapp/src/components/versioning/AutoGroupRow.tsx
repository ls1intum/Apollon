import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { useState, type CSSProperties, type FC } from "react"
import { VersionListItem } from "./VersionListItem"
import { ROW_HOVER_BG, TEXT_MUTED } from "./theme"
import type { GroupedEntry } from "./utils"

interface AutoGroupRowProps {
  group: Extract<GroupedEntry, { kind: "auto-group" }>
  diagramId: string
  onPreview: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  activeRowId: string | null
  previewingVersionId: string | null
  versionNumberById: Map<string, number>
  latestSavedId?: string
  /** True if the canvas has unsaved changes vs the latest saved version. */
  hasUnsavedChanges: boolean
}

export const AutoGroupRow: FC<AutoGroupRowProps> = ({
  group,
  diagramId,
  onPreview,
  onRestore,
  onDelete,
  activeRowId,
  previewingVersionId,
  versionNumberById,
  latestSavedId,
  hasUnsavedChanges,
}) => {
  const [expanded, setExpanded] = useState(false)
  return (
    <div>
      <button
        type="button"
        // Resolves the listbox's aria-activedescendant when the group is
        // collapsed — the inner ListItems aren't mounted, so without this
        // id the aria reference dangles.
        id={`version-row-${group.first.id}`}
        role="option"
        aria-selected={group.first.id === activeRowId}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-1 border-0 bg-transparent p-3 text-left text-sm transition-colors [&:hover]:[background:var(--row-hover-bg)]"
        style={
          {
            color: TEXT_MUTED,
            "--row-hover-bg": ROW_HOVER_BG,
          } as CSSProperties
        }
        aria-expanded={expanded}
        aria-label={`${group.versions.length} auto-saved versions`}
      >
        {expanded ? (
          <ChevronDownIcon className="size-4" aria-hidden />
        ) : (
          <ChevronRightIcon className="size-4" aria-hidden />
        )}
        {group.versions.length} auto-saved versions
      </button>
      {expanded &&
        group.versions.map((v) => (
          <VersionListItem
            key={v.id}
            diagramId={diagramId}
            version={v}
            versionNumber={versionNumberById.get(v.id)}
            isPreviewing={previewingVersionId === v.id || v.id === activeRowId}
            canRestore={v.id !== latestSavedId || hasUnsavedChanges}
            onPreview={onPreview}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
    </div>
  )
}
