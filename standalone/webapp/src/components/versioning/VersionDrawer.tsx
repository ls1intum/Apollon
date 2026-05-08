import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  InputBase,
  List,
  Skeleton,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
} from "react"
import { toast } from "react-toastify"
import { useEditorContext, useModalContext } from "@/contexts"
import {
  selectVersions,
  useVersionStore,
  type PendingVersion,
} from "@/stores/useVersionStore"
import { ApiError, VersionApiClient } from "@/services/DiagramApiClient"
import { NAVBAR_BACKGROUND_COLOR } from "@/constants"
import { versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"
import { CurrentVersionRow } from "./CurrentVersionRow"
import { VersionListItem } from "./VersionListItem"

import { MAX_VERSIONS_PER_DIAGRAM as MAX_VERSIONS } from "@/constants"

const MAX_DESCRIPTION_LENGTH = 240
/** Sidebar width on desktop. Narrow enough to keep the canvas usable. */
const SIDEBAR_WIDTH = 320
/** Slide-in animation duration matched to MUI's standard transition. */
const SIDEBAR_ANIMATION_MS = 220

/**
 * Switches the sidebar to a bottom-sheet drawer at the same breakpoint
 * the navbar switches to its hamburger (`md:hidden` in `Navbar.tsx`,
 * Tailwind's md = 768px). This is the *only* place where a viewport
 * media query is the right tool — sidebar↔bottom-sheet is a page-level
 * layout decision driven by viewport chrome. Component-internal layout
 * (e.g. the preview banner) responds to its own container width via
 * `useElementWidth`, not this constant.
 */
const MOBILE_QUERY = "(max-width: 767.95px)"

// Sidebar lives on the navbar's dark plate, independent of the document
// theme — these are the on-dark text shades and rgba state tints used
// throughout. Kept local to this file because they're specific to that
// always-dark surface.
export const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)"
export const TEXT_MUTED = "rgba(255, 255, 255, 0.55)"
export const ROW_HOVER_BG = "rgba(255, 255, 255, 0.06)"
export const ROW_SELECTED_BG = "rgba(255, 255, 255, 0.10)"

/**
 * Structural fingerprint for dirty detection. We deliberately do NOT use
 * the editor's Yjs state vector here, even though that would be O(1):
 * React-Flow writes auto-derived layout noise (`measured`, transient
 * `position` round-trips, etc.) to the same Y.Maps as user-authored
 * content, so the SV bumps on every click as the renderer remeasures
 * the focused node. SV says "anything observed changed"; the question we
 * actually want to answer is "did anything _user-meaningful_ change."
 *
 * The replacer drops:
 *   - `selected`, `dragging`, `resizing`, `hidden` — UI/transient flags
 *   - `measured` — React-Flow's measurement output, fluctuates on focus
 *   - `selectable`, `draggable`, `connectable`, `deletable` — capability
 *     flags, set by config not by the user editing
 *
 * Mirrors `structuralFingerprint` in `services/autoVersion.ts` on the
 * server — both hash the same six fields (title, type, version, nodes,
 * edges, assessments) with the same VOLATILE_KEYS replacer, pinned by an
 * integration test. Drift here means the server fires spurious auto-versions
 * on UI churn the client correctly ignored. False positives are cheap; false
 * negatives cost the user a recovery point.
 */
const VOLATILE_KEYS = new Set([
  "selected",
  "dragging",
  "resizing",
  "hidden",
  "measured",
  "selectable",
  "draggable",
  "connectable",
  "deletable",
])

function structuralFingerprint(model: {
  nodes: unknown
  edges: unknown
  assessments?: unknown
  title?: unknown
  type?: unknown
  version?: unknown
}): string {
  return JSON.stringify(
    {
      nodes: model.nodes,
      edges: model.edges,
      assessments: model.assessments,
      title: model.title,
      type: model.type,
      version: model.version,
    },
    (key, value) => (VOLATILE_KEYS.has(key) ? undefined : value)
  )
}

interface Props {
  diagramId: string
  onVersionSaved?: (headRev?: number) => void
}

/**
 * Chrome-free body of the version-history panel. Reused by:
 *
 *  - `VersionSidebar` (desktop ≥ md): rendered inline as a flex sibling of
 *    the canvas so it doesn't overlay the user's work.
 *  - `VersionDrawer` (mobile <sm): rendered inside an MUI bottom-sheet
 *    Drawer because there isn't room for two columns on small viewports.
 */
