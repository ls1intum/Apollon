import { Sheet, SheetContent } from "@tumaet/ui/components/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { Spinner } from "@tumaet/ui/components/spinner"
import { Skeleton } from "@tumaet/ui/components/skeleton"
import { HistoryIcon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
} from "react"
import { toast } from "react-toastify"
import { useEditorContext, useModalContext } from "@/contexts"
import { useMediaQuery } from "@/hooks"
import { selectVersions, useVersionStore } from "@/stores/useVersionStore"
import { ApiError, VersionApiClient } from "@/services/DiagramApiClient"
import {
  NAVBAR_BACKGROUND_COLOR,
  MAX_VERSIONS_PER_DIAGRAM as MAX_VERSIONS,
} from "@/constants"
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  versioningStrings as t,
} from "./strings"
import { relativeTime } from "./relativeTime"
import { CurrentVersionRow } from "./CurrentVersionRow"
import { VersionListItem } from "./VersionListItem"
import AutoGroupRow from "./AutoGroupRow"
import { TEXT_PRIMARY, TEXT_MUTED } from "./theme"
import {
  structuralFingerprint,
  isNamedVersion,
  groupUnnamedRuns,
} from "./utils"

/** Sidebar width on desktop. Narrow enough to keep the canvas usable. */
const SIDEBAR_WIDTH = 320
/** Slide-in animation duration matched to the standard panel transition. */
const SIDEBAR_ANIMATION_MS = 220

/**
 * Switches the sidebar to a bottom-sheet drawer at the same breakpoint
 * the navbar switches to its hamburger (`md:hidden` in `Navbar.tsx`,
 * Tailwind's md = 768px). This is the *only* place where a viewport
 * media query is the right tool — sidebar↔bottom-sheet is a page-level
 * layout decision driven by viewport chrome, and rendering both (hiding
 * one via CSS) would double-mount the effect-bearing body. Component-
 * internal layout (e.g. the preview banner) responds to its own container
 * width via `useElementWidth`, not this constant.
 */
const MOBILE_QUERY = "(max-width: 767.95px)"

interface Props {
  diagramId: string
  onVersionSaved?: (headRev?: number) => void
}

/**
 * Chrome-free body of the version-history panel. Reused by:
 *
 *  - `VersionSidebar` (desktop ≥ md): rendered inline as a flex sibling of
 *    the canvas so it doesn't overlay the user's work.
 *  - `VersionDrawer` (mobile <sm): rendered inside a bottom-sheet because
 *    there isn't room for two columns on small viewports.
 */
