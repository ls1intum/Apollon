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
  Fragment,
  useState,
  useRef,
  type FC,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react"
import { Link } from "@tanstack/react-router"
import { PREVIEW_VERSION_PARAM } from "@/hooks/useVersionPreviewUrlSync"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { useVersionStore, type PendingVersion } from "@/stores/useVersionStore"
import { getVersionRepository } from "@/services/versionRepository"
import { MAX_DESCRIPTION_LENGTH, versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"
import {
  ROW_HOVER_BG,
  ROW_SELECTED_BG,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "./theme"
import { isNamedVersion } from "@/lib/version/predicates"

interface Props {
  diagramId: string
  version: PendingVersion
  /** Display rank among saved versions (newest = highest). Undefined for pending. */
  versionNumber?: number
  isPreviewing: boolean
  /**
   * False when restoring this version would be a no-op (the row IS the
   * latest saved version AND the canvas already matches it). Hides the
   * Restore action so the kebab only offers actions that change state.
   */
  canRestore: boolean
  onPreview: (versionId: string) => void
  onRestore: (versionId: string) => void
  onDelete: (versionId: string) => void
}

/**
 * Clickable row body. A real `<Link>` to `?version=<id>` so cmd/ctrl/middle-
 * click opens the version's preview in a new tab (same as gallery cards);
 * plain left-click stays in-SPA via `onPreview`. `tabIndex={-1}` keeps it out
 * of the listbox tab order — keyboard nav drives selection from the list. Non-
 * clickable rows (pending / editing) render a plain box with no navigation.
 */
const RowBody: FC<{
  clickable: boolean
  versionId: string
  onPreview: (versionId: string) => void
  children: ReactNode
}> = ({ clickable, versionId, onPreview, children }) => {
  if (!clickable) {
    return (
      <Box
        sx={{
          display: "flex",
          flex: 1,
          minWidth: 0,
          gap: 1.5,
          alignItems: "flex-start",
        }}
      >
        {children}
      </Box>
    )
  }
  return (
    <Link
      to="."
      search={(prev) => ({ ...prev, [PREVIEW_VERSION_PARAM]: versionId })}
      tabIndex={-1}
      onClick={(e) => {
        // Let the browser handle modified clicks (open in a new tab/window).
        if (e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        onPreview(versionId)
      }}
      style={{
        display: "flex",
        flex: 1,
        minWidth: 0,
        gap: "12px",
        alignItems: "flex-start",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {children}
    </Link>
  )
}

const VersionListItemInner: FC<Props> = ({
  diagramId,
  version,
  versionNumber,
  isPreviewing,
  canRestore,
  onPreview,
  onRestore,
  onDelete,
}) => {
  // Single source of truth for permalink visibility: the active
  // repository decides via its `permalink()` return value. Local mode
  // returns null; remote returns a URL. No prop, no drift.
  const permalinkUrl = getVersionRepository().permalink(diagramId, version.id)
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
      toast.error(t.failureToEdit)
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
    if (!permalinkUrl) return
    try {
      await navigator.clipboard.writeText(permalinkUrl)
      toast.success(t.copied)
    } catch (err) {
      log.error("Copy link failed", err)
      toast.error(t.copyFailed)
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

  return (
    <Fragment>
      <ListItem
        id={`version-row-${version.id}`}
        role="option"
        aria-selected={isPreviewing}
        aria-label={`Version ${
          versionNumber ? `#${versionNumber}` : "(saving)"
        }, created ${ago}${label ? ` — ${label}` : ""}`}
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
        <RowBody
          clickable={clickable}
          versionId={version.id}
          onPreview={onPreview}
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
            ) : version.kind === "user" ? (
              // User explicitly saved this version but added no description.
              // Show a placeholder so it doesn't look identical to a raw autosave.
              <Typography
                variant="caption"
                sx={{
                  color: TEXT_MUTED,
                  fontStyle: "italic",
                  display: "block",
                  lineHeight: 1.35,
                  mb: 0.25,
                }}
              >
                {t.noDescription}
              </Typography>
            ) : version.name?.trim() ? (
              // System-generated name (pre-restore label). Styled as italic
              // caption so users don't mistake it for a user-added description —
              // the kebab's "Add description" makes sense because no user-authored
              // text is visible.
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
            ) : (
              // Raw periodic auto-save — no user-authored content at all.
              // 'Auto-saved' tells the user this is a system checkpoint, not
              // a deliberate save, matching the same italic/muted register as
              // the pre-restore label above.
              <Typography
                variant="caption"
                sx={{
                  color: TEXT_MUTED,
                  fontStyle: "italic",
                  display: "block",
                  lineHeight: 1.35,
                  mb: 0.25,
                }}
              >
                {t.autoSaved}
              </Typography>
            )}
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
        </RowBody>

        <ListItemSecondaryAction sx={{ top: 12, transform: "none" }}>
          <IconButton
            size="small"
            onClick={openMenu}
            aria-label="Version actions"
            aria-haspopup="menu"
            disabled={Boolean(version.pending)}
            sx={{
              color: TEXT_PRIMARY,
              borderRadius: "var(--apollon-chrome-radius-sm)",
              "&:hover": { backgroundColor: ROW_HOVER_BG },
              "&:active": { backgroundColor: ROW_SELECTED_BG },
              "&:focus-visible": {
                outline: "2px solid var(--apollon-chrome-accent)",
                outlineOffset: "2px",
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>

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
        {canRestore && (
          <MenuItem
            onClick={() => {
              closeMenu()
              onRestore(version.id)
            }}
          >
            {t.restoreThis}
          </MenuItem>
        )}
        {permalinkUrl && <MenuItem onClick={copyLink}>{t.copyLink}</MenuItem>}
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
    </Fragment>
  )
}

export const VersionListItem = VersionListItemInner