const VersionSidebarBody: FC<Props> = ({ diagramId, onVersionSaved }) => {
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
  const previewState = useVersionStore((s) => s.preview)

  const { editor } = useEditorContext()
  const { openModal } = useModalContext()

  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeRowId, setActiveRowId] = useState<string | null>(null)
  /**
   * Tracks the id of the last version saved locally (via handleCreate) so
   * the fingerprint baseline can be taken from `editor.model` (fast path)
   * instead of fetching the version body from the server.
   */
  const lastLocalSaveIdRef = useRef<string | null>(null)

  useEffect(() => {
    void fetchVersions(diagramId)
  }, [diagramId, fetchVersions])

  // Filter: when off, hide every unnamed row entirely (matches Figma's "Show
  // autosave versions" toggle). Default ON so users see their full history
  // out of the box; flipping it off gives a clean milestone-only view.
  const [showAutosaves, setShowAutosaves] = useState(true)
  const filteredVersions = useMemo(
    () => (showAutosaves ? versions : versions.filter(isNamedVersion)),
    [versions, showAutosaves]
  )
  const groupedVersions = useMemo(
    () => groupUnnamedRuns(filteredVersions),
    [filteredVersions]
  )

  const latestVersion = versions[0]
  const sectionSubtitle = latestVersion
    ? t.lastVersion(relativeTime(latestVersion.createdAt))
    : t.noVersionYet

  // ---------------------------------------------------------------------------
  // Dirty-detection via structural fingerprint. Whenever a snapshot lands
  // (manual save, server-fired auto-version, collaborator save) we capture
  // a fingerprint of the editor's model at that moment. On every Yjs/store
  // change we recompute the fingerprint and compare. Selection clicks,
  // measurement noise, and other React-Flow ephemera are filtered out by
  // the replacer in `structuralFingerprint` — only user-meaningful changes
  // flip the state.
  // ---------------------------------------------------------------------------
  const latestSavedVersion = useMemo(
    () => versions.find((v) => !v.pending && !v.failed),
    [versions]
  )
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(true)

  // Re-baseline the fingerprint on every new latest-saved version.
  //
  // Two cases:
  //  1. Local save (handleCreate just ran): `lastLocalSaveIdRef.current`
  //     matches the new version id. At this point `editor.model` IS the
  //     saved state, so we can fingerprint it synchronously — no fetch
  //     needed and no async race.
  //  2. Collaborator/server-fired version, or initial mount: we do NOT
  //     know what the editor model was at save time, so we fetch the
  //     actual version body from the server and fingerprint that. This is
  //     the only way to get a correct baseline on page load (the editor
  //     may already have unsaved changes) or after a collaborator saves.
  useEffect(() => {
    if (!editor) return
    if (!latestSavedVersion) {
      setSavedFingerprint(null)
      setHasChanges(true)
      return
    }
    if (lastLocalSaveIdRef.current === latestSavedVersion.id) {
      // Fast path: we just saved this version locally — editor model is authoritative.
      setSavedFingerprint(structuralFingerprint(editor.model))
      setHasChanges(false)
      return
    }
    // Slow path: fetch the actual version body so the baseline is the
    // server's canonical snapshot, not the potentially-dirty editor state.
    VersionApiClient.getBody(
      latestSavedVersion.diagramId,
      latestSavedVersion.id
    )
      .then((body) => {
        setSavedFingerprint(structuralFingerprint(body))
      })
      .catch(() => {
        // Fallback: if the fetch fails, assume unsaved changes exist rather
        // than hiding the Save button. False-positive is safe; false-negative
        // (hiding real changes) is not.
        setSavedFingerprint(null)
        setHasChanges(true)
      })
  }, [editor, latestSavedVersion?.id])

  useEffect(() => {
    if (!editor) return
    if (savedFingerprint === null) {
      setHasChanges(true)
      return
    }
    const recompute = () => {
      setHasChanges(structuralFingerprint(editor.model) !== savedFingerprint)
    }
    recompute()
    const subId = editor.subscribeToModelChange(recompute)
    return () => {
      editor.unsubscribe(subId)
    }
  }, [editor, savedFingerprint])

  // While previewing, `editor.model` reflects the previewed snapshot — saving
  // it would just duplicate that version (or produce a misleading "new"
  // version of old content). Block Save in that mode regardless of diff.
  const canSave = Boolean(editor) && hasChanges && previewState === null

  const handleCreate = async () => {
    if (!editor || submitting || !canSave) return
    setSubmitting(true)
    const description = draft.trim()
    // Name is now an internal label only — the UI surfaces the description.
    // Default to a timestamped snapshot when no description is provided so
    // restored snackbars and copy-link tooltips stay readable.
    const name = description
      ? description.split("\n")[0]!.slice(0, 80)
      : (() => {
          const d = new Date()
          const dd = String(d.getDate()).padStart(2, "0")
          const mm = String(d.getMonth() + 1).padStart(2, "0")
          const yyyy = d.getFullYear()
          const hh = String(d.getHours()).padStart(2, "0")
          const min = String(d.getMinutes()).padStart(2, "0")
          return `${dd}.${mm}.${yyyy}, ${hh}:${min}`
        })()
    try {
      const summary = await createVersion(diagramId, editor.model, {
        name,
        description: description || undefined,
      })
      // Record the id before React re-renders so the baseline effect
      // (latestSavedVersion?.id dep) sees it synchronously and takes the
      // fast path (editor.model fingerprint) instead of fetching the body.
      lastLocalSaveIdRef.current = summary.id
      onVersionSaved?.(summary.headRev)
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
      await enterPreview(diagramId, versionId)
    } catch {
      toast.error(t.previewFailed)
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!editor) return
    try {
      const { headRev } = await restoreVersion(
        diagramId,
        versionId,
        editor.model
      )
      onVersionSaved?.(headRev)
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

  // Map version id → display number (#N). Prefer the server-assigned
  // monotonic `seq` so the number reflects "Nth version you ever made"
  // and survives eviction. Pre-`seq` rows fall back to a derived
  // rank-among-stored: that's what we used to display, accurate for
  // diagrams that never hit the cap and degrade-gracefully for legacy
  // rows committed before the counter existed.
  const versionNumberById = useMemo(() => {
    const saved = versions.filter((v) => !v.pending)
    const map = new Map<string, number>()
    const fallbackTop = total ?? saved.length
    saved.forEach((v, i) => {
      if (typeof v.seq === "number") map.set(v.id, v.seq)
      else map.set(v.id, fallbackTop - i)
    })
    return map
  }, [versions, total])

  const handleComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter saves; plain Enter inserts a newline (multi-line desc).
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleCreate()
    }
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        // Whole sidebar paints the navbar dark colour so it visually
        // continues the top bar in both themes. Text is light, with rgba
        // hover/selected tints so dark/light toggle isn't needed here.
        bgcolor: NAVBAR_BACKGROUND_COLOR,
        color: TEXT_PRIMARY,
      }}
      role="complementary"
      aria-label={t.drawerTitle}
    >
      {/* Composer: flat textarea with the Save button stacked underneath
          so the save target is unambiguous and the textarea owns the full
          width. Cmd/Ctrl+Enter submits; plain Enter inserts a newline.

          Hidden entirely while previewing — there's nothing meaningful to
          save while the canvas reflects an old snapshot, and showing it
          alongside the read-only banner is contradictory UX. */}
      {previewState === null && (
        <Box
          sx={{
            px: 2,
            pt: 1.5,
            pb: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 0.75,
          }}
        >
          <InputBase
            multiline
            maxRows={4}
            fullWidth
            placeholder={t.createPlaceholder}
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
            }
            onKeyDown={handleComposerKeyDown}
            inputProps={{ "aria-label": "Describe this version" }}
            sx={{
              fontSize: "0.85rem",
              color: TEXT_PRIMARY,
              "& textarea::placeholder": { color: TEXT_MUTED, opacity: 1 },
            }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleCreate}
            disabled={submitting || !canSave}
            title={
              !canSave && previewState !== null
                ? "Exit preview to save a new version"
                : !canSave && !hasChanges
                  ? "No changes since the last saved version"
                  : undefined
            }
            disableElevation
            sx={{
              alignSelf: "flex-end",
              textTransform: "none",
              px: 1.75,
              py: 0.5,
              fontWeight: 600,
              color: NAVBAR_BACKGROUND_COLOR,
              backgroundColor: TEXT_PRIMARY,
              "&:hover": { backgroundColor: "#ffffff" },
              "&.Mui-disabled": {
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                color: TEXT_MUTED,
              },
            }}
          >
            {submitting ? (
              <CircularProgress size={14} sx={{ color: TEXT_MUTED }} />
            ) : (
              t.createButton
            )}
          </Button>
        </Box>
      )}

      {/* Section meta: counter + "last saved Xm ago" + autosave filter
          toggle. Borderless — separation comes from spacing. The toggle
          mirrors Figma's "Show autosave versions" — default on; flipping
          off hides every empty-meta row for a milestone-only view. */}
      <Box
        sx={{
          px: 2,
          py: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: TEXT_PRIMARY, fontWeight: 600, whiteSpace: "nowrap" }}
        >
          {totalDisplay}
          <Box component="span" sx={{ color: TEXT_MUTED, fontWeight: 400 }}>
            {" / "}
            {MAX_VERSIONS}
          </Box>
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: TEXT_MUTED,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={sectionSubtitle}
        >
          · {sectionSubtitle}
        </Typography>
        <Tooltip
          title={
            showAutosaves ? "Hide autosave versions" : "Show autosave versions"
          }
        >
          <IconButton
            size="small"
            onClick={() => setShowAutosaves((v) => !v)}
            aria-label={
              showAutosaves
                ? "Hide autosave versions"
                : "Show autosave versions"
            }
            aria-pressed={showAutosaves}
            sx={{ color: showAutosaves ? TEXT_PRIMARY : TEXT_MUTED, p: 0.25 }}
          >
            <HistoryToggleOffIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <CurrentVersionRow
        hasChanges={hasChanges}
        latestSavedVersion={latestSavedVersion}
      />

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
          <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: TEXT_MUTED }}>
              {t.emptyBody}
            </Typography>
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
                  versionNumberById={versionNumberById}
                />
              ) : (
                <VersionListItem
                  key={entry.version.id}
                  diagramId={diagramId}
                  version={entry.version}
                  versionNumber={versionNumberById.get(entry.version.id)}
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
                  sx={{ textTransform: "none", color: TEXT_PRIMARY }}
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
export const VersionSidebar: FC<Props> = ({ diagramId, onVersionSaved }) => {
  // Below the navbar's mobile threshold the bottom-sheet
  // `<VersionDrawer>` takes over; render nothing here so the sidebar
  // doesn't eat 320px of width on phones or in the awkward
  // 600–768px range where the navbar is already mobile.
  const isSmall = useMediaQuery(MOBILE_QUERY)
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

  if (isSmall) return null

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
        bgcolor: NAVBAR_BACKGROUND_COLOR,
      }}
      aria-hidden={!open}
    >
      <Box sx={{ width: SIDEBAR_WIDTH, height: "100%" }}>
        {mounted && (
          <VersionSidebarBody
            diagramId={diagramId}
            onVersionSaved={onVersionSaved}
          />
        )}
      </Box>
    </Box>
  )
}

