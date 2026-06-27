import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { MoreVerticalIcon } from "lucide-react"
import { VersionThumbnail } from "./VersionThumbnail"
import {
  Fragment,
  useState,
  useRef,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { Link } from "@tanstack/react-router"
import { toast } from "react-toastify"
import { cn } from "@tumaet/ui/lib/utils"
import { Textarea } from "@tumaet/ui/components/textarea"
import { log } from "@/logger"
import { useVersionStore, type PendingVersion } from "@/stores/useVersionStore"
import { getVersionRepository } from "@/services/versionRepository"
import { PREVIEW_VERSION_PARAM } from "@/hooks/useVersionPreviewUrlSync"
import { MAX_DESCRIPTION_LENGTH, versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"
import {
  ROW_HOVER_BG,
  ROW_SELECTED_BG,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "./theme"
import { isNamedVersion } from "@/lib/version/predicates"

/**
 * Renders the stretched, focusable `<Link>` overlay for a row (container-
 * injected). Receives the row's accessible name for the link's `aria-label`;
 * omitted in router-less stories. See the container's `rowLink` for the
 * sibling / non-interactive-nesting rationale.
 */
type RowLink = (accessibleName: string) => ReactNode

interface ViewProps {
  version: PendingVersion
  /**
   * The per-version thumbnail node, rendered when the version is not pending.
   * Slotted (not hardcoded) so the view stays pure: the live thumbnail mounts
   * an editor + fetches a body, which a story can't do — a story passes a
   * static placeholder, the container injects the real {@link VersionThumbnail}.
   */
  thumbnail?: ReactNode
  /** Display rank among saved versions (newest = highest). Undefined for pending. */
  versionNumber?: number
  isPreviewing: boolean
  /**
   * False when restoring this version would be a no-op (the row IS the
   * latest saved version AND the canvas already matches it). Hides the
   * Restore action so the kebab only offers actions that change state.
   */
  canRestore: boolean
  /**
   * Whether a shareable permalink exists for this version. Local/offline mode
   * has no permalink (the repository returns null), so the "Copy link" action
   * is hidden. Defaults to shown when omitted.
   */
  hasPermalink?: boolean
  /**
   * Renders a stretched `<Link>` overlay for new-tab preview — the container
   * injects a TanStack `<Link>`; omitted for router-less stories.
   */
  rowLink?: RowLink
  onPreview: (versionId: string) => void
  onRestore: (versionId: string) => void
  onDelete: (versionId: string) => void
  /**
   * Persist a new description for the version. Rejects if the save fails —
   * the view resets the inline draft on rejection so the field reverts to
   * the last-saved text.
   */
  onEditDescription: (versionId: string, description: string) => Promise<void>
  /** Copy a shareable permalink to this version to the clipboard. */
  onCopyLink: (versionId: string) => void
  /** Merged onto the root `<li>` classes. */
  className?: string
  /** Forwarded to the root `<li>`. */
  ref?: React.Ref<HTMLLIElement>
}

/**
 * Pure presentational version row — props in, callbacks out. Renders a
 * per-version thumbnail, the description / autosave caption, the
 * `#N · time-ago` line, and a kebab menu (restore / copy link / edit
 * description / delete). All side effects (persist, clipboard) are reported
 * via the `onX` callbacks; the view owns only the local inline-edit draft.
 */
export function VersionListItemView({
  version,
  thumbnail,
  versionNumber,
  isPreviewing,
  canRestore,
  hasPermalink = true,
  rowLink,
  onPreview,
  onRestore,
  onDelete,
  onEditDescription,
  onCopyLink,
  className,
  ref,
}: ViewProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(version.description ?? "")
  // Guards against Escape → onBlur double-submit. In React 18 automatic
  // batching, state updates inside event handlers are batched; onBlur fires
  // synchronously before the batch applies, so `draft` still holds the
  // user's typed value when cancelEdit's setDraft hasn't flushed yet. The
  // ref bypasses the stale-closure problem entirely.
  const cancellingRef = useRef(false)

  const closeMenu = () => setMenuOpen(false)

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
      await onEditDescription(version.id, next)
    } catch {
      // Container surfaces the failure (toast/log); the view reverts the
      // inline draft so the field shows the last-saved text again.
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

  const handleCopyLink = () => {
    closeMenu()
    onCopyLink(version.id)
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

  const mutedCaption = "text-xs italic leading-snug"

  const rowBody = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {version.pending ? (
        <div
          className="mt-0.5 h-10 w-16 shrink-0 rounded"
          style={{ background: ROW_HOVER_BG }}
          aria-hidden
        />
      ) : (
        <div className="mt-0.5">{thumbnail}</div>
      )}

      <div className="min-w-0 flex-1 pr-7">
        {editing ? (
          // shadcn Textarea: visible border-input, rounded-lg, and focus-visible
          // ring come from its `data-slot` CSS. We drop the default 64px
          // min-height for this compact inline rename (field-sizing-content still
          // grows it) and theme the border/focus ring via the chrome tokens.
          <Textarea
            autoFocus
            rows={1}
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
            }
            onClick={(e) => e.stopPropagation()}
            onBlur={() => void submitEdit()}
            onKeyDown={onEditKeyDown}
            placeholder={t.createPlaceholder}
            aria-label="Edit description"
            className="mb-0.5 max-h-24 min-h-8 resize-none px-2 py-1 text-caption placeholder:opacity-100 placeholder:[color:var(--ph)] focus-visible:border-[var(--apollon-chrome-accent)] focus-visible:ring-[color-mix(in_srgb,var(--apollon-chrome-accent)_40%,transparent)]"
            style={
              {
                color: TEXT_PRIMARY,
                borderColor: "var(--apollon-chrome-border)",
                "--ph": TEXT_MUTED,
              } as CSSProperties
            }
          />
        ) : description ? (
          // User-authored description — rendered slightly smaller and muted
          // so the #N · time-ago line reads as the primary identifier.
          <div
            className="mb-0.5 text-caption leading-snug break-words whitespace-pre-wrap"
            style={{ color: TEXT_MUTED }}
          >
            {description}
          </div>
        ) : version.kind === "user" ? (
          // User explicitly saved this version but added no description.
          // Show a placeholder so it doesn't look identical to a raw autosave.
          <div
            className={`mb-0.5 block ${mutedCaption}`}
            style={{ color: TEXT_MUTED }}
          >
            {t.noDescription}
          </div>
        ) : version.name?.trim() ? (
          // System-generated name (pre-restore label). Styled as italic
          // caption so users don't mistake it for a user-added description —
          // the kebab's "Add description" makes sense because no user-authored
          // text is visible.
          <div
            className={`mb-0.5 block break-words whitespace-pre-wrap ${mutedCaption}`}
            style={{ color: TEXT_MUTED }}
          >
            {version.name.trim()}
          </div>
        ) : (
          // Raw periodic auto-save — no user-authored content at all.
          // 'Auto-saved' tells the user this is a system checkpoint, not
          // a deliberate save, matching the same italic/muted register as
          // the pre-restore label above.
          <div
            className={`mb-0.5 block ${mutedCaption}`}
            style={{ color: TEXT_MUTED }}
          >
            {t.autoSaved}
          </div>
        )}
        <div className="block text-xs" style={{ color: TEXT_MUTED }}>
          {versionNumber !== undefined && (
            <span className="font-semibold">#{versionNumber}</span>
          )}
          {versionNumber !== undefined && " · "}
          {ago}
          {version.pending && ` · ${t.saving}`}
          {version.failed && ` · failed`}
        </div>
      </div>
    </div>
  )

  // The row's accessible name — carried by the real `<Link>` (or, in stories
  // without a link, left on the body since the plain `<li>` needs none).
  const accessibleName = `Version ${
    versionNumber ? `#${versionNumber}` : "(saving)"
  }, created ${ago}${label ? ` — ${label}` : ""}`

  // The stretched `<Link>` (container-injected) carries the accessible name and
  // a stretched `after:` hit target, making the whole row the click/new-tab
  // target. It sits ABOVE the body but BELOW the kebab (z-20). It is a sibling,
  // not a wrapper, so no interactive nesting. Clickable rows only.
  const stretchedLink = clickable && rowLink ? rowLink(accessibleName) : null

  return (
    <Fragment>
      <li
        ref={ref}
        id={`version-row-${version.id}`}
        // Explicit `role="listitem"` (vs leaning on the native `<li>`→`<ul>`
        // pairing): Storybook wraps decorators, so the `<ul>` parent isn't
        // always the literal DOM parent of this `<li>` — the role only needs a
        // `role="list"` ANCESTOR (axe: aria-required-parent), which both the
        // drawer's `<ul>` and the stories' wrapper provide.
        role="listitem"
        aria-current={isPreviewing ? true : undefined}
        // With the stretched link present it owns the click + the accessible
        // name (a real, focusable `<Link>`, like the gallery cards) — so the
        // row stays a plain non-interactive `<li>` (no nested-interactive). The
        // kebab is a focusable sibling above the link. Without a link (stories)
        // the row body itself triggers the preview.
        onClick={stretchedLink ? undefined : handleRowClick}
        className={cn(
          "relative flex list-none items-start gap-3 px-4 py-2 transition-colors data-[clickable=true]:cursor-pointer data-[clickable=true]:hover:[background:var(--row-hover-bg)]",
          className
        )}
        data-clickable={clickable || undefined}
        style={
          {
            // 0.85 (not lower): still reads as a dimmed optimistic row, but
            // keeps the already-muted caption text above WCAG AA — the row
            // opacity multiplies into the text colour.
            opacity: version.pending ? 0.85 : 1,
            background: isPreviewing ? ROW_SELECTED_BG : "transparent",
            borderLeft: version.failed
              ? "3px solid var(--apollon-alert-danger-color)"
              : "3px solid transparent",
            color: TEXT_PRIMARY,
            "--row-hover-bg": ROW_HOVER_BG,
          } as CSSProperties
        }
      >
        {rowBody}
        {stretchedLink}

        <div className="absolute top-3 right-2 z-20">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              aria-label="Version actions"
              disabled={Boolean(version.pending)}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[var(--apollon-chrome-radius-sm)] bg-transparent outline-none transition-colors hover:[background:var(--row-hover-bg)] active:[background:var(--row-active-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--apollon-chrome-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              style={
                {
                  color: TEXT_PRIMARY,
                  "--row-hover-bg": ROW_HOVER_BG,
                  "--row-active-bg": ROW_SELECTED_BG,
                } as CSSProperties
              }
            >
              <MoreVerticalIcon className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            {/* "Preview" is intentionally absent: clicking the row already
                previews. The kebab is reserved for actions that aren't
                obvious from the row itself. */}
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              {canRestore && (
                <DropdownMenuItem
                  onClick={() => {
                    closeMenu()
                    onRestore(version.id)
                  }}
                >
                  {t.restoreThis}
                </DropdownMenuItem>
              )}
              {/* No permalink in local/offline mode (the repository returns
                  null), so the copy-link action is hidden there. */}
              {hasPermalink && (
                <DropdownMenuItem onClick={handleCopyLink}>
                  {t.copyLink}
                </DropdownMenuItem>
              )}
              {/* Adding a description on an empty-meta row promotes it visually
                  (ineligible for collapse once it has a description) and protects
                  it from the eviction-priority sweep. Pure metadata — no protocol event.

                  We defer `startEditing` past the menu's focus-restoration
                  tick (Base UI Menu returns focus to the kebab on close).
                  Without the rAF, the textarea's autoFocus loses to that,
                  fires onBlur immediately, and `submitEdit` early-returns on
                  the unchanged empty draft — making the action look broken. */}
              <DropdownMenuItem
                onClick={() => {
                  closeMenu()
                  requestAnimationFrame(() => startEditing())
                }}
              >
                {description ? t.editDescription : t.addDescription}
              </DropdownMenuItem>
              {named && (
                <Fragment>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      closeMenu()
                      onDelete(version.id)
                    }}
                  >
                    {t.delete}
                  </DropdownMenuItem>
                </Fragment>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    </Fragment>
  )
}

type ContainerProps = Omit<
  ViewProps,
  "onEditDescription" | "onCopyLink" | "thumbnail" | "hasPermalink" | "rowLink"
> & {
  /** Diagram the version belongs to — needed for the thumbnail + side effects. */
  diagramId: string
}

/**
 * Thin container — supplies the live thumbnail, the new-tab preview link, and
 * the description-persist / copy-link side effects (store + version repository)
 * to {@link VersionListItemView}.
 */
export const VersionListItem: FC<ContainerProps> = ({
  diagramId,
  ...props
}) => {
  const editVersionInfo = useVersionStore((s) => s.editVersionInfo)
  // Single source of truth for permalink visibility: the active repository
  // decides via its `permalink()` return value. Local mode returns null;
  // remote returns a URL. No prop, no drift.
  const permalinkUrl = getVersionRepository().permalink(
    diagramId,
    props.version.id
  )

  const onEditDescription = async (versionId: string, description: string) => {
    try {
      await editVersionInfo(diagramId, versionId, { description })
    } catch (err) {
      log.error("Edit description failed", err)
      toast.error(t.failureToEdit)
      // Re-throw so the view reverts its inline draft to the last-saved text.
      throw err
    }
  }

  const onCopyLink = async () => {
    if (!permalinkUrl) return
    try {
      await navigator.clipboard.writeText(permalinkUrl)
      toast.success(t.copied)
    } catch (err) {
      log.error("Copy link failed", err)
      toast.error(t.copyFailed)
    }
  }

  // Real, focusable `<Link>` to `?version=<id>` so cmd/ctrl/middle-click opens
  // the preview in a new tab (same as gallery cards); plain left-click stays
  // in-SPA via `onPreview`. It is a SIBLING of the body + kebab (never a
  // wrapper) and the row is a plain non-interactive `<li>`, so nothing nests
  // interactive content (axe: nested-interactive). It carries the row's
  // accessible name and is the per-row keyboard tab-stop + Enter target. The
  // stretched `after:` pseudo-element makes the whole row the hit target; the
  // kebab sits above it (z-20) and stays clickable.
  const rowLink: RowLink = (accessibleName) => (
    <Link
      to="."
      search={(prev) => ({
        ...prev,
        [PREVIEW_VERSION_PARAM]: props.version.id,
      })}
      aria-label={accessibleName}
      onClick={(e) => {
        // Let the browser handle modified clicks (open in a new tab/window).
        if (e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        props.onPreview(props.version.id)
      }}
      className="absolute inset-0 outline-none after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:ring-2 focus-visible:ring-inset focus-visible:[--tw-ring-color:var(--apollon-chrome-accent)]"
      style={{ cursor: "pointer" }}
    />
  )

  return (
    <VersionListItemView
      {...props}
      thumbnail={
        <VersionThumbnail
          diagramId={diagramId}
          versionId={props.version.id}
          isAuto={!isNamedVersion(props.version)}
          size="compact"
        />
      }
      hasPermalink={Boolean(permalinkUrl)}
      rowLink={rowLink}
      onEditDescription={onEditDescription}
      onCopyLink={onCopyLink}
    />
  )
}
