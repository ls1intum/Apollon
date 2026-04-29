import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import { useEffect, useMemo, useState, type FC } from "react"
import { toast } from "react-toastify"
import { useEditorContext, useModalContext } from "@/contexts"
import {
  selectVersions,
  useVersionStore,
  type PendingVersion,
} from "@/stores/useVersionStore"
import { ApiError } from "@/services/DiagramApiClient"
import { versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"
import { VersionListItem } from "./VersionListItem"
import { VersionCompareBanner } from "./VersionCompareBanner"

const MAX_VERSIONS = Number(
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_MAX_VERSIONS_PER_DIAGRAM ?? 50
)
const MAX_DESCRIPTION_LENGTH = 240
/** Sidebar width on desktop. Narrow enough to keep the canvas usable. */
const SIDEBAR_WIDTH = 320
/** Slide-in animation duration matched to MUI's standard transition. */
const SIDEBAR_ANIMATION_MS = 220

interface Props {
  diagramId: string
}

/**
 * Chrome-free body of the version-history panel. Reused by:
 *
 *  - `VersionSidebar` (desktop ≥ md): rendered inline as a flex sibling of
 *    the canvas so it doesn't overlay the user's work.
 *  - `VersionDrawer` (mobile <sm): rendered inside an MUI bottom-sheet
 *    Drawer because there isn't room for two columns on small viewports.
 */
const VersionSidebarBody: FC<Props> = ({ diagramId }) => {
  const closeDrawer = useVersionStore((s) => s.closeDrawer)
  const versions = useVersionStore((s) => selectVersions(s, diagramId))
  const total = useVersionStore((s) => s.totals[diagramId])
  const nextCursor = useVersionStore((s) => s.nextCursor[diagramId])
  const loading = useVersionStore((s) => s.loading)
  const errorCode = useVersionStore((s) => s.error)
  const fetchVersions = useVersionStore((s) => s.fetchVersions)
  const loadMoreVersions = useVersionStore((s) => s.loadMoreVersions)
  const createVersion = useVersionStore((s) => s.createVersion)
  const enterPreview = useVersionStore((s) => s.enterPreview)
  const restoreVersion = useVersionStore((s) => s.restoreVersion)
  const compareState = useVersionStore((s) => s.compare)

  const { editor } = useEditorContext()
  const { openModal } = useModalContext()

  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeRowId, setActiveRowId] = useState<string | null>(null)

  useEffect(() => {
    void fetchVersions(diagramId)
  }, [diagramId, fetchVersions])

  const groupedVersions = useMemo(() => groupAutoRuns(versions), [versions])

  const latestVersion = versions[0]
  const headerSubtitle = latestVersion
    ? t.lastVersion(
        latestVersion.name || t.unnamed,
        relativeTime(latestVersion.createdAt)
      )
    : t.noVersionYet

  const handleCreate = async () => {
    if (!editor || submitting) return
    setSubmitting(true)
    const lines = draft.split("\n")
    const typedName = (lines[0] ?? "").trim()
    const description = lines.slice(1).join("\n").trim()
    const name = typedName || `Snapshot — ${new Date().toLocaleString()}`
    try {
      await createVersion(diagramId, editor.model, {
        name,
        description: description || undefined,
      })
      setDraft("")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "BODY_TOO_LARGE") toast.error(t.failureBodyTooLarge)
        else toast.error(t.failureToCreate)
      } else {
        toast.error(t.failureToCreate)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handlePreview = async (versionId: string) => {
    if (!editor) return
    try {
      await enterPreview(diagramId, versionId, editor.model)
    } catch {
      toast.error(t.previewFailed)
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!editor) return
    try {
      const { autoSnapshotVersionId } = await restoreVersion(
        diagramId,
        versionId,
        editor.model
      )
      void autoSnapshotVersionId
    } catch (err) {
      if (err instanceof ApiError && err.code === "SCHEMA_UNSUPPORTED") {
        toast.error(t.failureSchemaUnsupported)
      } else {
        toast.error(t.restoreFailed)
      }
    }
  }

  const handleDelete = (versionId: string) => {
    openModal("DELETE_VERSION", { diagramId, versionId })
  }

  const totalDisplay = total ?? versions.filter((v) => !v.pending).length

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        // Theme is driven by CSS custom properties on document root
        // (see `useThemeStore` + `themings.json`), not MUI's ThemeProvider.
        // All colors use those variables so the sidebar follows the app's
        // light/dark toggle.
        bgcolor: "var(--apollon-background)",
        color: "var(--apollon-primary-contrast)",
      }}
      role="complementary"
      aria-label={t.drawerTitle}
    >
      {/* Header: a single line. The navbar already says "Version history"
          (the button toggling this sidebar), so the redundant title is
          dropped. We surface only the count and the "last version • Xm ago"
          context — that's the information the user actually scans for. */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid var(--apollon-modal-bottom-border)",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Stack
          direction="row"
          alignItems="baseline"
          spacing={1}
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: "var(--apollon-primary-contrast)",
              whiteSpace: "nowrap",
            }}
          >
            {totalDisplay}
            <Box
              component="span"
              sx={{ color: "var(--apollon-secondary)", fontWeight: 400 }}
            >
              {" / "}
              {MAX_VERSIONS}
            </Box>
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "var(--apollon-secondary)",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={headerSubtitle}
          >
            · {headerSubtitle}
          </Typography>
        </Stack>
        <IconButton
          size="small"
          onClick={() => closeDrawer(diagramId)}
          aria-label={t.closeSidebar}
          sx={{ color: "var(--apollon-primary-contrast)" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid var(--apollon-modal-bottom-border)",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <TextField
          multiline
          rows={2}
          size="small"
          placeholder={t.createPlaceholder}
          value={draft}
          onChange={(e) =>
            setDraft(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
          }
          inputProps={{
            "aria-label": "Version name and description",
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: "var(--apollon-primary-contrast)",
              backgroundColor: "var(--apollon-background)",
              "& fieldset": {
                borderColor: "var(--apollon-switch-box-border-color)",
              },
              "&:hover fieldset": {
                borderColor: "var(--apollon-primary-contrast)",
              },
              "&.Mui-focused fieldset": {
                borderColor: "var(--apollon-primary)",
              },
            },
            "& .MuiInputBase-input::placeholder": {
              color: "var(--apollon-secondary)",
              opacity: 1,
            },
          }}
        />
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="caption"
            sx={{ color: "var(--apollon-secondary)" }}
          >
            {draft.length} / {MAX_DESCRIPTION_LENGTH}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleCreate}
            disabled={submitting || !editor}
            sx={{
              textTransform: "none",
              backgroundColor: "var(--apollon-primary)",
              "&:hover": {
                backgroundColor: "var(--apollon-primary)",
                opacity: 0.9,
              },
            }}
          >
            {submitting ? <CircularProgress size={14} /> : t.createButton}
          </Button>
        </Stack>
      </Box>

      {compareState && (
        <Box sx={{ p: 1 }}>
          <VersionCompareBanner diagramId={diagramId} />
        </Box>
      )}

      <Box sx={{ flex: 1, overflow: "auto" }}>
        {errorCode === "REDIS_UNAVAILABLE" ? (
          <Box sx={{ p: 2 }}>
            <Typography
              variant="body2"
              sx={{ color: "var(--apollon-alert-warning-yellow)" }}
            >
              {t.failureRedis}
            </Typography>
          </Box>
        ) : loading && versions.length === 0 ? (
          <List>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ p: 2, display: "flex", gap: 1.5 }}>
                <Skeleton variant="rectangular" width={64} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" />
                  <Skeleton width="30%" />
                </Box>
              </Box>
            ))}
          </List>
        ) : versions.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: "var(--apollon-primary-contrast)",
              }}
            >
              {t.emptyTitle}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "var(--apollon-secondary)", mb: 2 }}
            >
              {t.emptyBody}
            </Typography>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={submitting || !editor}
              sx={{
                textTransform: "none",
                backgroundColor: "var(--apollon-primary)",
                "&:hover": {
                  backgroundColor: "var(--apollon-primary)",
                  opacity: 0.9,
                },
              }}
            >
              {t.emptyCta}
            </Button>
          </Box>
        ) : (
          <List
            role="listbox"
            aria-label={t.drawerTitle}
            tabIndex={0}
            onKeyDown={(e) => {
              const flat = versions.filter((v) => !v.pending)
              if (flat.length === 0) return
              const idx = flat.findIndex((v) => v.id === activeRowId)
              if (e.key === "ArrowDown") {
                e.preventDefault()
                const next = flat[Math.min(idx + 1, flat.length - 1)] ?? flat[0]
                if (next) setActiveRowId(next.id)
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                const next = flat[Math.max(idx - 1, 0)] ?? flat[0]
                if (next) setActiveRowId(next.id)
              } else if (e.key === "Enter" && activeRowId) {
                e.preventDefault()
                handlePreview(activeRowId)
              } else if (e.key === "Delete" && activeRowId) {
                e.preventDefault()
                handleDelete(activeRowId)
              }
            }}
          >
            {groupedVersions.map((entry) =>
              entry.kind === "auto-group" ? (
                <AutoGroupRow
                  key={entry.first.id}
                  group={entry}
                  diagramId={diagramId}
                  onPreview={handlePreview}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                  activeRowId={activeRowId}
                  setActiveRowId={setActiveRowId}
                />
              ) : (
                <VersionListItem
                  key={entry.version.id}
                  diagramId={diagramId}
                  version={entry.version}
                  isPreviewing={entry.version.id === activeRowId}
                  onPreview={handlePreview}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                />
              )
            )}
            {nextCursor && (
              <Box sx={{ px: 2, py: 1.5, textAlign: "center" }}>
                <Button
                  size="small"
                  onClick={() => loadMoreVersions(diagramId)}
                  disabled={loading}
                  sx={{
                    textTransform: "none",
                    color: "var(--apollon-primary)",
                  }}
                >
                  {t.loadOlder}
                </Button>
              </Box>
            )}
          </List>
        )}
      </Box>
    </Box>
  )
}

