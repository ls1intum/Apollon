import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react"
import { ChevronRight, MoreVertical, Star } from "lucide-react"
import type { UMLDiagramType } from "@tumaet/apollon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
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
  sharedDiagramRoute,
  buildSharedDiagramUrl,
  getSharedDiagramViewBadge,
} from "@/utils/sharedDiagramLinks"
import { getCachedThumbnailSources } from "@/utils/thumbnailTheme"
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

/**
 * Card layout is authored at a 260x300 base size and uniformly scaled up on
 * larger breakpoints via the `--card-scale` CSS variable (see the root card
 * element). All inner spacing is expressed in these base-px steps and run
 * through `scalePx()` so the proportions hold at every scale.
 */
const CARD_BASE_HEIGHT_PX = 300
const CARD_HEADER_HEIGHT_PX = 243
const CARD_FOOTER_HEIGHT_PX = 56
const CARD_ICON_AREA_HEIGHT_PX = 138
const CARD_PAD_X_PX = 16
const CARD_HEADER_PAD_TOP_PX = 54
const CARD_HEADER_PAD_BOTTOM_PX = 10
const CARD_FOOTER_PAD_TOP_PX = 10
const CARD_FOOTER_PAD_BOTTOM_PX = 14
const CARD_ICON_GAP_PX = 8
const CARD_ICON_BUTTON_PX = 30
const CARD_BADGE_MAX_WIDTH_PX = 112

/**
 * Card typography scale (in px). Kept small and named so every label on the
 * card maps to one of these steps instead of an inline literal.
 */
const CARD_TYPE_TITLE_PX = 13
const CARD_TYPE_META_PX = 11
const CARD_TYPE_BADGE_PX = 10.5

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
    diagram.lastSharedView ?? DiagramView.EDIT
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
  /** Delete the (local) diagram after in-menu confirmation. */
  onDelete: () => void
  /** Open the share dashboard for the (local) diagram. */
  onShare: () => void
  /** Copy the shared link for the current sharing mode. */
  onCopySharedLink: () => void
  /** Change the default sharing mode for a shared diagram. */
  onChangeSharedView: (view: DiagramView) => void
  /** Remove a shared diagram from the local shared list. */
  onRemoveSharedEntry: () => void
  /** Wrapper class for the relatively-positioned menu container. */
  containerClassName?: string
  /** Class for the three-dot trigger button. */
  triggerClassName?: string
  /** Inline style for the three-dot trigger button. */
  triggerStyle?: CSSProperties
  /** Class for the popover menu content. */
  menuClassName?: string
  /** Inline style for the popover menu content. */
  menuStyle?: CSSProperties
  /** Stop click/keydown/mousedown from bubbling to an enclosing card link. */
  stopPropagation?: boolean
}

const DEFAULT_MENU_CONTAINER_CLASS = "relative"
const DEFAULT_MENU_TRIGGER_CLASS =
  "cursor-pointer rounded-md border border-border bg-muted p-1.5 text-foreground shadow-sm transition-colors duration-200 hover:border-ring hover:bg-primary hover:text-[var(--home-text-on-badge)] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
const DEFAULT_MENU_CONTENT_CLASS =
  "z-40 w-52 rounded-lg border border-border-subtle bg-card p-1 shadow-sm transition-colors duration-200"