/**
 * Mobile fallback. On `<sm` viewports there isn't room for a 400-pixel
 * column, so we keep the bottom-sheet pattern for the small-screen case.
 */
export const VersionDrawer: FC<Props> = ({ diagramId, onVersionSaved }) => {
  const isSmall = useMediaQuery(MOBILE_QUERY)
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
      <VersionSidebarBody
        diagramId={diagramId}
        onVersionSaved={onVersionSaved}
      />
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// Sidebar grouping — collapse consecutive *unnamed* rows under an expander.
//
// The display split tracks `name`/`description`, not `kind`. A version with
// either field non-empty is a milestone (always rendered as a full row); an
// empty-meta row is an autosave (eligible for collapse). Naming an autosave
// (via "Name this version") promotes it visually without changing its kind.
// This matches Figma: autosaves and named versions live in the same list,
// autosaves between named ones collapse so the timeline stays scannable.
// ---------------------------------------------------------------------------

type GroupedEntry =
  | { kind: "single"; version: PendingVersion }
  | {
      kind: "auto-group"
      first: PendingVersion
      versions: PendingVersion[]
    }

/** True when the version has user-authored metadata (name or description). */
export function isNamedVersion(v: PendingVersion): boolean {
  return Boolean(v.name?.trim() || v.description?.trim())
}

function groupUnnamedRuns(versions: readonly PendingVersion[]): GroupedEntry[] {
  const out: GroupedEntry[] = []
  let i = 0
  while (i < versions.length) {
    const v = versions[i]!
    if (isNamedVersion(v)) {
      out.push({ kind: "single", version: v })
      i++
      continue
    }
    const run: PendingVersion[] = []
    while (i < versions.length && !isNamedVersion(versions[i]!)) {
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
  versionNumberById: Map<string, number>
}

const AutoGroupRow: FC<AutoGroupRowProps> = ({
  group,
  diagramId,
  onPreview,
  onRestore,
  onDelete,
  activeRowId,
  versionNumberById,
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
            isPreviewing={v.id === activeRowId}
            onPreview={onPreview}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
    </Box>
  )
}
