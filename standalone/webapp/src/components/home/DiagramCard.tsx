import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react"
import { MoreVertical, Star, Unlink } from "lucide-react"
import type { UMLDiagramType } from "@tumaet/apollon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@tumaet/ui/components/alert-dialog"
import { cn } from "@tumaet/ui/lib/utils"
import { Spinner } from "@tumaet/ui/components/spinner"
import { Badge } from "@tumaet/ui/components/badge"
import { Button } from "@tumaet/ui/components/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@tumaet/ui/components/card"
import { Separator } from "@tumaet/ui/components/separator"
import { Link, useNavigate } from "@tanstack/react-router"
import { toast } from "react-toastify"
import { useModalContext } from "@/contexts"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useMinuteTick } from "@/hooks/useMinuteTick"
import { DiagramView } from "@/types"
import { getDiagramTypeIcon, getDiagramTypeShortLabel } from "./diagramTypeMeta"
import {
  markSharedDiagramCopied,
  removeSharedDiagramEntry,
  updateSharedDiagramView,
} from "@/utils/sharedDiagramStorage"
import {
  SHARED_DIAGRAM_VIEW_OPTIONS,
  DEFAULT_SHARED_DIAGRAM_VIEW,
  sharedDiagramRoute,
  buildSharedDiagramUrl,
  getSharedDiagramViewBadge,
} from "@/utils/sharedDiagramLinks"
import { getCachedThumbnailSources } from "@/utils/thumbnailTheme"
import { cloneModelAsLocalCopy } from "@/utils/saveLocalDiagramCopy"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import { versioningStrings } from "@/components/versioning/strings"
import { log } from "@/logger"
import { runWhenIdle } from "@/utils/idle"

export type DiagramSource = "local" | "shared"

export type RecentDiagram = {
  id: string
  title: string
  type: UMLDiagramType
  lastModifiedAt: string
  favorite: boolean
  source?: DiagramSource
  createdAt?: string
  lastSharedView?: DiagramView
}

