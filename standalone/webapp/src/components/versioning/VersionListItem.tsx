import {
  Box,
  Divider,
  IconButton,
  InputBase,
  ListItem,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import { VersionThumbnail } from "./VersionThumbnail"
import {
  useState,
  useRef,
  type FC,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { useVersionStore, type PendingVersion } from "@/stores/useVersionStore"
import { VersionApiClient } from "@/services/DiagramApiClient"
import { versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"
import {
  ROW_HOVER_BG,
  ROW_SELECTED_BG,
  TEXT_MUTED,
  TEXT_PRIMARY,
  isNamedVersion,
} from "./VersionDrawer"

interface Props {
  diagramId: string
  version: PendingVersion
  /** Display rank among saved versions (newest = highest). Undefined for pending. */
  versionNumber?: number
  isPreviewing: boolean
  onPreview: (versionId: string) => void
  onRestore: (versionId: string) => void
  onDelete: (versionId: string) => void
}

const MAX_DESCRIPTION_LENGTH = 240

export const VersionListItem: FC<Props> = ({
  diagramId,
  version,
  versionNumber,
  isPreviewing,
  onPreview,
  onRestore,
  onDelete,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(version.description ?? "")
  // Guards against Escape → onBlur double-submit. In React 18 automatic
  // batching, state updates inside event handlers are batched; onBlur fires
  // synchronously before the batch applies, so `draft` still holds the
  // user's typed value when cancelEdit's setDraft hasn't flushed yet. The
  // ref bypasses the stale-closure problem entirely.
  const cancellingRef = useRef(false)
  const editVersionInfo = useVersionStore((s) => s.editVersionInfo)

  const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
  }
  const closeMenu = () => setMenuAnchor(null)

  const startEditing = () => {
    setDraft(version.description ?? "")
    setEditing(true)
  }

  const submitEdit = async () => {
    // Cancelled via Escape — onBlur fired after cancelEdit's state batch;
    // skip the submit so we don't overwrite the description with draft.
    if (cancellingRef.current) {
      cancellingRef.current = false
      return
    }
    setEditing(false)
    const next = draft.trim()
    if (next === (version.description ?? "").trim()) return
    try {
      // Description is the only user-facing label on a row. `name` stays
      // server-side for system messages (pre-restore copy, restored
      // snackbars) — derived from the composer's first line on create,
      // never edited from this surface.
      await editVersionInfo(diagramId, version.id, { description: next })
    } catch (err) {
      log.error("Edit description failed", err)
      toast.error(t.failureToCreate)
      setDraft(version.description ?? "")
    }
  }

  const cancelEdit = () => {
    cancellingRef.current = true
    setDraft(version.description ?? "")
    setEditing(false)
  }

  const onEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Plain Enter inserts a newline (so users can add a multi-line
    // description). Cmd/Ctrl+Enter submits — same rule as the composer.
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void submitEdit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    }
  }

  const copyLink = async () => {
    closeMenu()
    try {
      await navigator.clipboard.writeText(
        VersionApiClient.permalink(diagramId, version.id)
      )
      toast.success(t.copied)
    } catch (err) {
      log.error("Copy link failed", err)
      toast.error("Failed to copy link.")
    }
  }

  const named = isNamedVersion(version)
  const ago = relativeTime(version.createdAt)
  const description = version.description?.trim()
  // Used for the accessible aria-label only. Pre-restore auto-snapshots
  // have a system-generated name but no description; user saves without
  // a description have neither — their #N identity is already in the label.
  const label = description || version.name?.trim() || ""
  const clickable = !version.pending && !editing

  // Whole row triggers preview when clicked. The menu button and the inline
  // edit field stop propagation so they don't double-fire.
  const handleRowClick = () => {
    if (!clickable) return
    onPreview(version.id)
  }

  return (
    <ListItem
      role="option"
      aria-selected={isPreviewing}
      aria-label={`Version ${
        versionNumber ? `#${versionNumber}` : "(saving)"
      }, created ${ago}${label ? ` — ${label}` : ""}`}
      onClick={handleRowClick}
      sx={{
        opacity: version.pending ? 0.7 : 1,
        bgcolor: isPreviewing ? ROW_SELECTED_BG : "transparent",
        borderLeft: version.failed
          ? "3px solid var(--apollon-alert-danger-color)"
          : "3px solid transparent",
        color: TEXT_PRIMARY,
        gap: 1.5,
        py: 1,
        alignItems: "flex-start",
        cursor: clickable ? "pointer" : "default",
        "&:hover": clickable ? { bgcolor: ROW_HOVER_BG } : undefined,
      }}
    >
      {version.pending ? (
        <Box
          sx={{
            width: 64,
            height: 40,
            flexShrink: 0,
            bgcolor: ROW_HOVER_BG,
            borderRadius: 1,
            mt: 0.25,
          }}
          aria-hidden
        />
      ) : (
        <Box sx={{ mt: 0.25 }}>
          <VersionThumbnail
            diagramId={diagramId}
            versionId={version.id}
            isAuto={!named}
            compact
          />
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
        {editing ? (
          <InputBase
            autoFocus
            multiline
            maxRows={6}
            fullWidth
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
            }
            onClick={(e) => e.stopPropagation()}
            onBlur={() => void submitEdit()}
            onKeyDown={onEditKeyDown}
            placeholder={t.createPlaceholder}
            inputProps={{ "aria-label": "Edit description" }}
            sx={{
              fontSize: "0.8125rem",
              color: TEXT_PRIMARY,
              p: 0,
              mb: 0.25,
              "& textarea::placeholder": { color: TEXT_MUTED, opacity: 1 },
            }}
          />
        ) : description ? (
          // User-authored description — rendered slightly smaller and muted
          // so the #N · time-ago line reads as the primary identifier.
          <Typography
            sx={{
              fontSize: "0.8125rem",
              color: TEXT_MUTED,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.35,
              mb: 0.25,
            }}
          >
            {description}
          </Typography>
        ) : version.name?.trim() ? (
          // System-generated name (pre-restore label, timestamp fallback).
          // Styled as italic caption so users don't mistake it for a
          // user-added description — the kebab's "Add description" then
          // makes sense because no user-authored text is visible.
          <Typography
            variant="caption"
            sx={{
              color: TEXT_MUTED,
              fontStyle: "italic",
              display: "block",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.35,
              mb: 0.25,
            }}
          >
            {version.name.trim()}
          </Typography>
        ) : null}
        <Typography
          variant="caption"
          sx={{ color: TEXT_MUTED, display: "block" }}
        >
          {versionNumber !== undefined && (
            <Box component="span" sx={{ fontWeight: 600 }}>
              #{versionNumber}
            </Box>
          )}
          {versionNumber !== undefined && " · "}
          {ago}
          {version.pending && ` · ${t.saving}`}
          {version.failed && ` · failed`}
        </Typography>
      </Box>

      <ListItemSecondaryAction sx={{ top: 12, transform: "none" }}>
        <IconButton
          size="small"
          onClick={openMenu}
          aria-label="Version actions"
          aria-haspopup="menu"
          disabled={Boolean(version.pending)}
          sx={{ color: TEXT_PRIMARY }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </ListItemSecondaryAction>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "var(--apollon-background)",
              color: "var(--apollon-primary-contrast)",
              border: "1px solid var(--apollon-switch-box-border-color)",
              "& .MuiMenuItem-root": {
                color: "var(--apollon-primary-contrast)",
                "&:hover": {
                  backgroundColor: "var(--apollon-background-variant)",
                },
              },
            },
          },
        }}
      >
        {/* "Preview" is intentionally absent: clicking the row already
            previews. The kebab is reserved for actions that aren't
            obvious from the row itself. */}
        <MenuItem
          onClick={() => {
            closeMenu()
            onRestore(version.id)
          }}
        >
          {t.restoreThis}
        </MenuItem>
        <MenuItem onClick={copyLink}>{t.copyLink}</MenuItem>
        {/* Adding a description on an empty-meta row promotes it visually
            (no longer eligible for collapse) and protects it from the
            eviction-priority sweep. Pure metadata — no protocol event.

            We defer `startEditing` past the menu's focus-restoration
            tick (MUI Menu returns focus to the kebab on close). Without
            the rAF, the InputBase's autoFocus loses to that, fires
            onBlur immediately, and `submitEdit` early-returns on the
            unchanged empty draft — making the action look broken. */}
        <MenuItem
          onClick={() => {
            closeMenu()
            requestAnimationFrame(() => startEditing())
          }}
        >
          {description ? t.editDescription : t.addDescription}
        </MenuItem>
        {named && [
          <Divider key="divider" sx={{ my: 0.5 }} />,
          <MenuItem
            key="delete"
            onClick={() => {
              closeMenu()
              onDelete(version.id)
            }}
            sx={{ color: "var(--apollon-alert-danger-color) !important" }}
          >
            {t.delete}
          </MenuItem>,
        ]}
      </Menu>
    </ListItem>
  )
}
