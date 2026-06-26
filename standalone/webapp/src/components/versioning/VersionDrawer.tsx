import { Sheet, SheetContent } from "@tumaet/ui/components/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { Button } from "@tumaet/ui/components/button"
import { Textarea } from "@tumaet/ui/components/textarea"
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
import { createPortal } from "react-dom"
import { toast } from "react-toastify"
import { useEditorContext, useModalContext } from "@/contexts"
import { useMediaQuery } from "@/hooks"
import { useRegionHost } from "@/hooks/useRegionHost"
import {
  selectScopedPreview,
  selectVersions,
  useVersionStore,
} from "@/stores/useVersionStore"
import { ApiError } from "@/services/DiagramApiClient"
import { getVersionRepository } from "@/services/versionRepository"
import { NARROW_VIEW_QUERY } from "@/constants"
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  versioningStrings as t,
} from "./strings"
import { relativeTime } from "./relativeTime"
import { CurrentVersionRow } from "./CurrentVersionRow"
import { VersionListItem } from "./VersionListItem"
import { AutoGroupRow } from "./AutoGroupRow"
import { TEXT_PRIMARY, TEXT_MUTED, ROW_HOVER_BG } from "./theme"
import { structuralFingerprint, isNamedVersion } from "@/lib/version/predicates"
import { groupUnnamedRuns } from "./utils"

/** Panel width on desktop. Narrow enough to keep the canvas usable. */
const SIDEBAR_WIDTH = 320

interface Props {
  diagramId: string
  onVersionSaved?: (headRev?: number) => void
  /**
   * Local mode swaps the snackbar for an always-visible "Before
   * restoring …" auto-row + a confirm dialog when the canvas is dirty.
   * Page-level handler — drawer just calls it.
   */
  onConfirmedRestore?: (versionId: string) => Promise<void> | void
  /**
   * Enter preview for a version by WRITING the URL (`?version=<id>`). The page
   * owns the URL↔store sync, so the drawer never touches preview state
   * directly — that keeps reload / Back / deep-link working. Falls back to the
   * store's `enterPreview` if a caller doesn't pass it.
   */
  onPreview?: (versionId: string) => void
}

/**
 * Chrome-free body of the version-history panel. Reused by:
 *
 *  - `VersionRail` (desktop ≥ md): portaled into the editor's `right-rail`
 *    overlay region; the canvas stays full-bleed and makes room via the
 *    measured inset (no reflow).
 *  - `VersionDrawer` (mobile <sm): rendered inside a bottom-sheet because
 *    there isn't room for two columns on small viewports.
 */