const formatRelativeLastModified = (lastModifiedAt: string, nowMs: number) => {
  const parsedDate = new Date(lastModifiedAt)
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date"
  }

  const diffMilliseconds = nowMs - parsedDate.getTime()
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs

  if (diffMilliseconds < minuteMs) {
    return "just now"
  }

  if (diffMilliseconds < hourMs) {
    const minutes = Math.floor(diffMilliseconds / minuteMs)
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }

  if (diffMilliseconds < dayMs) {
    const hours = Math.floor(diffMilliseconds / hourMs)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }

  if (diffMilliseconds < 2 * dayMs) {
    return "Yesterday"
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const getDiagramNav = (diagram: RecentDiagram) => {
  const source = diagram.source ?? "local"
  if (source === "local") {
    return { to: "/local/$id", params: { id: diagram.id } } as const
  }

  return sharedDiagramRoute(
    diagram.id,
    diagram.lastSharedView ?? DEFAULT_SHARED_DIAGRAM_VIEW
  )
}

/* ------------------------------------------------------------------ *\
 * DiagramActionsMenuView — pure presentational three-dot menu.
\* ------------------------------------------------------------------ */

/** The action callbacks `DiagramActionsMenuView` reports; all payload-only. */
export type DiagramActionsMenuViewProps = {
  /** The diagram the menu acts on (drives labels + the shared/local fork). */
  diagram: RecentDiagram
  /** When `true`, only the "remove from shared list" entry is shown. */
  isExpired?: boolean
  /**
   * Whether the diagram may be deleted. `false` disables the Delete entry (e.g.
   * the diagram is open in the editor).
   */
  canDelete?: boolean
  /** Open the diagram in the editor. */
  onOpen: () => void
  /** Duplicate the (local) diagram. */
  onDuplicate: () => void
  /** Delete the (local) diagram after the destructive confirmation. */
  onDelete: () => void
  /** Open the share dashboard for the (local) diagram. */
  onShare: () => void
  /** Copy the shared link for the current sharing mode. */
  onCopySharedLink: () => void
  /** Save the shared diagram as a new local copy on this device. */
  onSaveLocalCopy: () => void
  /** Change the default sharing mode for a shared diagram. */
  onChangeSharedView: (view: DiagramView) => void
  /** Remove a shared diagram from the local shared list after confirmation. */
  onRemoveSharedEntry: () => void
  /** Wrapper class for the relatively-positioned menu container. */
  containerClassName?: string
  /** Stop click/keydown/mousedown from bubbling to an enclosing card link. */
  stopPropagation?: boolean
}

const DEFAULT_MENU_CONTAINER_CLASS = "relative"

/**
 * The two destructive actions the menu can confirm. Both flow through one
 * controlled `AlertDialog`; `null` means no confirmation is pending.
 */
type PendingConfirm = "delete" | "remove"

/** Title + description + confirm-label copy for each destructive confirmation. */
const CONFIRM_COPY: Record<
  PendingConfirm,
  { title: string; description: string; confirmLabel: string }
> = {
  delete: {
    title: "Delete this diagram?",
    description:
      "This permanently deletes the diagram from this device. This action cannot be undone.",
    confirmLabel: "Delete",
  },
  remove: {
    title: "Remove from shared list?",
    description:
      "This removes the diagram from your shared list on this device. The shared diagram itself stays available to anyone with the link.",
    confirmLabel: "Remove",
  },
}

/**
 * Pure three-dot diagram actions menu: it renders the trigger + popover and
 * reports every action via an `onX` callback. It owns only ephemeral UI state
 * (menu open + which destructive confirmation is pending) — no store,
 * navigation, clipboard, or modals.
 *
 * Both destructive actions (delete a local diagram; remove-from-shared) are
 * confirmed through a single canonical `AlertDialog` rendered as a SIBLING of
 * the menu, not nested inside a menu item. Selecting a destructive item closes
 * the menu and arms `pendingConfirm`; the dialog then opens cleanly with its
 * own focus trap (both portal to `document.body`, so the menu fully unmounts
 * before the dialog mounts — no nested focus-trap fragility).
 */
export function DiagramActionsMenuView({
  diagram,
  isExpired = false,
  canDelete = true,
  onOpen,
  onDuplicate,
  onDelete,
  onShare,
  onCopySharedLink,
  onSaveLocalCopy,
  onChangeSharedView,
  onRemoveSharedEntry,
  containerClassName = DEFAULT_MENU_CONTAINER_CLASS,
  stopPropagation = false,
}: DiagramActionsMenuViewProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null
  )

  const isLocalDiagram = (diagram.source ?? "local") === "local"
  const sharedView = diagram.lastSharedView ?? DEFAULT_SHARED_DIAGRAM_VIEW

  const runAndClose = (action: () => void) => {
    action()
    setIsMenuOpen(false)
  }

  // Close the menu first, then arm the confirmation. The dialog is a sibling, so
  // it opens once the menu has dismissed — clean handoff of the focus trap.
  const requestConfirm = (kind: PendingConfirm) => {
    setIsMenuOpen(false)
    setPendingConfirm(kind)
  }

  const confirmCopy = pendingConfirm ? CONFIRM_COPY[pendingConfirm] : null

  const stopIfNeeded = (
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>
  ) => {
    if (stopPropagation) {
      event.stopPropagation()
    }
  }

  return (
    <div
      className={containerClassName}
      onClick={stopIfNeeded}
      onMouseDown={stopIfNeeded}
      onKeyDown={stopIfNeeded}
    >
      <DropdownMenu
        open={isMenuOpen}
        onOpenChange={(open) => setIsMenuOpen(open)}
      >
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Open diagram actions"
              // Hidden until the card is hovered/focused, but kept visible while
              // the menu is open (Base UI sets aria-expanded on the trigger) so
              // an open menu never floats over a vanished trigger.
              className="pointer-events-auto text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100"
              onClick={stopIfNeeded}
            />
          }
        >
          <MoreVertical className="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          id={`diagram-actions-menu-${diagram.id}`}
          aria-label="Diagram actions"
          align="end"
          sideOffset={8}
        >
          {isExpired ? (
            <DropdownMenuItem
              variant="destructive"
              closeOnClick={false}
              onClick={() => requestConfirm("remove")}
            >
              Remove from shared list
            </DropdownMenuItem>
          ) : isLocalDiagram ? (
            <>
              <DropdownMenuItem onClick={() => runAndClose(onOpen)}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAndClose(onDuplicate)}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAndClose(onShare)}>
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={!canDelete}
                closeOnClick={false}
                title={
                  canDelete
                    ? undefined
                    : "Cannot delete diagram currently being edited"
                }
                onClick={() => requestConfirm("delete")}
              >
                Delete
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => runAndClose(onOpen)}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAndClose(onCopySharedLink)}>
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAndClose(onSaveLocalCopy)}>
                Save as local copy
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  Change sharing mode
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent aria-label="Change sharing mode">
                  <DropdownMenuRadioGroup
                    value={sharedView}
                    onValueChange={(value) =>
                      runAndClose(() =>
                        onChangeSharedView(value as DiagramView)
                      )
                    }
                  >
                    {SHARED_DIAGRAM_VIEW_OPTIONS.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.badge}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                closeOnClick={false}
                onClick={() => requestConfirm("remove")}
              >
                Remove from shared list
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCopy?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingConfirm === "delete") {
                  onDelete()
                } else if (pendingConfirm === "remove") {
                  onRemoveSharedEntry()
                }
                setPendingConfirm(null)
              }}
            >
              {confirmCopy?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ *\
 * DiagramActionsMenu — thin container wiring store/navigation/etc.
\* ------------------------------------------------------------------ */

type DiagramActionsMenuProps = {
  diagram: RecentDiagram
  containerClassName?: string
  stopPropagation?: boolean
  isExpired?: boolean
  onSharedDiagramRemoved?: (diagramId: string) => void
  onSharedDiagramViewChange?: (diagramId: string, view: DiagramView) => void
}

export const DiagramActionsMenu = ({
  diagram,
  containerClassName,
  stopPropagation = false,
  isExpired = false,
  onSharedDiagramRemoved,
  onSharedDiagramViewChange,
}: DiagramActionsMenuProps) => {
  const navigate = useNavigate()
  const { openModal } = useModalContext()
  const deleteModel = usePersistenceModelStore((state) => state.deleteModel)
  const duplicateModel = usePersistenceModelStore(
    (state) => state.duplicateModel
  )
  const createModel = usePersistenceModelStore((state) => state.createModel)
  const currentModelId = usePersistenceModelStore(
    (state) => state.currentModelId
  )

  const isLocalDiagram = (diagram.source ?? "local") === "local"
  const sharedView = diagram.lastSharedView ?? DEFAULT_SHARED_DIAGRAM_VIEW
  const isCurrentDiagramInEditor = diagram.id === currentModelId

  const copySharedLink = async (view: DiagramView, message: string) => {
    try {
      await navigator.clipboard.writeText(
        buildSharedDiagramUrl(diagram.id, view)
      )
      markSharedDiagramCopied(diagram.id, view)
      toast.success(message)
    } catch {
      toast.error("Could not copy the shared link.")
    }
  }

  // Same durability escape hatch as the navbar `SaveLocalCopyButton`, but from
  // the gallery there is no live editor — fetch the shared model from the
  // server first, then clone it into a fresh local copy via the shared helper.
  const saveLocalCopy = async () => {
    try {
      const model = await DiagramApiClient.fetchDiagram(diagram.id)
      const copy = cloneModelAsLocalCopy(model)
      createModel(copy)
      markSharedDiagramCopied(diagram.id, sharedView)
      toast.success(versioningStrings.saveLocalCopySuccess, { autoClose: 6000 })
      navigate({ to: "/local/$id", params: { id: copy.id }, replace: true })
    } catch (err) {
      log.error("Save a local copy from the gallery failed", err as Error)
      toast.error(versioningStrings.saveLocalCopyFailed)
    }
  }

  return (
    <DiagramActionsMenuView
      diagram={diagram}
      isExpired={isExpired}
      canDelete={isLocalDiagram && !isCurrentDiagramInEditor}
      stopPropagation={stopPropagation}
      containerClassName={containerClassName}
      onOpen={() => navigate(getDiagramNav(diagram))}
      onDuplicate={() => {
        if (isLocalDiagram) duplicateModel(diagram.id)
      }}
      onDelete={() => {
        if (isLocalDiagram && !isCurrentDiagramInEditor) {
          deleteModel(diagram.id)
        }
      }}
      onShare={() => {
        if (isLocalDiagram) {
          openModal("SHARE_DASHBOARD", {
            modelId: diagram.id,
            contentOverflow: true,
          })
        }
      }}
      onCopySharedLink={() => void copySharedLink(sharedView, "Link copied.")}
      onSaveLocalCopy={() => void saveLocalCopy()}
      onChangeSharedView={(view) => {
        updateSharedDiagramView(diagram.id, view)
        onSharedDiagramViewChange?.(diagram.id, view)
        toast.success(
          `${getSharedDiagramViewBadge(view)} is now the default link.`
        )
      }}
      onRemoveSharedEntry={() => {
        removeSharedDiagramEntry(diagram.id)
        onSharedDiagramRemoved?.(diagram.id)
      }}
    />
  )
}

/**
 * A centered, theme-aware framed tile shared by every preview state that has no
 * thumbnail (type glyph, loading spinner, expired notice) so they share one
 * footprint and the skeleton→card→thumbnail swaps never jump. All tokens (no
 * baked colors) so it sits cleanly on the island surface in both themes.
 */
const PreviewTile = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex size-20 items-center justify-center rounded-xl border border-[var(--home-border-subtle)] bg-[color-mix(in_srgb,var(--home-text-primary)_4%,transparent)] text-[var(--home-text-muted)]">
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ *\
 * DiagramPreview — the 16:10 preview area, one of four states.
\* ------------------------------------------------------------------ */

type DiagramPreviewProps = {
  diagram: RecentDiagram
  title: string
  lightDataUrl: string | null
  darkDataUrl: string | null
  /** Render the rendered thumbnail crossfade pair. */
  showThumbnail: boolean
  /** Show the loading spinner (incl. non-empty-but-no-thumbnail-yet anti-flicker). */
  isLoading: boolean
  /** Show the "share no longer available" tile instead of a preview. */
  isExpired: boolean
}

/**
 * The card's preview area. Aspect-ratio driven (16:10) so its height follows
 * the grid-owned width with no magic px. Exactly one state renders: expired
 * notice / rendered thumbnail / loading spinner / empty diagram-type glyph.
 */
function DiagramPreview({
  diagram,
  title,
  lightDataUrl,
  darkDataUrl,
  showThumbnail,
  isLoading,
  isExpired,
}: DiagramPreviewProps) {
  return (
    <div className="flex aspect-[16/10] w-full items-center justify-center">
      {isExpired ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <PreviewTile>
            <Unlink className="size-8" aria-hidden="true" />
          </PreviewTile>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[var(--home-text-secondary)]">
              Link expired
            </p>
            <p className="text-[10px] text-[var(--home-text-muted)]">
              This shared diagram is no longer available
            </p>
          </div>
        </div>
      ) : showThumbnail ? (
        <div className="relative h-full w-full">
          <img
            src={lightDataUrl!}
            alt={`${title} diagram preview`}
            className="theme-thumbnail-image theme-thumbnail-light"
            loading="lazy"
          />
          {darkDataUrl && (
            <img
              src={darkDataUrl}
              alt=""
              aria-hidden="true"
              className="theme-thumbnail-image theme-thumbnail-dark"
              loading="lazy"
            />
          )}
        </div>
      ) : isLoading ? (
        <PreviewTile>
          <Spinner className="size-6 text-[var(--home-accent-base)]" />
        </PreviewTile>
      ) : (
        <PreviewTile>{getDiagramTypeIcon(diagram.type, "size-9")}</PreviewTile>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *\
 * CardTag — one token-styled footer pill, three tones.
\* ------------------------------------------------------------------ */

type CardTagTone = "type" | "local" | "shared"

const CARD_TAG_TONE: Record<CardTagTone, { bg: string; text: string }> = {
  type: { bg: "var(--home-tag-type-bg)", text: "var(--home-tag-type-text)" },
  local: { bg: "var(--home-tag-local-bg)", text: "var(--home-tag-local-text)" },
  shared: {
    bg: "var(--home-tag-shared-bg)",
    text: "var(--home-tag-shared-text)",
  },
}

/** A single footer pill (diagram type / source / sharing mode), tone-token styled. */
function CardTag({ label, tone }: { label: string; tone: CardTagTone }) {
  const { bg, text } = CARD_TAG_TONE[tone]
  return (
    <Badge
      // The neutral type pill stays at the Badge's medium weight; the source /
      // sharing-mode pill is emphasized to read as the card's primary tag.
      className={cn(
        "h-auto max-w-[12ch] truncate rounded border-0 px-2 py-0.5 text-xs leading-tight",
        tone !== "type" && "font-semibold"
      )}
      title={label}
      style={{ background: bg, color: text }}
    >
      {label}
    </Badge>
  )
}

/* ------------------------------------------------------------------ *\
 * DiagramCardView — pure presentational diagram tile.
\* ------------------------------------------------------------------ */

/** Pre-rendered thumbnail data URLs for the light + dark theme variants. */
export type DiagramCardThumbnail = {
  /** Data URL of the light-theme thumbnail; `null` while none is available. */
  lightDataUrl: string | null
  /** Data URL of the dark-theme thumbnail; `null` while none is available. */
  darkDataUrl: string | null
}

/** The pure props `DiagramCardView` renders from. */
export type DiagramCardViewProps = {
  /** The diagram tile to render. */
  diagram: RecentDiagram
  /**
   * Pre-rendered thumbnail sources, or `null` when there is no thumbnail (the
   * card then shows the placeholder/type icon or the loading spinner).
   */
  thumbnail?: DiagramCardThumbnail | null
  /** Show the loading spinner instead of a thumbnail/icon. */
  isThumbnailLoading?: boolean
  /** Show the file-document placeholder icon instead of a thumbnail. */
  showPlaceholderIcon?: boolean
  /** Show the secondary Local/Shared source badge. */
  showSourceBadge?: boolean
  /** Apply the just-created/imported highlight pulse treatment. */
  isHighlighted?: boolean
  /** Show the "share no longer available" state and disable navigation. */
  isExpired?: boolean
  /** Whether the diagram is favorited (drives the star fill + label). */
  isFavorite?: boolean
  /**
   * Toggle the favorite star. When omitted the star is hidden (e.g. expired
   * shared diagrams that can't be favorited).
   */
  onToggleFavorite?: () => void
  /** Called when the card link is activated. */
  onOpen?: () => void
  /** The three-dot actions menu, slotted in by the container. */
  actionsMenu?: ReactNode
  /** Extra classes merged onto the root card. */
  className?: string
  /** Forwarded to the root card element. */
  ref?: Ref<HTMLDivElement>
}

/**
 * Pure diagram tile: type icon/thumbnail, title, relative last-modified date,
 * type/source badges, a favorite star, and a slot for the three-dot actions
 * menu. It takes its thumbnail + favorite state as props and reports the
 * favorite toggle and card-open as callbacks — no store, router, or effects.
 */
export function DiagramCardView({
  diagram,
  thumbnail = null,
  isThumbnailLoading = false,
  showPlaceholderIcon = false,
  showSourceBadge = false,
  isHighlighted = false,
  isExpired = false,
  isFavorite = false,
  onToggleFavorite,
  onOpen,
  actionsMenu,
  className,
  ref,
}: DiagramCardViewProps) {
  // Untitled diagrams keep an empty real title and show a muted placeholder.
  const isUntitled = !diagram.title.trim()
  const title = diagram.title.trim() || "Untitled diagram"
  const isLocalDiagram = (diagram.source ?? "local") === "local"
  const lightDataUrl = thumbnail?.lightDataUrl ?? null
  const darkDataUrl = thumbnail?.darkDataUrl ?? null

  const shouldRenderDiagramThumbnail =
    !showPlaceholderIcon && Boolean(lightDataUrl)
  // Non-empty diagram with no thumbnail yet — treat as loading to avoid
  // flashing the fallback type icon during the pre-warmup delay.
  const isEffectivelyLoading =
    isThumbnailLoading || (!showPlaceholderIcon && !lightDataUrl)
  // Re-render once a minute (via a shared interval) so the relative date stays fresh.
  useMinuteTick()
  const relativeDate = formatRelativeLastModified(
    diagram.lastModifiedAt,
    // Display-only relative timestamp, refreshed each minute by useMinuteTick().
    // eslint-disable-next-line react-hooks/purity
    Date.now()
  )
  const shortTypeLabel = getDiagramTypeShortLabel(diagram.type)
  const sourceTypeLabel = isLocalDiagram ? "Local" : "Shared"
  const sharedViewLabel = getSharedDiagramViewBadge(diagram.lastSharedView)

  // Footer tag group: the diagram-type pill is always shown; a secondary pill
  // is the Local/Shared source (in the "all diagrams" view) or, for shared
  // diagrams, the current sharing mode.
  const secondaryTag: { label: string; tone: CardTagTone } | null =
    showSourceBadge
      ? { label: sourceTypeLabel, tone: isLocalDiagram ? "local" : "shared" }
      : !isLocalDiagram
        ? { label: sharedViewLabel, tone: "shared" }
        : null

  const nav = getDiagramNav(diagram)

  return (
    <Card
      ref={ref}
      role="listitem"
      className={cn(
        // Island look (same tokens as the editor chrome header islands): the
        // chrome SURFACE fill (= canvas/background hue, not a raised gray), 12px
        // radius, hairline chrome border, soft resting float — so the card reads
        // as the SAME floating island as the editor in both themes, separated
        // from the (equally-toned) home page by its border + shadow exactly as
        // the editor island separates from its canvas. Width is grid-owned
        // (auto-fill minmax 1fr); `--card-min-h` is the only sizing knob.
        "home-diagram-card group relative flex min-h-[var(--card-min-h)] flex-col gap-0 overflow-hidden rounded-[var(--apollon-chrome-radius-lg)] border border-[var(--apollon-chrome-border)] bg-[var(--home-card-surface)] py-0 shadow-[var(--apollon-chrome-shadow-floating)] transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        isHighlighted
          ? "animate-[diagram-highlight-pulse_2.4s_ease-out_forwards] bg-accent-hover shadow-[0_0_0_3px_color-mix(in_srgb,var(--home-accent-base)_35%,transparent)]"
          : "hover:bg-accent-hover hover:shadow-[0_6px_16px_var(--home-shadow-card-hover)]",
        className
      )}
    >
      {/* Expired overlay */}
      {/* Clickable card body. A real link so cmd/ctrl/middle-click opens the
          diagram in a new tab; plain click still navigates within the SPA. The
          stretched `after` pseudo-element makes the whole card the hit target;
          the overlaid controls sit above it via their z-20 wrapper. */}
      <Link
        {...nav}
        // Expired links keep `preventDefault` AND `tabIndex={-1}`: aria-disabled
        // is advisory only, so TanStack <Link> would still navigate on Enter.
        onClick={(event) => {
          if (isExpired) {
            event.preventDefault()
            return
          }
          onOpen?.()
        }}
        aria-label={isExpired ? `${title} (expired)` : `Open ${title}`}
        aria-disabled={isExpired}
        tabIndex={isExpired ? -1 : undefined}
        className={cn(
          // Keyboard-only focus ring (focus-visible, not focus-within): a mouse
          // press no longer paints a ring. Inset + the design-system `ring` token
          // so overflow-hidden can't clip it and it stays theme-aware.
          "flex h-full w-full flex-col rounded-[inherit] text-left outline-none after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          isExpired ? "cursor-default" : "cursor-pointer"
        )}
      >
        {/* ---- Header: preview + title ---- */}
        <CardHeader className="flex w-full flex-col gap-2 rounded-none px-4 pt-12 pb-2">
          <DiagramPreview
            diagram={diagram}
            title={title}
            lightDataUrl={lightDataUrl}
            darkDataUrl={darkDataUrl}
            showThumbnail={shouldRenderDiagramThumbnail}
            isLoading={isEffectivelyLoading && !showPlaceholderIcon}
            isExpired={isExpired}
          />

          <CardContent className="mt-auto w-full px-0 text-left">
            {/* Keep the title visible (dimmed) when expired so the user can tell
                which shared entry to remove. */}
            <p
              className={cn(
                "line-clamp-2 text-sm leading-snug font-medium",
                isUntitled
                  ? "text-[var(--home-text-muted)] italic"
                  : "text-[var(--home-text-strong)]",
                isExpired && "opacity-50"
              )}
              title={title}
            >
              {title}
            </p>
          </CardContent>
        </CardHeader>

        {/* Inset hairline: w-auto + mx-4 overrides the primitive's full width;
            border-subtle keeps it lighter than the default border tone. */}
        <Separator className="mx-4 w-auto bg-border-subtle" />

        {/* ---- Footer: relative date + tag pills ---- */}
        <CardFooter
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-none border-t-0 bg-transparent px-4 pt-2.5 pb-3.5",
            isExpired && "opacity-50"
          )}
        >
          <time
            dateTime={diagram.lastModifiedAt}
            title={new Date(diagram.lastModifiedAt).toLocaleString()}
            className="truncate text-xs leading-tight font-medium text-[var(--home-text-muted)]"
          >
            {relativeDate}
          </time>

          <div className="flex shrink-0 items-center gap-1">
            <CardTag label={shortTypeLabel} tone="type" />
            {secondaryTag ? (
              <CardTag label={secondaryTag.label} tone={secondaryTag.tone} />
            ) : null}
          </div>
        </CardFooter>
      </Link>

      {/* ---- Overlaid controls. The wrapper only positions (z-20, above the
          link's z-10 `after`); each control owns its own reveal so the star can
          stay pinned when favorited while the ⋮ reveals on hover/focus/open. ---- */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between">
        {/* ---- Favorite star – top-left. Same shared ghost icon button as the
            ⋮; pinned visible when favorited, otherwise reveals on hover/focus. ---- */}
        {onToggleFavorite ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={isFavorite}
            className={cn(
              "pointer-events-auto transition-opacity",
              isFavorite
                ? "text-[var(--home-favorite-star)] opacity-100"
                : "text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
            )}
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite()
            }}
          >
            <Star
              className="size-5"
              aria-hidden="true"
              fill={isFavorite ? "currentColor" : "none"}
            />
          </Button>
        ) : (
          <span />
        )}

        {/* ---- Three-dot menu – top-right ---- */}
        {actionsMenu}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ *\
 * DiagramCard — thin container wiring store thumbnails + favorites.
\* ------------------------------------------------------------------ */

type DiagramCardProps = {
  diagram: RecentDiagram
  isThumbnailLoading?: boolean
  showPlaceholderIcon?: boolean
  showSourceBadge?: boolean
  isHighlighted?: boolean
  isExpired?: boolean
  onToggleFavorite?: (diagram: RecentDiagram) => void
  onSharedDiagramRemoved?: (diagramId: string) => void
  onSharedDiagramViewChange?: (diagramId: string, view: DiagramView) => void
}

const DiagramCardComponent = ({
  diagram,
  isThumbnailLoading = false,
  showPlaceholderIcon = false,
  showSourceBadge = false,
  isHighlighted = false,
  isExpired = false,
  onToggleFavorite,
  onSharedDiagramRemoved,
  onSharedDiagramViewChange,
}: DiagramCardProps) => {
  const toggleFavorite = usePersistenceModelStore(
    (state) => state.toggleFavorite
  )
  const thumbnailSvg = usePersistenceModelStore(
    (state) => state.thumbnails[diagram.id] ?? null
  )
  const thumbnailRevision = usePersistenceModelStore(
    (state) => state.thumbnailRevisions[diagram.id] ?? 0
  )

  const isLocalDiagram = (diagram.source ?? "local") === "local"
  const canToggleFavorite =
    !isExpired && (isLocalDiagram || Boolean(onToggleFavorite))
  const thumbnailCacheKey = `${diagram.id}:${thumbnailRevision}`
  const lightDataUrl = useMemo(
    () =>
      getCachedThumbnailSources(thumbnailCacheKey, thumbnailSvg)
        ?.lightDataUrl ?? null,
    [thumbnailCacheKey, thumbnailSvg]
  )
  const [darkDataUrl, setDarkDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!thumbnailSvg) {
      setDarkDataUrl(null)
      return
    }
    return runWhenIdle(() => {
      const sources = getCachedThumbnailSources(
        thumbnailCacheKey,
        thumbnailSvg,
        {
          eager: true,
        }
      )
      if (sources) {
        setDarkDataUrl(sources.darkDataUrl)
      }
    })
  }, [thumbnailCacheKey, thumbnailSvg])

  return (
    <DiagramCardView
      diagram={diagram}
      thumbnail={lightDataUrl ? { lightDataUrl, darkDataUrl } : null}
      isThumbnailLoading={isThumbnailLoading}
      showPlaceholderIcon={showPlaceholderIcon}
      showSourceBadge={showSourceBadge}
      isHighlighted={isHighlighted}
      isExpired={isExpired}
      isFavorite={diagram.favorite}
      onToggleFavorite={
        canToggleFavorite
          ? () => {
              if (onToggleFavorite) {
                onToggleFavorite(diagram)
              } else if (isLocalDiagram) {
                toggleFavorite(diagram.id)
              }
            }
          : undefined
      }
      actionsMenu={
        <DiagramActionsMenu
          diagram={diagram}
          stopPropagation
          isExpired={isExpired}
          containerClassName="pointer-events-auto relative"
          onSharedDiagramRemoved={onSharedDiagramRemoved}
          onSharedDiagramViewChange={onSharedDiagramViewChange}
        />
      }
    />
  )
}

export const DiagramCard = DiagramCardComponent
