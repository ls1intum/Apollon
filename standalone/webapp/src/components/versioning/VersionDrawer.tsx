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
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
} from "react"
import { toast } from "react-toastify"
import { useEditorContext, useModalContext } from "@/contexts"
import { selectVersions, useVersionStore } from "@/stores/useVersionStore"
import { ApiError } from "@/services/DiagramApiClient"
import { getVersionRepository } from "@/services/versionRepository"
import { NAVBAR_BACKGROUND_COLOR } from "@/constants"
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  versioningStrings as t,
} from "./strings"
import { relativeTime } from "./relativeTime"
import { CurrentVersionRow } from "./CurrentVersionRow"
import { VersionListItem } from "./VersionListItem"
import AutoGroupRow from "./AutoGroupRow"
import { TEXT_PRIMARY, TEXT_MUTED, ROW_HOVER_BG } from "./theme"
import { structuralFingerprint, isNamedVersion } from "@/lib/version/predicates"
import { groupUnnamedRuns } from "./utils"

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

interface Props {
  diagramId: string
  onVersionSaved?: (headRev?: number) => void
  /**
   * Local mode swaps the snackbar for an always-visible "Before
   * restoring …" auto-row + a confirm dialog when the canvas is dirty.
   * Page-level handler — drawer just calls it.
   */
  onConfirmedRestore?: (versionId: string) => Promise<void> | void
}

/**
 * Chrome-free body of the version-history panel. Reused by:
 *
 *  - `VersionSidebar` (desktop ≥ md): rendered inline as a flex sibling of
 *    the canvas so it doesn't overlay the user's work.
 *  - `VersionDrawer` (mobile <sm): rendered inside an MUI bottom-sheet
 *    Drawer because there isn't room for two columns on small viewports.
 */
