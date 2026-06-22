import { Box } from "@mui/material"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import { useState, type FC } from "react"
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

const AutoGroupRow: FC<AutoGroupRowProps> = ({
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
    <Box>
      <Box
        component="button"
        type="button"
        // Resolves the listbox's aria-activedescendant when the group is
        // collapsed — the inner ListItems aren't mounted, so without this
        // id the aria reference dangles.
        id={`version-row-${group.first.id}`}
        role="option"
        aria-selected={group.first.id === activeRowId}
        onClick={() => setExpanded((v) => !v)}
        sx={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: 0,
          p: 1.5,
          color: TEXT_MUTED,
          cursor: "pointer",
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          "&:hover": { background: ROW_HOVER_BG },
        }}
        aria-expanded={expanded}
        aria-label={`${group.versions.length} auto-saved versions`}
      >
        {expanded ? (
          <ExpandLessIcon fontSize="small" aria-hidden />
        ) : (
          <ChevronRightIcon fontSize="small" aria-hidden />
        )}
        {group.versions.length} auto-saved versions
      </Box>
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
    </Box>
  )
}

export default AutoGroupRow