export const VersionSidebarBody: FC<Props> = ({
  diagramId,
  onVersionSaved,
  onConfirmedRestore,
  onPreview,
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
  const previewState = useVersionStore((s) => selectScopedPreview(s, diagramId))

  const { editor } = useEditorContext()
  const { openModal } = useModalContext()

  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
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

  // No fetch-on-mount here: the editor page (ApollonLocal / ApollonShared)
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
      if (onPreview) {
        // URL-driven: write `?version=<id>`; the page's URL↔store effect
        // enters preview. One source of truth, so reload/Back/deep-link work.
        onPreview(versionId)
        return
      }
      try {
        await enterPreview(diagramId, versionId)
      } catch {
        toast.error(t.previewFailed)
      }
    },
    [editor, onPreview, enterPreview, diagramId]
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
  // and survives eviction. Rows without a `seq` fall back to a derived
  // rank-among-stored: accurate for diagrams that never hit the cap, and
  // a graceful degrade for legacy rows committed before the counter existed.
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
      // Transparent: the desktop rail's glass panel (VersionRail) and the
      // mobile drawer own the surface, so the body just themes its text via the
      // shared --apollon-chrome-* tokens.
      className="flex h-full flex-col bg-transparent"
      style={{ color: TEXT_PRIMARY }}
      role="complementary"
      aria-label={t.drawerTitle}
    >
      {/* Composer: flat textarea over a single action row — the ⌘+Enter hint
          on the left and the Save button on the right — so the textarea owns
          the full width and the controls share one tidy line.
          Cmd/Ctrl+Enter submits; plain Enter inserts a newline.

          Hidden entirely while previewing — there's nothing meaningful to
          save while the canvas reflects an old snapshot, and showing it
          alongside the read-only banner is contradictory UX. */}
      {previewState === null && (
        <div
          className="flex flex-col items-stretch gap-1.5 px-4 pt-3 pb-2"
          style={{ borderBottom: "1px solid var(--apollon-chrome-border)" }}
        >
          {/* shadcn Textarea: visible border-input, rounded-lg, and a
              focus-visible ring come from its `data-slot` CSS. We override the
              default 64px min-height for a one-line composer (field-sizing-content
              still grows it as the user types) and theme the chrome via the
              shared --apollon-chrome-* tokens so it follows light/dark. */}
          <Textarea
            rows={1}
            placeholder={t.createPlaceholder}
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
            }
            onKeyDown={handleComposerKeyDown}
            ref={composerRef}
            aria-label="Describe this version"
            className="max-h-[6.5rem] min-h-9 resize-none px-2.5 py-1.5 text-caption placeholder:opacity-100 placeholder:[color:var(--ph)] focus-visible:border-[var(--apollon-chrome-accent)] focus-visible:ring-[color-mix(in_srgb,var(--apollon-chrome-accent)_40%,transparent)]"
            style={
              {
                color: TEXT_PRIMARY,
                borderColor: "var(--apollon-chrome-border)",
                "--ph": TEXT_MUTED,
              } as CSSProperties
            }
          />
          {/* One tidy row below the textarea: the ⌘/Ctrl+Enter hint on the
              LEFT (muted, surfaces the keybinding so it's discoverable instead
              of folklore) and the Save button pushed to the RIGHT. Sharing a
              row removes the stacked-rows whitespace. */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: TEXT_MUTED }} aria-hidden>
              {t.composerHint}
            </span>
            {/* shadcn Button (default variant) for structure, focus-visible
                ring, and disabled handling. The accent is the drawer's chrome
                accent, not the global `bg-primary`, so we override the surface
                via style while keeping the shadcn disabled state themed with
                chrome tokens. */}
            <Button
              type="button"
              size="sm"
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
              className="ml-auto font-semibold hover:brightness-[0.94] disabled:[background:var(--apollon-chrome-surface-active)] disabled:[color:var(--apollon-chrome-text-muted)] disabled:opacity-100"
              style={{
                color: "var(--apollon-chrome-accent-contrast)",
                background: "var(--apollon-chrome-accent)",
              }}
            >
              {submitting ? (
                <Spinner
                  className="size-3.5"
                  style={{ color: "var(--apollon-chrome-accent-contrast)" }}
                />
              ) : (
                t.createButton
              )}
            </Button>
          </div>
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
              className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md bg-transparent p-0.5 outline-none transition-colors hover:[background:var(--row-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--apollon-chrome-accent)]"
              style={
                {
                  color: showAutosaves ? TEXT_PRIMARY : TEXT_MUTED,
                  "--row-hover-bg": ROW_HOVER_BG,
                } as CSSProperties
              }
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
        diagramId={diagramId}
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
            <p className="mb-3 text-sm" style={{ color: TEXT_MUTED }}>
              {isLocal ? t.emptyBodyLocal : t.emptyBody}
            </p>
            {isLocal && (
              <TooltipProvider>
                <Tooltip>
                  {/* span wrapper so the tooltip still shows on the disabled
                      button (a disabled button emits no pointer events). */}
                  <TooltipTrigger render={<span className="inline-flex" />}>
                    {/* shadcn Button (outline) — bordered CTA themed via the
                        chrome tokens so it reads correctly on the glass surface
                        in both light and dark. */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCreate()}
                      disabled={submitting || !canSave}
                      className="hover:[background:var(--row-hover-bg)] disabled:[border-color:var(--apollon-chrome-border)] disabled:[color:var(--btn-disabled-color)] disabled:opacity-100"
                      style={
                        {
                          color: TEXT_PRIMARY,
                          borderColor: TEXT_MUTED,
                          background: "transparent",
                          "--row-hover-bg": ROW_HOVER_BG,
                          "--btn-disabled-color": TEXT_MUTED,
                        } as CSSProperties
                      }
                    >
                      {t.emptyCtaLocal}
                    </Button>
                  </TooltipTrigger>
                  {(isEmptyDiagram || !canSave) && (
                    <TooltipContent>
                      {isEmptyDiagram
                        ? t.emptyDiagramTooltip
                        : "Add something to the canvas first"}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ) : (
          // List/listitem (not listbox/option): each row carries its OWN
          // focusable `<Link>` as the keyboard tab-stop + Enter target (like the
          // gallery cards), so the row never nests interactive content inside a
          // widget role (axe: nested-interactive). Native `<ul>` list semantics.
          <ul
            className="m-0 list-none p-0"
            role="list"
            aria-label={t.drawerTitle}
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
                  isPreviewing={previewState?.versionId === entry.version.id}
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
                {/* shadcn Button (ghost) — borderless "load older" affordance
                    that themes its hover via the chrome row-hover token. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMoreVersions(diagramId)}
                  disabled={loading}
                  className="hover:[background:var(--row-hover-bg)]"
                  style={
                    {
                      color: TEXT_PRIMARY,
                      "--row-hover-bg": ROW_HOVER_BG,
                    } as CSSProperties
                  }
                >
                  {t.loadOlder}
                </Button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * Desktop version-history panel, rehomed onto the library's overlay/control API.
 * Instead of being a flex sibling that pushes the canvas (a reflow on every
 * open/close), it is portaled into the editor's `right-rail` overlay region: the
 * canvas stays full-bleed beneath it and the diagram makes room via the measured
 * inset (no reflow). The panel unmounts when closed, releasing the
 * SVG-thumbnail observer. Mobile keeps the bottom-sheet `<VersionDrawer>`.
 */
export const VersionRail: FC<Props> = ({
  diagramId,
  onVersionSaved,
  onConfirmedRestore,
  onPreview,
}) => {
  const { editor } = useEditorContext()
  const isSmall = useMediaQuery(NARROW_VIEW_QUERY)
  const open = useVersionStore((s) => Boolean(s.drawerOpenByDiagram[diagramId]))

  // Hold the right-rail region while open on desktop: a stable host node whose
  // measured width becomes the panel's reserved right inset.
  const host = useRegionHost(editor, "right-rail", !isSmall && open)

  if (!host) return null

  return createPortal(
    <div
      // A floating glass card — the right-side mirror of the left palette, NOT
      // a full-height docked slab. Anchored to the top of the right-rail band
      // and bounded in height (scrolls internally) so it reads as an island,
      // not a column. Width + margins are what the band measures as the
      // reserved right inset (no reflow); the height cap doesn't affect width.
      //
      // The host node returned by `getRegionElement("right-rail")` is registered
      // with `interactive: false` (see apollon-editor.tsx), so its ControlSlot
      // frame stays `pointer-events: none` and carries NO `nopan/nodrag/nowheel`.
      // A portal mounted into it therefore has to re-create the interactive
      // ControlSlot mechanism itself, or pointer events fall through and pan the
      // React Flow canvas. We mirror OverlayLayer's interactive branch exactly:
      //   (a) `pointer-events: auto` (re-opt into receiving events),
      //   (b) `nopan nodrag nowheel` (stop React Flow's drag/zoom/wheel
      //       behaviour from claiming the gesture), and
      //   (c) capture-phase `stopPropagation` on pointer/mouse/touch-down so the
      //       canvas's listeners never see the gesture in the first place.
      // All three are required: (a) makes the surface receive the event, (b)+(c)
      // keep React Flow from panning/zooming when it does.
      className="apollon-glass apollon-history-panel apollon-chrome-island nopan nodrag nowheel m-2.5 self-start overflow-hidden rounded-[var(--apollon-chrome-radius-lg)]"
      style={{
        width: SIDEBAR_WIDTH,
        maxHeight: "min(640px, 100%)",
        minHeight: 0,
        pointerEvents: "auto",
      }}
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
    >
      <VersionSidebarBody
        diagramId={diagramId}
        onVersionSaved={onVersionSaved}
        onConfirmedRestore={onConfirmedRestore}
        onPreview={onPreview}
      />
    </div>,
    host
  )
}

/**
 * Mobile fallback. On `<sm` viewports there isn't room for a side column
 * (SIDEBAR_WIDTH), so we keep the bottom-sheet pattern for the small-screen case.
 */
export const VersionDrawer: FC<Props> = ({
  diagramId,
  onVersionSaved,
  onConfirmedRestore,
  onPreview,
}) => {
  const isSmall = useMediaQuery(NARROW_VIEW_QUERY)
  const open = useVersionStore((s) => Boolean(s.drawerOpenByDiagram[diagramId]))
  const closeDrawer = useVersionStore((s) => s.closeDrawer)
  // Desktop uses the inline rail; this component is mobile-only.
  if (!isSmall) return null
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDrawer(diagramId)
      }}
    >
      {/* A floating glass card detached from the edges (margins + radius +
          blur), not a full-bleed bottom sheet — the mobile mirror of the
          desktop rail island. The chrome glass background overrides shadcn's
          default `bg-background` so the sheet themes charcoal in dark mode. */}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="apollon-glass apollon-history-panel m-[var(--apollon-chrome-edge)] h-auto max-h-[70vh] w-auto gap-0 rounded-[var(--apollon-chrome-radius-lg)] border-0 bg-clip-border p-0"
        style={{
          backgroundColor: "var(--apollon-chrome-glass-solid)",
          backgroundImage: "none",
          color: "var(--apollon-chrome-text)",
        }}
        aria-label={t.drawerTitle}
      >
        <VersionSidebarBody
          diagramId={diagramId}
          onVersionSaved={onVersionSaved}
          onConfirmedRestore={onConfirmedRestore}
          onPreview={onPreview}
        />
      </SheetContent>
    </Sheet>
  )
}