const VersionSidebarBody: FC<Props> = ({
  diagramId,
  onVersionSaved,
  onConfirmedRestore,
}) => {
  const repo = getVersionRepository()
  const isLocal = repo.kind === "local"
  const MAX_VERSIONS = repo.cap
  const versions = useVersionStore((s) => selectVersions(s, diagramId))
  const total = useVersionStore((s) => s.totals[diagramId])
  const nextCursor = useVersionStore((s) => s.nextCursor[diagramId])
  const loading = useVersionStore((s) => s.loading[diagramId] ?? false)
  const errorCode = useVersionStore((s) => s.error[diagramId] ?? null)
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
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  // Subscribe to model changes so the empty-diagram check (drives Save
  // disable) reacts as the user adds the first node.
  const [isEmptyDiagram, setIsEmptyDiagram] = useState(true)
  useEffect(() => {
    if (!editor) return
    const compute = () =>
      setIsEmptyDiagram(
        (editor.model.nodes?.length ?? 0) === 0 &&
          (editor.model.edges?.length ?? 0) === 0
      )
    compute()
    const subId = editor.subscribeToModelChange(compute)
    return () => editor.unsubscribe(subId)
  }, [editor])
  /**
   * Tracks the id of the last version saved locally (via handleCreate) so
   * the fingerprint baseline can be taken from `editor.model` (fast path)
   * instead of fetching the version body from the server.
   */
  const lastLocalSaveIdRef = useRef<string | null>(null)

  // No fetch-on-mount here: the editor page (ApollonLocal / ApollonWithConnection)
  // binds the repository and fetches in one effect, and the bootstrap keeps the
  // list fresh (cross-tab + visibility refetch, collab control events). A fetch
  // here would race the page's repository binding on a reload with the drawer
  // already open — it would run against the default adapter (child effects flush
  // before the parent page effect).

  // Filter: when off, hide every unnamed row entirely (matches Figma's "Show
  // autosave versions" toggle). Default ON so users see their full history
  // out of the box; flipping it off gives a clean milestone-only view.
  const [showAutosaves, setShowAutosaves] = useState(true)
  const filteredVersions = showAutosaves
    ? versions
    : versions.filter(isNamedVersion)
  const groupedVersions = groupUnnamedRuns(filteredVersions)

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
  const latestSavedVersion = versions.find((v) => !v.pending && !v.failed)
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
    // canonical snapshot (server in collab mode, IDB in local mode), not
    // the potentially-dirty editor state.
    getVersionRepository()
      .getBody(latestSavedVersion.diagramId, latestSavedVersion.id)
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
    // Debounced — `structuralFingerprint` JSON.stringify's all nodes/edges
    // and `subscribeToModelChange` fires on every keystroke (O(N) per char
    // on large diagrams).
    let timer: ReturnType<typeof setTimeout> | null = null
    const recompute = () => {
      setHasChanges(structuralFingerprint(editor.model) !== savedFingerprint)
    }
    const scheduleRecompute = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(recompute, 200)
    }
    recompute()
    const subId = editor.subscribeToModelChange(scheduleRecompute)
    return () => {
      if (timer) clearTimeout(timer)
      editor.unsubscribe(subId)
    }
  }, [editor, savedFingerprint])

  // While previewing, `editor.model` reflects the previewed snapshot — saving
  // it would just duplicate that version (or produce a misleading "new"
  // version of old content). Block Save in that mode regardless of diff.
  // Also block on empty diagrams (server skips them too — avoids the
  // phantom-v1 confusion described in `services/autoVersion.ts:87`).
  const canSave =
    Boolean(editor) && hasChanges && previewState === null && !isEmptyDiagram

  const handleCreate = async () => {
    if (!editor || submitting || !canSave) return
    // Request persistent storage from inside the click handler — running
    // it after the await chain below would leave the user-gesture window
    // (Firefox would silently deny). No-op for adapters that don't
    // implement the optional method.
    void repo.requestPersistence?.()
    setSubmitting(true)
    const description = draft.trim()
    // `name` is an internal label — the description's first line (truncated) —
    // used in restored-from snackbars and the kebab "Restored from …" copy.
    // Empty when there's no description; the UI surfaces the description and
    // `#N · time-ago` as the version's visible identifier.
    const name = description
      ? description.split("\n")[0]!.slice(0, MAX_NAME_LENGTH)
      : ""
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
        // BODY_TOO_LARGE is the same code for the server's 5MB limit and
        // the local IDB quota. The repository tailors `err.message` to
        // its actual constraint — surface that directly so a local-mode
        // user isn't told to "split into smaller diagrams" when the
        // problem is whole-origin storage pressure.
        if (err.code === "BODY_TOO_LARGE") toast.error(err.message)
        else toast.error(t.failureToCreate)
      } else {
        toast.error(t.failureToCreate)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handlePreview = useCallback(
    async (versionId: string) => {
      if (!editor) return
      try {
        await enterPreview(diagramId, versionId)
      } catch {
        toast.error(t.previewFailed)
      }
    },
    [editor, enterPreview, diagramId]
  )

  const handleRestore = useCallback(
    async (versionId: string) => {
      if (!editor) return
      // Local mode: delegate to the page handler which gates on a confirm
      // dialog when the canvas is dirty (replaces collab's 10s snackbar).
      if (onConfirmedRestore) {
        try {
          await onConfirmedRestore(versionId)
        } catch {
          toast.error(t.restoreFailed)
        }
        return
      }
      try {
        const { headRev } = await restoreVersion(
          diagramId,
          versionId,
          editor.model
        )
        onVersionSaved?.(headRev)
      } catch {
        toast.error(t.restoreFailed)
      }
    },
    [editor, restoreVersion, diagramId, onVersionSaved, onConfirmedRestore]
  )

  const handleDelete = useCallback(
    (versionId: string) => {
      openModal("DELETE_VERSION", { diagramId, versionId })
    },
    [openModal, diagramId]
  )

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
            inputRef={composerRef}
            inputProps={{ "aria-label": "Describe this version" }}
            sx={{
              fontSize: "0.85rem",
              color: TEXT_PRIMARY,
              "& textarea::placeholder": { color: TEXT_MUTED, opacity: 1 },
            }}
          />
          {/* ⌘/Ctrl+Enter hint — surface the keybinding so it's
              discoverable instead of folklore. */}
          <Typography
            variant="caption"
            sx={{
              color: TEXT_MUTED,
              fontSize: "0.7rem",
              mt: -0.25,
            }}
            aria-hidden
          >
            {t.composerHint}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleCreate}
            disabled={submitting || !canSave}
            title={
              !canSave && previewState !== null
                ? "Exit preview to save a new version"
                : !canSave && isEmptyDiagram
                  ? t.emptyDiagramTooltip
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
            <Typography variant="body2" sx={{ color: TEXT_MUTED, mb: 1.5 }}>
              {isLocal ? t.emptyBodyLocal : t.emptyBody}
            </Typography>
            {isLocal && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => composerRef.current?.focus()}
                sx={{
                  textTransform: "none",
                  color: TEXT_PRIMARY,
                  borderColor: TEXT_MUTED,
                  "&:hover": {
                    borderColor: TEXT_PRIMARY,
                    backgroundColor: ROW_HOVER_BG,
                  },
                }}
              >
                {t.emptyCtaLocal}
              </Button>
            )}
          </Box>
        ) : (
          <List
            role="listbox"
            aria-label={t.drawerTitle}
            aria-activedescendant={
              activeRowId ? `version-row-${activeRowId}` : undefined
            }
            tabIndex={0}
            onKeyDown={(e) => {
              const navigable = groupedVersions
                .map((g) => (g.kind === "single" ? g.version : g.first))
                .filter((v) => !v.pending)
              if (navigable.length === 0) return
              const idx = navigable.findIndex((v) => v.id === activeRowId)
              if (e.key === "ArrowDown") {
                e.preventDefault()
                const next =
                  navigable[Math.min(idx + 1, navigable.length - 1)] ??
                  navigable[0]
                if (next) setActiveRowId(next.id)
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                const next = navigable[Math.max(idx - 1, 0)] ?? navigable[0]
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
                  previewingVersionId={previewState?.versionId ?? null}
                  versionNumberById={versionNumberById}
                  latestSavedId={latestSavedVersion?.id}
                  hasUnsavedChanges={hasChanges}
                />
              ) : (
                <VersionListItem
                  key={entry.version.id}
                  diagramId={diagramId}
                  version={entry.version}
                  versionNumber={versionNumberById.get(entry.version.id)}
                  isPreviewing={
                    previewState?.versionId === entry.version.id ||
                    entry.version.id === activeRowId
                  }
                  // Restore is meaningful unless this row IS the latest
                  // saved version AND the canvas already matches it. With
                  // unsaved changes, restoring even the latest version is
                  // a real action ("discard my work").
                  canRestore={
                    entry.version.id !== latestSavedVersion?.id || hasChanges
                  }
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
 * The body is unmounted when fully closed (after the animation finishes) to
 * release the SVG-thumbnail observer and stop rendering a 320px column for a
 * drawer the user isn't looking at.
 */
export const VersionSidebar: FC<Props> = ({
  diagramId,
  onVersionSaved,
  onConfirmedRestore,
}) => {
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
            onConfirmedRestore={onConfirmedRestore}
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
export const VersionDrawer: FC<Props> = ({
  diagramId,
  onVersionSaved,
  onConfirmedRestore,
}) => {
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
        onConfirmedRestore={onConfirmedRestore}
      />
    </Drawer>
  )
}