const VersionSidebarBody: FC<Props> = ({ diagramId, onVersionSaved }) => {
  const versions = useVersionStore((s) => selectVersions(s, diagramId))
  const total = useVersionStore((s) => s.totals[diagramId])
  const nextCursor = useVersionStore((s) => s.nextCursor[diagramId])
  const loading = useVersionStore((s) => s.loading[diagramId] ?? false)
  const errorCode = useVersionStore((s) => s.error[diagramId] ?? null)
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
  const canSave = Boolean(editor) && hasChanges && previewState === null

  const handleCreate = async () => {
    if (!editor || submitting || !canSave) return
    setSubmitting(true)
    const description = draft.trim()
    // Name is now an internal label only — the UI surfaces the description.
    // Name is the first line of the description, used as a short label in
    // restored-from snackbars and the kebab "Restored from …" copy. Empty
    // when the user wrote no description — `#N · time-ago` is already the
    // version's visible identifier.
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
        if (err.code === "BODY_TOO_LARGE") toast.error(t.failureBodyTooLarge)
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
    [editor, restoreVersion, diagramId, onVersionSaved]
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
    <div
      // Whole sidebar paints the navbar dark colour so it visually
      // continues the top bar in both themes. Text is light, with rgba
      // hover/selected tints so dark/light toggle isn't needed here.
      className="flex h-full flex-col"
      style={{ background: NAVBAR_BACKGROUND_COLOR, color: TEXT_PRIMARY }}
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
        <div className="flex flex-col items-stretch gap-1.5 px-4 pt-3 pb-2">
          <textarea
            rows={1}
            placeholder={t.createPlaceholder}
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
            }
            onKeyDown={handleComposerKeyDown}
            aria-label="Describe this version"
            className="max-h-[6.5rem] w-full resize-none border-0 bg-transparent p-0 text-[0.85rem] outline-none placeholder:opacity-100 placeholder:[color:var(--ph)]"
            style={
              {
                color: TEXT_PRIMARY,
                "--ph": TEXT_MUTED,
              } as CSSProperties
            }
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting || !canSave}
            title={
              !canSave && previewState !== null
                ? "Exit preview to save a new version"
                : !canSave && !hasChanges
                  ? "No changes since the last saved version"
                  : undefined
            }
            className="inline-flex cursor-pointer items-center justify-center self-end rounded-md px-3.5 py-1 text-sm font-semibold transition-colors hover:[background:#ffffff] disabled:cursor-not-allowed disabled:[background:rgba(255,255,255,0.12)] disabled:[color:var(--btn-disabled-color)]"
            style={
              {
                color: NAVBAR_BACKGROUND_COLOR,
                background: TEXT_PRIMARY,
                "--btn-disabled-color": TEXT_MUTED,
              } as CSSProperties
            }
          >
            {submitting ? (
              <Spinner className="size-3.5" style={{ color: TEXT_MUTED }} />
            ) : (
              t.createButton
            )}
          </button>
        </div>
      )}

      {/* Section meta: counter + "last saved Xm ago" + autosave filter
          toggle. Borderless — separation comes from spacing. The toggle
          mirrors Figma's "Show autosave versions" — default on; flipping
          off hides every empty-meta row for a milestone-only view. */}
      <div className="flex items-center gap-2 px-4 py-1">
        <span
          className="text-xs font-semibold whitespace-nowrap"
          style={{ color: TEXT_PRIMARY }}
        >
          {totalDisplay}
          <span className="font-normal" style={{ color: TEXT_MUTED }}>
            {" / "}
            {MAX_VERSIONS}
          </span>
        </span>
        <span
          className="min-w-0 flex-1 overflow-hidden text-xs text-ellipsis whitespace-nowrap"
          style={{ color: TEXT_MUTED }}
          title={sectionSubtitle}
        >
          · {sectionSubtitle}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              onClick={() => setShowAutosaves((v) => !v)}
              aria-label={
                showAutosaves
                  ? "Hide autosave versions"
                  : "Show autosave versions"
              }
              aria-pressed={showAutosaves}
              className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md bg-transparent p-0.5 outline-none transition-colors hover:[background:rgba(255,255,255,0.06)] focus-visible:ring-2 focus-visible:ring-white/40"
              style={{ color: showAutosaves ? TEXT_PRIMARY : TEXT_MUTED }}
            >
              <HistoryIcon className="size-4" aria-hidden />
            </TooltipTrigger>
            <TooltipContent>
              {showAutosaves
                ? "Hide autosave versions"
                : "Show autosave versions"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <CurrentVersionRow
        hasChanges={hasChanges}
        latestSavedVersion={latestSavedVersion}
      />

      <div className="flex-1 overflow-auto">
        {errorCode === "REDIS_UNAVAILABLE" ? (
          <div className="p-4">
            <p
              className="text-sm"
              style={{ color: "var(--apollon-alert-warning-yellow)" }}
            >
              {t.failureRedis}
            </p>
          </div>
        ) : loading && versions.length === 0 ? (
          <ul className="m-0 list-none p-0">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex list-none gap-3 p-4">
                <Skeleton
                  className="rounded-none"
                  style={{ width: 64, height: 40 }}
                />
                <div className="flex-1">
                  <Skeleton className="h-4 w-[60%]" />
                  <Skeleton className="mt-1 h-4 w-[30%]" />
                </div>
              </li>
            ))}
          </ul>
        ) : versions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm" style={{ color: TEXT_MUTED }}>
              {t.emptyBody}
            </p>
          </div>
        ) : (
          <ul
            className="m-0 list-none p-0"
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
              <li className="list-none px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => loadMoreVersions(diagramId)}
                  disabled={loading}
                  className="cursor-pointer rounded-md bg-transparent px-2 py-1 text-sm font-medium transition-colors hover:[background:rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ color: TEXT_PRIMARY }}
                >
                  {t.loadOlder}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * Persistent desktop sidebar. Inline flex sibling of the canvas. Animates
 * in by transitioning `width` from 0 → SIDEBAR_WIDTH; the canvas reflows
 * smoothly alongside instead of being overlaid. The inner div stays at a
 * fixed width so the contents don't shimmer during the animation — the
 * outer div clips them via `overflow: hidden`.
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
    <div
      className="shrink-0 overflow-hidden"
      style={{
        width: open ? SIDEBAR_WIDTH : 0,
        transition: `width ${SIDEBAR_ANIMATION_MS}ms ease-in-out`,
        background: NAVBAR_BACKGROUND_COLOR,
      }}
      aria-hidden={!open}
    >
      <div style={{ width: SIDEBAR_WIDTH, height: "100%" }}>
        {mounted && (
          <VersionSidebarBody
            diagramId={diagramId}
            onVersionSaved={onVersionSaved}
          />
        )}
      </div>
    </div>
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
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDrawer(diagramId)
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[80vh] w-full gap-0 border-0 p-0"
        style={{ background: NAVBAR_BACKGROUND_COLOR }}
        aria-label={t.drawerTitle}
      >
        <VersionSidebarBody
          diagramId={diagramId}
          onVersionSaved={onVersionSaved}
        />
      </SheetContent>
    </Sheet>
  )
}