/**
 * Pure three-dot diagram actions menu: it renders the trigger + popover and
 * reports every action via an `onX` callback. It owns only ephemeral UI state
 * (open / delete-confirm) — no store, navigation, clipboard, or modals.
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
  onChangeSharedView,
  onRemoveSharedEntry,
  containerClassName = DEFAULT_MENU_CONTAINER_CLASS,
  triggerClassName = DEFAULT_MENU_TRIGGER_CLASS,
  triggerStyle,
  menuClassName = DEFAULT_MENU_CONTENT_CLASS,
  menuStyle,
  stopPropagation = false,
}: DiagramActionsMenuViewProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const isLocalDiagram = (diagram.source ?? "local") === "local"
  const sharedView = diagram.lastSharedView ?? DiagramView.EDIT
  const menuItemClassName =
    "min-h-0 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-accent-hover hover:text-foreground data-[highlighted]:bg-accent-hover data-[highlighted]:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"

  const closeMenu = () => {
    setIsMenuOpen(false)
    setIsDeleteConfirmOpen(false)
  }

  const runAndClose = (action: () => void) => {
    action()
    closeMenu()
  }

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
        onOpenChange={(open) => {
          if (open) {
            setIsMenuOpen(true)
          } else {
            closeMenu()
          }
        }}
      >
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Open diagram actions"
              className={`${triggerClassName} home-card-icon-button`}
              style={triggerStyle}
              data-active={isMenuOpen ? "true" : "false"}
              onClick={stopIfNeeded}
            />
          }
        >
          <MoreVertical className="size-[18px]" aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          id={`diagram-actions-menu-${diagram.id}`}
          aria-label="Diagram actions"
          align="end"
          sideOffset={8}
          className={`border-0 ${menuClassName}`}
          style={menuStyle}
        >
          {isExpired ? (
            <DropdownMenuItem
              className="min-h-0 rounded-md px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              onClick={() => runAndClose(onRemoveSharedEntry)}
            >
              Remove from shared list
            </DropdownMenuItem>
          ) : !isDeleteConfirmOpen ? (
            <div className="space-y-1">
              <DropdownMenuItem
                className={menuItemClassName}
                onClick={() => runAndClose(onOpen)}
              >
                {isLocalDiagram ? "Open" : "Open diagram"}
              </DropdownMenuItem>
              {isLocalDiagram ? (
                <>
                  <DropdownMenuItem
                    className={menuItemClassName}
                    onClick={() => runAndClose(onDuplicate)}
                  >
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={menuItemClassName}
                    onClick={() => runAndClose(onShare)}
                  >
                    Share
                  </DropdownMenuItem>
                  <div
                    className="w-full"
                    title={
                      canDelete
                        ? undefined
                        : "Cannot delete diagram currently being edited"
                    }
                  >
                    <DropdownMenuItem
                      closeOnClick={false}
                      disabled={!canDelete}
                      className={`min-h-0 rounded-md px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                        canDelete
                          ? "text-[var(--apollon-alert-danger-color)] hover:bg-[var(--apollon-alert-danger-background)] data-[highlighted]:bg-[var(--apollon-alert-danger-background)]"
                          : "cursor-not-allowed bg-muted text-muted-foreground opacity-60"
                      }`}
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </div>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    className={menuItemClassName}
                    onClick={() => runAndClose(onCopySharedLink)}
                  >
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger
                      className={`${menuItemClassName} justify-between`}
                    >
                      Change sharing mode
                      <ChevronRight
                        className="ml-2 size-4 shrink-0"
                        aria-hidden="true"
                      />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                      aria-label="Change sharing mode"
                      className={`border-0 ${menuClassName}`}
                      style={menuStyle}
                    >
                      {SHARED_DIAGRAM_VIEW_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          className={`min-h-0 rounded-md px-2 py-1.5 text-xs transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                            option.value === sharedView
                              ? "bg-accent-hover text-foreground data-[highlighted]:bg-accent-hover"
                              : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--home-surface-raised-hover)_50%,transparent)] hover:text-foreground data-[highlighted]:bg-[color-mix(in_srgb,var(--home-surface-raised-hover)_50%,transparent)] data-[highlighted]:text-foreground"
                          }`}
                          onClick={() =>
                            runAndClose(() => onChangeSharedView(option.value))
                          }
                        >
                          <span className="w-full">{option.badge}</span>
                          {option.value === sharedView ? (
                            <span className="font-medium text-foreground opacity-90">
                              Selected
                            </span>
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    className="min-h-0 rounded-md px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                    onClick={() => runAndClose(onRemoveSharedEntry)}
                  >
                    Remove from shared list
                  </DropdownMenuItem>
                </>
              )}
            </div>
          ) : (
            <div className="min-w-[220px] space-y-2 rounded-md border border-[var(--apollon-alert-danger-border)] bg-[var(--apollon-alert-danger-background)] p-3 text-sm transition-colors duration-200">
              <p className="font-medium text-[var(--apollon-alert-danger-color)]">
                Are you sure? This can&apos;t be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="cursor-pointer text-muted-foreground hover:bg-accent-hover hover:text-foreground"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="xs"
                  className="cursor-pointer border border-[var(--apollon-alert-danger-border)] bg-[var(--apollon-alert-danger-color)] text-white transition-opacity duration-200 hover:bg-[var(--apollon-alert-danger-color)] hover:opacity-90"
                  onClick={() => runAndClose(onDelete)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/* ------------------------------------------------------------------ *\
 * DiagramActionsMenu — thin container wiring store/navigation/etc.
\* ------------------------------------------------------------------ */