/**
 * Persistent desktop sidebar. Inline flex sibling of the canvas. Animates
 * in by transitioning `width` from 0 → SIDEBAR_WIDTH; the canvas reflows
 * smoothly alongside instead of being overlaid. The inner Box stays at a
 * fixed width so the contents don't shimmer during the animation — the
 * outer Box clips them via `overflow: hidden`.
 *
 * The body is unmounted when fully closed (after the animation finishes)
 * to avoid running its `fetchVersions` effect for diagrams the user never
 * opens, and to release the SVG-thumbnail observer.
 */
export const VersionSidebar: FC<Props> = ({ diagramId }) => {
  const open = useVersionStore((s) => Boolean(s.drawerOpenByDiagram[diagramId]))
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const handle = setTimeout(() => setMounted(false), SIDEBAR_ANIMATION_MS)
    return () => clearTimeout(handle)
  }, [open])

  return (
    <Box
      sx={{
        width: open ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        overflow: "hidden",
        transition: (theme) =>
          theme.transitions.create("width", {
            duration: SIDEBAR_ANIMATION_MS,
            easing: theme.transitions.easing.easeInOut,
          }),
        borderLeft: open ? "1px solid var(--apollon-modal-bottom-border)" : 0,
        bgcolor: "var(--apollon-background)",
      }}
      aria-hidden={!open}
    >
      <Box sx={{ width: SIDEBAR_WIDTH, height: "100%" }}>
        {mounted && <VersionSidebarBody diagramId={diagramId} />}
      </Box>
    </Box>
  )
}