type DiagramActionsMenuProps = {
  diagram: RecentDiagram
  containerClassName?: string
  triggerClassName?: string
  triggerStyle?: CSSProperties
  menuClassName?: string
  menuStyle?: CSSProperties
  stopPropagation?: boolean
  isExpired?: boolean
  onSharedDiagramRemoved?: (diagramId: string) => void
  onSharedDiagramViewChange?: (diagramId: string, view: DiagramView) => void
}

export const DiagramActionsMenu = ({
  diagram,
  containerClassName,
  triggerClassName,
  triggerStyle,
  menuClassName,
  menuStyle,
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
  const currentModelId = usePersistenceModelStore(
    (state) => state.currentModelId
  )

  const isLocalDiagram = (diagram.source ?? "local") === "local"
  const sharedView = diagram.lastSharedView ?? DiagramView.EDIT
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

  return (
    <DiagramActionsMenuView
      diagram={diagram}
      isExpired={isExpired}
      canDelete={isLocalDiagram && !isCurrentDiagramInEditor}
      stopPropagation={stopPropagation}
      containerClassName={containerClassName}
      triggerClassName={triggerClassName}
      triggerStyle={triggerStyle}
      menuClassName={menuClassName}
      menuStyle={menuStyle}
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

/** Renders a file-document shaped placeholder with the diagram-type icon inside. */
const FileDocumentIcon = ({ type }: { type: UMLDiagramType }) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* File-page SVG shape - scaled to 84x102 */}
      <svg
        width="84"
        height="102"
        viewBox="0 0 72 88"
        fill="none"
        aria-hidden="true"
      >
        {/* Page body */}
        <path
          d="M4 6C4 2.686 6.686 0 10 0H48L68 20V82C68 85.314 65.314 88 62 88H10C6.686 88 4 85.314 4 82V6Z"
          fill="var(--home-badge-bg)"
        />
        {/* Folded corner */}
        <path
          d="M48 0L68 20H54C50.686 20 48 17.314 48 14V0Z"
          fill="var(--home-badge-fold)"
        />
      </svg>
      {/* Diagram type icon overlaid in the center of the document - scaled to w-8 h-8 */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -35%)",
          color: "var(--home-text-on-badge)",
        }}
      >
        {getDiagramTypeIcon(type, "w-8 h-8")}
      </div>
    </div>
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
  /** Render the expired overlay and disable interactions. */
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
  const scalePx = (value: number) => `calc(var(--card-scale) * ${value}px)`

  const nav = getDiagramNav(diagram)

  return (
    <Card
      ref={ref}
      role="listitem"
      className={cn(
        "home-diagram-card group relative mx-auto flex flex-col gap-0 overflow-hidden py-0 ring-0 transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] [--card-scale:1] hover:bg-accent-hover md:[--card-scale:1.0769231] xl:[--card-scale:1.1538462]",
        isHighlighted
          ? "bg-accent-hover"
          : "hover:[box-shadow:0_6px_16px_var(--home-shadow-card-hover)]",
        className
      )}
      style={{
        border: "1px solid var(--home-border-subtle)",
        borderRadius: "var(--home-radius-sm)",
        width: "100%",
        maxWidth: "300px",
        height: scalePx(CARD_BASE_HEIGHT_PX),
        boxShadow: isHighlighted
          ? "0 0 0 3px color-mix(in srgb, var(--home-accent-base) 35%, transparent)"
          : undefined,
        animation: isHighlighted
          ? "diagram-highlight-pulse 2.4s ease-out forwards"
          : undefined,
      }}
    >
      {/* Expired overlay */}
      {isExpired && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 rounded-sm"
          style={{
            background:
              "color-mix(in srgb, var(--home-surface-raised) 80%, transparent)",
          }}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--home-text-secondary)" }}
          >
            Link expired
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--home-text-muted)" }}
          >
            This shared diagram is no longer available
          </span>
        </div>
      )}

      {/* Clickable card body. A real link so cmd/ctrl/middle-click opens the
          diagram in a new tab; plain click still navigates within the SPA. */}
      <Link
        {...nav}
        onClick={(event) => {
          if (isExpired) {
            event.preventDefault()
            return
          }
          onOpen?.()
        }}
        aria-label={isExpired ? `${title} (expired)` : `Open ${title}`}
        aria-disabled={isExpired}
        className={`flex h-full w-full flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${isExpired ? "cursor-default opacity-40" : "cursor-pointer"}`}
        style={{ outlineColor: "var(--home-accent-ring)" }}
      >
        {/* ---- Header Part: preview + title aligned horizontally ---- */}
        <CardHeader
          className="flex w-full flex-col gap-0 rounded-none px-0"
          style={{
            height: scalePx(CARD_HEADER_HEIGHT_PX),
            background: "transparent",
            padding: `${scalePx(CARD_HEADER_PAD_TOP_PX)} ${scalePx(CARD_PAD_X_PX)} ${scalePx(CARD_HEADER_PAD_BOTTOM_PX)} ${scalePx(CARD_PAD_X_PX)}`,
          }}
        >
          {/* ---- Icon preview area (Transparent) ---- */}
          <div
            className="flex w-full items-center justify-center"
            style={{
              background: "transparent",
              height: scalePx(CARD_ICON_AREA_HEIGHT_PX),
              marginBottom: scalePx(CARD_ICON_GAP_PX),
            }}
          >
            {shouldRenderDiagramThumbnail ? (
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
            ) : isEffectivelyLoading && !showPlaceholderIcon ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-5 text-[var(--home-accent-base)]" />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--home-text-secondary)" }}
                >
                  Loading...
                </span>
              </div>
            ) : showPlaceholderIcon ? (
              <FileDocumentIcon type={diagram.type} />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ color: "var(--home-text-on-badge)" }}
              >
                {getDiagramTypeIcon(diagram.type, "w-12 h-12")}
              </div>
            )}
          </div>

          {/* ---- Title section (smaller, bottom-left in header) ---- */}
          <CardContent className="mt-auto w-full px-0 text-left">
            <p
              className="truncate"
              title={title}
              style={{
                color: isUntitled
                  ? "var(--home-text-muted)"
                  : "var(--home-text-strong)",
                fontStyle: isUntitled ? "italic" : "normal",
                fontSize: `${CARD_TYPE_TITLE_PX}px`,
                fontWeight: 500,
                lineHeight: "1.3",
              }}
            >
              {title}
            </p>
          </CardContent>
        </CardHeader>

        {/* ---- Divider line ---- */}
        <Separator
          className="bg-border-subtle"
          style={{
            height: "0.5px",
            width: "auto",
            margin: `0 ${scalePx(CARD_PAD_X_PX)}`,
          }}
        />

        {/* ---- Bottom metadata + tags row ---- */}
        <CardFooter
          className="flex w-full items-center justify-between rounded-none border-t-0 bg-transparent p-0"
          style={{
            padding: `${scalePx(CARD_FOOTER_PAD_TOP_PX)} ${scalePx(CARD_PAD_X_PX)} ${scalePx(CARD_FOOTER_PAD_BOTTOM_PX)} ${scalePx(CARD_PAD_X_PX)}`,
            height: scalePx(CARD_FOOTER_HEIGHT_PX),
          }}
        >
          {/* Relative last-modified date; full timestamp on hover */}
          <div
            className="flex flex-col text-left"
            title={new Date(diagram.lastModifiedAt).toLocaleString()}
          >
            <span
              style={{
                color: "var(--home-text-muted)",
                fontSize: `${CARD_TYPE_META_PX}px`,
                lineHeight: "1.2",
              }}
            >
              Modified:
            </span>
            <span
              className="truncate font-medium"
              style={{
                color: "var(--home-text-muted)",
                fontSize: `${CARD_TYPE_META_PX}px`,
                lineHeight: "1.2",
              }}
            >
              {relativeDate}
            </span>
          </div>

          {/*
            Tag group — always shows the diagram-type pill (primary).
            A secondary source/mode pill is added when relevant:
            - "all diagrams" view: Local or Shared
            - shared diagrams: the sharing mode (view/edit)
          */}
          <div className="flex shrink-0 items-center gap-1 pl-2">
            <Badge
              className="h-auto rounded border-0 p-0 text-[length:inherit] font-[inherit]"
              title={shortTypeLabel}
              style={{
                padding: "3px 8px",
                fontSize: `${CARD_TYPE_BADGE_PX}px`,
                lineHeight: 1.2,
                background: "var(--home-tag-type-bg)",
                color: "var(--home-tag-type-text)",
                fontWeight: 500,
                maxWidth: scalePx(CARD_BADGE_MAX_WIDTH_PX),
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {shortTypeLabel}
            </Badge>
            {showSourceBadge ? (
              <Badge
                className="h-auto rounded border-0 p-0 text-[length:inherit] font-[inherit]"
                title={sourceTypeLabel}
                style={{
                  padding: "3px 8px",
                  fontSize: `${CARD_TYPE_BADGE_PX}px`,
                  lineHeight: 1.2,
                  background: isLocalDiagram
                    ? "var(--home-tag-local-bg)"
                    : "var(--home-tag-shared-bg)",
                  color: isLocalDiagram
                    ? "var(--home-tag-local-text)"
                    : "var(--home-tag-shared-text)",
                  fontWeight: 600,
                  maxWidth: scalePx(CARD_BADGE_MAX_WIDTH_PX),
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {sourceTypeLabel}
              </Badge>
            ) : !isLocalDiagram ? (
              <Badge
                className="h-auto rounded border-0 p-0 text-[length:inherit] font-[inherit]"
                title={sharedViewLabel}
                style={{
                  padding: "3px 8px",
                  fontSize: `${CARD_TYPE_BADGE_PX}px`,
                  lineHeight: 1.2,
                  background: "var(--home-tag-shared-bg)",
                  color: "var(--home-tag-shared-text)",
                  fontWeight: 600,
                  maxWidth: scalePx(CARD_BADGE_MAX_WIDTH_PX),
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {sharedViewLabel}
              </Badge>
            ) : null}
          </div>
        </CardFooter>
      </Link>

      {/* ---- Star / Favorite button – overlaid top-left ---- */}
      {onToggleFavorite && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="home-card-icon-button absolute z-30"
          style={{
            left: scalePx(CARD_PAD_X_PX),
            top: scalePx(CARD_PAD_X_PX),
            width: scalePx(CARD_ICON_BUTTON_PX),
            height: scalePx(CARD_ICON_BUTTON_PX),
            outlineColor: "var(--home-accent-ring)",
            color: isFavorite
              ? "var(--home-favorite-star)"
              : "var(--home-text-muted)",
            ["--icon-hover-color" as string]: "var(--home-text-strong)",
            ["--icon-active-color" as string]: "var(--home-favorite-star)",
            ["--icon-hover-bg" as string]:
              "color-mix(in srgb, var(--home-text-primary) 10%, transparent)",
          }}
          data-active={isFavorite ? "true" : "false"}
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite()
          }}
        >
          <Star
            className="size-[18px]"
            aria-hidden="true"
            fill={isFavorite ? "currentColor" : "none"}
          />
        </Button>
      )}

      {/* ---- Three-dot menu – overlaid top-right ---- */}
      {actionsMenu}
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
          containerClassName="absolute z-30 [right:calc(var(--card-scale)*16px)] [top:calc(var(--card-scale)*16px)]"
          triggerClassName="flex cursor-pointer items-center justify-center rounded-md p-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
          triggerStyle={{
            width: `calc(var(--card-scale) * ${CARD_ICON_BUTTON_PX}px)`,
            height: `calc(var(--card-scale) * ${CARD_ICON_BUTTON_PX}px)`,
            outlineColor: "var(--home-accent-ring)",
            color: "var(--home-text-muted)",
            ["--icon-hover-color" as string]: "var(--home-text-strong)",
            ["--icon-active-color" as string]: "var(--home-text-strong)",
            ["--icon-hover-bg" as string]:
              "color-mix(in srgb, var(--home-text-primary) 10%, transparent)",
          }}
          menuClassName="z-40 w-52 rounded-lg border border-border-subtle bg-card p-1 shadow-sm"
          onSharedDiagramRemoved={onSharedDiagramRemoved}
          onSharedDiagramViewChange={onSharedDiagramViewChange}
        />
      }
    />
  )
}

export const DiagramCard = DiagramCardComponent