/**
 * Mobile fallback. On `<sm` viewports there isn't room for a 400-pixel
 * column, so we keep the bottom-sheet pattern for the small-screen case.
 */
export const VersionDrawer: FC<Props> = ({ diagramId }) => {
  const theme = useTheme()
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"))
  const open = useVersionStore((s) => Boolean(s.drawerOpenByDiagram[diagramId]))
  const closeDrawer = useVersionStore((s) => s.closeDrawer)
  // Desktop uses the inline sidebar; this component is mobile-only.
  if (!isSmall) return null
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={() => closeDrawer(diagramId)}
      PaperProps={{
        sx: { height: "80vh", width: "100%" },
      }}
    >
      <VersionSidebarBody diagramId={diagramId} />
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// Auto-snapshot grouping — collapse consecutive auto rows under an expander.
// ---------------------------------------------------------------------------

type GroupedEntry =
  | { kind: "single"; version: PendingVersion }
  | {
      kind: "auto-group"
      first: PendingVersion
      versions: PendingVersion[]
    }

function groupAutoRuns(versions: readonly PendingVersion[]): GroupedEntry[] {
  const out: GroupedEntry[] = []
  let i = 0
  while (i < versions.length) {
    const v = versions[i]!
    if (v.kind !== "auto") {
      out.push({ kind: "single", version: v })
      i++
      continue
    }
    const run: PendingVersion[] = []
    while (i < versions.length && versions[i]!.kind === "auto") {
      run.push(versions[i]!)
      i++
    }
    if (run.length === 1) {
      out.push({ kind: "single", version: run[0]! })
    } else {
      out.push({ kind: "auto-group", first: run[0]!, versions: run })
    }
  }
  return out
}

interface AutoGroupRowProps {
  group: Extract<GroupedEntry, { kind: "auto-group" }>
  diagramId: string
  onPreview: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  activeRowId: string | null
  setActiveRowId: (id: string | null) => void
}

const AutoGroupRow: FC<AutoGroupRowProps> = ({
  group,
  diagramId,
  onPreview,
  onRestore,
  onDelete,
  activeRowId,
}) => {
  const [expanded, setExpanded] = useState(false)
  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={() => setExpanded((v) => !v)}
        sx={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: 0,
          p: 1.5,
          color: "var(--apollon-secondary)",
          cursor: "pointer",
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          "&:hover": {
            background: "var(--apollon-background-variant)",
          },
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
            isPreviewing={v.id === activeRowId}
            onPreview={onPreview}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
    </Box>
  )
}
